import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { exportBackupForUser, restoreBackupForUser } from "@/lib/backups";
import {
  getMailMessagesForUser,
  getMailSyncRunsForUser,
  getMailThreadForUser,
  getMailThreadsForUser,
  markMailThreadReadForUser,
} from "@/lib/inbound-mail";
import {
  getCurrentMessageConnections,
  getMessageThreadsForUser,
  getThreadMessagesForUser,
  getThreadForUser,
  ingestTelegramWebhook,
  ingestWhatsAppWebhook,
  verifyWhatsAppConnection,
} from "@/lib/messages";
import {
  getLocalCoreSnapshot,
  listLocalAuditEventsForUser,
  logLocalMailSyncRun,
  markLocalMessageThreadRead,
  setLocalMessageThreadUrgency,
  unlockLocalMessageThreadUrgency,
  upsertLocalMailEntries,
} from "@/lib/local-core";

const userId = "user-local-communications";
const email = "asesor@despacho.local";

let localDataDir = "";

beforeEach(async () => {
  localDataDir = await mkdtemp(path.join(os.tmpdir(), "facturaia-local-comms-"));
  process.env.FACTURAIA_LOCAL_MODE = "1";
  process.env.FACTURAIA_DATA_DIR = localDataDir;
  process.env.FACTURAIA_LOCAL_SESSION_SECRET = "communications-local-secret";
  process.env.NEXT_PUBLIC_APP_URL = "http://127.0.0.1:4050";
});

afterEach(async () => {
  await rm(localDataDir, { recursive: true, force: true });
});

describe("local communications persistence", () => {
  test("stores messaging and inbound mail locally and preserves them across backup restore", async () => {
    const connections = await getCurrentMessageConnections(userId);
    await getCurrentMessageConnections(userId);

    expect(connections.whatsapp.channel).toBe("whatsapp");
    expect(connections.telegram.channel).toBe("telegram");
    expect(
      await verifyWhatsAppConnection(
        connections.whatsapp.inbound_key,
        connections.whatsapp.verify_token,
      ),
    ).toBe(true);

    const telegramResult = await ingestTelegramWebhook(connections.telegram.inbound_key, {
      update_id: 1001,
      message: {
        message_id: 9001,
        date: 1773993600,
        text: "Necesito la propuesta hoy mismo, es urgente.",
        chat: { id: 501234 },
        from: {
          first_name: "Marina",
          last_name: "Serrano",
          username: "marinaserrano",
        },
      },
    });

    const whatsappResult = await ingestWhatsAppWebhook(connections.whatsapp.inbound_key, {
      entry: [
        {
          changes: [
            {
              value: {
                contacts: [
                  {
                    wa_id: "34600111222",
                    profile: {
                      name: "Javier Morales",
                    },
                  },
                ],
                messages: [
                  {
                    from: "34600111222",
                    id: "wamid.test.0001",
                    timestamp: "1773997200",
                    type: "text",
                    text: {
                      body: "Hola, necesito la factura rectificada cuanto antes.",
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    expect(telegramResult).toEqual({ ok: true, stored: 1 });
    expect(whatsappResult).toEqual({ ok: true, stored: 1 });

    const threads = await getMessageThreadsForUser(userId, { sort: "urgency" });

    expect(threads).toHaveLength(2);
    expect(threads[0]?.urgency).toBe("high");

    const whatsappThread = threads.find((thread) => thread.channel === "whatsapp");
    const telegramThread = threads.find((thread) => thread.channel === "telegram");

    expect(whatsappThread?.full_name).toBe("Javier Morales");
    expect(telegramThread?.telegram_username).toBe("marinaserrano");

    const whatsappMessages = await getThreadMessagesForUser(userId, whatsappThread!.id);
    expect(whatsappMessages).toHaveLength(1);
    expect(whatsappMessages[0]?.body).toContain("factura rectificada");

    await markLocalMessageThreadRead(userId, whatsappThread!.id);
    await setLocalMessageThreadUrgency(userId, whatsappThread!.id, "medium", 60);
    await unlockLocalMessageThreadUrgency(userId, whatsappThread!.id);

    const updatedWhatsappThread = await getThreadForUser(userId, whatsappThread!.id);
    expect(updatedWhatsappThread?.unread_count).toBe(0);
    expect(updatedWhatsappThread?.urgency).toBe("medium");
    expect(updatedWhatsappThread?.urgency_locked).toBe(false);

    const auditEvents = await listLocalAuditEventsForUser(userId, 50);
    expect(
      auditEvents.filter((event) => event.action === "message_connection_created"),
    ).toHaveLength(2);
    expect(auditEvents.some((event) => event.action === "message_connection_updated")).toBe(
      false,
    );
    expect(auditEvents.some((event) => event.action === "message_thread_created")).toBe(true);
    expect(auditEvents.some((event) => event.action === "message_inbound_received")).toBe(true);
    expect(
      auditEvents.some((event) => event.action === "message_thread_marked_read"),
    ).toBe(true);
    expect(
      auditEvents.some((event) => event.action === "message_thread_urgency_set"),
    ).toBe(true);
    expect(
      auditEvents.some((event) => event.action === "message_thread_urgency_unlocked"),
    ).toBe(true);

    const importedMailCount = await upsertLocalMailEntries({
      userId,
      entries: [
        {
          messageId: "<mail-1@despacho.local>",
          fromName: "Administración Empresa Norte",
          fromEmail: "facturacion@empresanorte.es",
          toEmails: [email],
          subject: "Factura pendiente de revisión",
          bodyText: "Buenos días, necesitamos revisar la factura hoy.",
          bodyHtml: null,
          receivedAt: "2026-03-20T08:30:00.000Z",
          rawHeaders: {
            messageId: "<mail-1@despacho.local>",
          },
          urgency: "high",
          urgencyScore: 90,
        },
        {
          messageId: "<mail-2@despacho.local>",
          fromName: "Administración Empresa Norte",
          fromEmail: "facturacion@empresanorte.es",
          toEmails: [email],
          subject: "Documentación complementaria",
          bodyText: "Adjuntamos documentación adicional para el expediente.",
          bodyHtml: null,
          receivedAt: "2026-03-20T09:15:00.000Z",
          rawHeaders: {
            messageId: "<mail-2@despacho.local>",
          },
          urgency: "medium",
          urgencyScore: 60,
        },
      ],
    });

    expect(importedMailCount).toBe(2);

    await logLocalMailSyncRun({
      userId,
      source: "imap",
      status: "success",
      importedCount: 2,
      detail: "Sincronización local de prueba.",
    });

    const mailThreads = await getMailThreadsForUser(userId, { sort: "urgency" });
    expect(mailThreads).toHaveLength(1);
    expect(mailThreads[0]?.urgency).toBe("high");
    expect(mailThreads[0]?.unread_count).toBe(2);

    const selectedMailThread = await getMailThreadForUser(userId, mailThreads[0]!.id);
    const mailMessages = await getMailMessagesForUser(userId, mailThreads[0]!.id);
    const mailSyncRuns = await getMailSyncRunsForUser(userId, 5);

    expect(selectedMailThread?.from_email).toBe("facturacion@empresanorte.es");
    expect(mailMessages).toHaveLength(2);
    expect(mailSyncRuns).toHaveLength(1);
    expect(mailSyncRuns[0]?.imported_count).toBe(2);

    await markMailThreadReadForUser(userId, mailThreads[0]!.id);
    const readMailThread = await getMailThreadForUser(userId, mailThreads[0]!.id);
    expect(readMailThread?.unread_count).toBe(0);

    const backup = await exportBackupForUser(userId, email);
    expect(backup.messages.connections).toHaveLength(2);
    expect(backup.messages.threads).toHaveLength(2);
    expect(backup.messages.records).toHaveLength(2);
    expect(backup.mail.threads).toHaveLength(1);
    expect(backup.mail.messages).toHaveLength(2);
    expect(backup.mail.syncRuns).toHaveLength(1);

    const restoreDir = await mkdtemp(path.join(os.tmpdir(), "facturaia-local-comms-restore-"));

    try {
      process.env.FACTURAIA_DATA_DIR = restoreDir;
      await restoreBackupForUser(userId, email, backup);

      const restoredSnapshot = await getLocalCoreSnapshot();
      expect(restoredSnapshot.messageConnections).toHaveLength(2);
      expect(restoredSnapshot.messageThreads).toHaveLength(2);
      expect(restoredSnapshot.messageRecords).toHaveLength(2);
      expect(restoredSnapshot.mailThreads).toHaveLength(1);
      expect(restoredSnapshot.mailMessages).toHaveLength(2);
      expect(restoredSnapshot.mailSyncRuns).toHaveLength(1);

      const restoredMessages = await getMessageThreadsForUser(userId, { sort: "recent" });
      const restoredMailThreads = await getMailThreadsForUser(userId, { sort: "recent" });

      expect(restoredMessages).toHaveLength(2);
      expect(restoredMailThreads).toHaveLength(1);
      expect(restoredMailThreads[0]?.from_email).toBe("facturacion@empresanorte.es");
    } finally {
      await rm(restoreDir, { recursive: true, force: true });
      process.env.FACTURAIA_DATA_DIR = localDataDir;
    }
  });
});
