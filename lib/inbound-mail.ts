import "server-only";

import { ImapFlow } from "imapflow";
import { simpleParser, type AddressObject, type ParsedMail } from "mailparser";
import { z } from "zod";

import {
  demoMailMessages,
  demoMailSyncRuns,
  demoMailThreads,
  getDemoMailThreadById,
  isDemoMode,
  isLocalFileMode,
} from "@/lib/demo";
import { getUrgencyMeta } from "@/lib/messages";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type {
  MailMessage,
  MailSortKey,
  MailSyncRun,
  MailThread,
  MessageUrgency,
} from "@/lib/types";

const inboundMailEnvSchema = z.object({
  INBOUND_MAIL_PROVIDER: z.literal("imap"),
  IMAP_HOST: z.string().min(1),
  IMAP_PORT: z.coerce.number().int().positive().default(993),
  IMAP_SECURE: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
  IMAP_USERNAME: z.string().min(1),
  IMAP_PASSWORD: z.string().min(1),
  IMAP_MAILBOX: z.string().min(1).default("INBOX"),
  IMAP_SYNC_UNSEEN_ONLY: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value !== "false"),
  IMAP_SYNC_MAX_MESSAGES: z.coerce.number().int().positive().max(100).default(25),
});

type InboundMailConfig = {
  provider: "imap";
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  mailbox: string;
  unseenOnly: boolean;
  maxMessages: number;
};

type InboundMailStatus = {
  configured: boolean;
  providerLabel: string;
  accountLabel: string;
  detail: string;
};

type MailInboxFilters = {
  q?: string;
  urgency?: "all" | MessageUrgency;
  sort?: MailSortKey;
};

function normalizeSearchValue(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function getSafeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function getFirstParsedAddress(
  value: AddressObject | AddressObject[] | null | undefined,
): ParsedAddressEntry | null {
  const normalized = Array.isArray(value) ? value[0] : value;
  const first = normalized?.value?.[0];

  if (!first) {
    return null;
  }

  return {
    address: first.address ?? undefined,
    name: first.name ?? undefined,
  };
}

function mapParsedAddresses(value: AddressObject | AddressObject[] | null | undefined) {
  const normalized = Array.isArray(value) ? value : value ? [value] : [];

  return normalized.flatMap((item) =>
    (item.value ?? []).map((entry: ParsedAddressEntry) =>
      normalizeEmail(entry.address),
    ),
  );
}

function isMissingMailTable(error: { code?: string; message?: string } | null) {
  if (!error) {
    return false;
  }

  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    error.message?.includes("mail_") === true
  );
}

function getInboundMailConfig(): InboundMailConfig | null {
  if (process.env.INBOUND_MAIL_PROVIDER !== "imap") {
    return null;
  }

  let parsed: z.infer<typeof inboundMailEnvSchema>;

  try {
    parsed = inboundMailEnvSchema.parse({
      INBOUND_MAIL_PROVIDER: process.env.INBOUND_MAIL_PROVIDER,
      IMAP_HOST: process.env.IMAP_HOST,
      IMAP_PORT: process.env.IMAP_PORT,
      IMAP_SECURE: process.env.IMAP_SECURE,
      IMAP_USERNAME: process.env.IMAP_USERNAME,
      IMAP_PASSWORD: process.env.IMAP_PASSWORD,
      IMAP_MAILBOX: process.env.IMAP_MAILBOX,
      IMAP_SYNC_UNSEEN_ONLY: process.env.IMAP_SYNC_UNSEEN_ONLY,
      IMAP_SYNC_MAX_MESSAGES: process.env.IMAP_SYNC_MAX_MESSAGES,
    });
  } catch {
    throw new Error(
      "La configuración IMAP está incompleta. Revisa host, puerto, seguridad, usuario, contraseña y buzón.",
    );
  }

  return {
    provider: "imap",
    host: parsed.IMAP_HOST,
    port: parsed.IMAP_PORT,
    secure: parsed.IMAP_SECURE ?? parsed.IMAP_PORT === 993,
    username: parsed.IMAP_USERNAME,
    password: parsed.IMAP_PASSWORD,
    mailbox: parsed.IMAP_MAILBOX,
    unseenOnly: parsed.IMAP_SYNC_UNSEEN_ONLY ?? true,
    maxMessages: parsed.IMAP_SYNC_MAX_MESSAGES,
  };
}

export function getInboundMailStatusSummary(): InboundMailStatus {
  try {
    const config = getInboundMailConfig();

    if (!config) {
      return {
        configured: false,
        providerLabel: "No configurado",
        accountLabel: "Sin buzón",
        detail:
          "Activa IMAP para importar correo entrante y ordenarlo dentro de FacturaIA.",
      };
    }

    return {
      configured: true,
      providerLabel: "IMAP",
      accountLabel: config.username,
      detail: `${config.host}:${config.port} · buzón ${config.mailbox}`,
    };
  } catch (error) {
    return {
      configured: false,
      providerLabel: "Configuración incompleta",
      accountLabel: "Sin buzón",
      detail:
        error instanceof Error
          ? error.message
          : "Revisa las variables del módulo de correo entrante.",
    };
  }
}

function sortThreads(threads: MailThread[], sort: MailSortKey) {
  const sorted = [...threads];

  if (sort === "urgency") {
    sorted.sort((a, b) => {
      if (b.urgency_score !== a.urgency_score) {
        return b.urgency_score - a.urgency_score;
      }

      return (
        new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
      );
    });

    return sorted;
  }

  if (sort === "name") {
    sorted.sort((a, b) => {
      const nameComparison = (a.from_name ?? a.from_email).localeCompare(
        b.from_name ?? b.from_email,
        "es",
        { sensitivity: "base" },
      );

      if (nameComparison !== 0) {
        return nameComparison;
      }

      return (
        new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
      );
    });

    return sorted;
  }

  if (sort === "email") {
    sorted.sort((a, b) => {
      const emailComparison = a.from_email.localeCompare(b.from_email, "es", {
        sensitivity: "base",
      });

      if (emailComparison !== 0) {
        return emailComparison;
      }

      return (
        new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
      );
    });

    return sorted;
  }

  sorted.sort(
    (a, b) =>
      new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime(),
  );
  return sorted;
}

function applyMailFilters(
  threads: MailThread[],
  {
    q = "",
    urgency = "all",
    sort = "recent",
  }: Required<MailInboxFilters>,
) {
  const query = normalizeSearchValue(q);

  const filtered = threads.filter((thread) => {
    if (urgency !== "all" && thread.urgency !== urgency) {
      return false;
    }

    if (!query) {
      return true;
    }

    return [
      thread.from_name,
      thread.from_email,
      thread.subject,
      thread.last_message_preview,
    ]
      .filter(Boolean)
      .some((value) => normalizeSearchValue(String(value)).includes(query));
  });

  return sortThreads(filtered, sort);
}

export async function getMailThreadsForUser(
  userId: string,
  filters: MailInboxFilters = {},
) {
  if (isDemoMode()) {
    return applyMailFilters(demoMailThreads, {
      q: filters.q ?? "",
      urgency: filters.urgency ?? "all",
      sort: filters.sort ?? "recent",
    });
  }

  if (isLocalFileMode()) {
    return applyMailFilters([], {
      q: filters.q ?? "",
      urgency: filters.urgency ?? "all",
      sort: filters.sort ?? "recent",
    });
  }

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("mail_threads")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    if (isMissingMailTable(error)) {
      return [];
    }

    throw new Error("No se ha podido cargar la bandeja de correo.");
  }

  return applyMailFilters((data as MailThread[] | null) ?? [], {
    q: filters.q ?? "",
    urgency: filters.urgency ?? "all",
    sort: filters.sort ?? "recent",
  });
}

export async function getMailThreadForUser(userId: string, threadId: string) {
  if (isDemoMode()) {
    return getDemoMailThreadById(threadId);
  }

  if (isLocalFileMode()) {
    return null;
  }

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("mail_threads")
    .select("*")
    .eq("id", threadId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    if (isMissingMailTable(error)) {
      return null;
    }

    throw new Error("No se ha podido cargar el hilo de correo.");
  }

  return (data as MailThread | null) ?? null;
}

export async function getMailMessagesForUser(userId: string, threadId: string) {
  if (isDemoMode()) {
    return demoMailMessages.filter((message) => message.thread_id === threadId);
  }

  if (isLocalFileMode()) {
    return [];
  }

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("mail_messages")
    .select("*")
    .eq("user_id", userId)
    .eq("thread_id", threadId)
    .order("received_at", { ascending: true });

  if (error) {
    if (isMissingMailTable(error)) {
      return [];
    }

    throw new Error("No se han podido cargar los mensajes de correo.");
  }

  return (data as MailMessage[] | null) ?? [];
}

export async function getMailSyncRunsForUser(userId: string, limit = 5) {
  if (isDemoMode()) {
    return demoMailSyncRuns.slice(0, limit);
  }

  if (isLocalFileMode()) {
    return [];
  }

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("mail_sync_runs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingMailTable(error)) {
      return [];
    }

    throw new Error("No se ha podido cargar el historial de sincronización IMAP.");
  }

  return (data as MailSyncRun[] | null) ?? [];
}

async function logMailSyncRun(
  userId: string,
  payload: Omit<MailSyncRun, "id" | "user_id" | "created_at">,
) {
  if (isDemoMode() || isLocalFileMode()) {
    return null;
  }

  const admin = createAdminSupabaseClient();
  const { error } = await admin.from("mail_sync_runs").insert({
    user_id: userId,
    ...payload,
  });

  if (error && !isMissingMailTable(error)) {
    throw new Error("No se ha podido registrar la sincronización IMAP.");
  }

  return true;
}

async function getOrCreateMailThread({
  userId,
  threadKey,
  fromName,
  fromEmail,
  subject,
  urgency,
  urgencyScore,
  preview,
  receivedAt,
}: {
  userId: string;
  threadKey: string;
  fromName: string | null;
  fromEmail: string;
  subject: string | null;
  urgency: MessageUrgency;
  urgencyScore: number;
  preview: string;
  receivedAt: string;
}) {
  const admin = createAdminSupabaseClient();
  const { data: existing, error: existingError } = await admin
    .from("mail_threads")
    .select("*")
    .eq("user_id", userId)
    .eq("source", "imap")
    .eq("external_thread_key", threadKey)
    .maybeSingle();

  if (existingError && !isMissingMailTable(existingError)) {
    throw new Error("No se ha podido preparar el hilo de correo.");
  }

  if (existing) {
    return existing as MailThread;
  }

  const { data: created, error } = await admin
    .from("mail_threads")
    .insert({
      user_id: userId,
      source: "imap",
      external_thread_key: threadKey,
      from_name: fromName,
      from_email: fromEmail,
      subject,
      urgency,
      urgency_score: urgencyScore,
      unread_count: 0,
      last_message_preview: preview,
      last_message_at: receivedAt,
    })
    .select("*")
    .single();

  if (error || !created) {
    throw new Error("No se ha podido crear el hilo de correo.");
  }

  return created as MailThread;
}

async function importSingleMailMessage({
  userId,
  messageId,
  fromName,
  fromEmail,
  toEmails,
  subject,
  bodyText,
  bodyHtml,
  receivedAt,
  rawHeaders,
}: {
  userId: string;
  messageId: string;
  fromName: string | null;
  fromEmail: string;
  toEmails: string[];
  subject: string | null;
  bodyText: string;
  bodyHtml: string | null;
  receivedAt: string;
  rawHeaders: Record<string, unknown>;
}) {
  const admin = createAdminSupabaseClient();
  const { data: existingMessage, error: existingError } = await admin
    .from("mail_messages")
    .select("id")
    .eq("user_id", userId)
    .eq("source", "imap")
    .eq("external_message_id", messageId)
    .maybeSingle();

  if (existingError && !isMissingMailTable(existingError)) {
    throw new Error("No se ha podido comprobar si el correo ya estaba importado.");
  }

  if (existingMessage) {
    return false;
  }

  const preview = bodyText.slice(0, 220);
  const urgencyMeta = getUrgencyMeta(`${subject ?? ""}\n${bodyText}`);
  const thread = await getOrCreateMailThread({
    userId,
    threadKey: fromEmail,
    fromName,
    fromEmail,
    subject,
    urgency: urgencyMeta.urgency,
    urgencyScore: urgencyMeta.score,
    preview,
    receivedAt,
  });

  const { error: insertError } = await admin.from("mail_messages").insert({
    user_id: userId,
    thread_id: thread.id,
    source: "imap",
    external_message_id: messageId,
    from_name: fromName,
    from_email: fromEmail,
    to_emails: toEmails,
    subject,
    body_text: bodyText,
    body_html: bodyHtml,
    received_at: receivedAt,
    raw_headers: rawHeaders,
  });

  if (insertError) {
    throw new Error("No se ha podido guardar el correo importado.");
  }

  const isNewest =
    new Date(receivedAt).getTime() >= new Date(thread.last_message_at).getTime();
  const nextUrgencyScore =
    urgencyMeta.score >= thread.urgency_score ? urgencyMeta.score : thread.urgency_score;
  const nextUrgency =
    urgencyMeta.score >= thread.urgency_score ? urgencyMeta.urgency : thread.urgency;

  const { error: updateError } = await admin
    .from("mail_threads")
    .update({
      from_name: fromName ?? thread.from_name,
      subject: isNewest ? subject : thread.subject,
      urgency: nextUrgency,
      urgency_score: nextUrgencyScore,
      unread_count: thread.unread_count + 1,
      last_message_preview: isNewest ? preview : thread.last_message_preview,
      last_message_at: isNewest ? receivedAt : thread.last_message_at,
    })
    .eq("id", thread.id)
    .eq("user_id", userId);

  if (updateError) {
    throw new Error("No se ha podido actualizar el hilo de correo.");
  }

  return true;
}

async function listMessagesFromImap(config: InboundMailConfig) {
  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.username,
      pass: config.password,
    },
    logger: false,
    emitLogs: false,
  });

  await client.connect();

  try {
    const lock = await client.getMailboxLock(config.mailbox);

    try {
      const searchQuery = config.unseenOnly ? { seen: false } : { all: true };
      const found = await client.search(searchQuery, { uid: true });
      const uids = (found || [])
        .sort((a, b) => b - a)
        .slice(0, config.maxMessages)
        .sort((a, b) => a - b);

      if (!uids.length) {
        return [];
      }

      const entries: Array<{
        messageId: string;
        fromName: string | null;
        fromEmail: string;
        toEmails: string[];
        subject: string | null;
        bodyText: string;
        bodyHtml: string | null;
        receivedAt: string;
        rawHeaders: Record<string, unknown>;
      }> = [];

      for await (const message of client.fetch(
        uids,
        {
          uid: true,
          envelope: true,
          source: true,
          internalDate: true,
        },
        { uid: true },
      )) {
        if (!message.source) {
          continue;
        }

        const parsed: ParsedMail = await simpleParser(message.source);
        const firstFrom =
          getFirstParsedAddress(parsed.from) ?? message.envelope?.from?.[0] ?? null;
        const fromEmail = normalizeEmail(
          firstFrom?.address ?? config.username,
        );

        if (!fromEmail) {
          continue;
        }

        const toEmails = Array.from(
          new Set([
            ...mapParsedAddresses(parsed.to),
            ...((message.envelope?.to ?? []).map((entry) =>
              normalizeEmail(entry.address),
            ) ?? []),
          ].filter(Boolean)),
        );
        const subject = getSafeString(parsed.subject ?? message.envelope?.subject) || null;
        const bodyText =
          getSafeString(parsed.text) || "[Correo sin cuerpo de texto legible]";
        const bodyHtml = typeof parsed.html === "string" ? parsed.html : null;
        const receivedAt = (
          parsed.date ??
          (message.envelope?.date ? new Date(message.envelope.date) : null) ??
          (message.internalDate ? new Date(message.internalDate) : null) ??
          new Date()
        ).toISOString();
        const messageId =
          getSafeString(parsed.messageId ?? message.envelope?.messageId) ||
          `<imap-${config.username}-${message.uid}>`;

        entries.push({
          messageId,
          fromName: getSafeString(firstFrom?.name) || null,
          fromEmail,
          toEmails,
          subject,
          bodyText,
          bodyHtml,
          receivedAt,
          rawHeaders: {
            messageId,
            subject,
            from: fromEmail,
            to: toEmails,
            date: receivedAt,
          },
        });
      }

      return entries;
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => null);
  }
}

export async function syncInboundMailForUser(userId: string) {
  if (isDemoMode()) {
    return {
      importedCount: 0,
      detail: "Modo demo: la sincronización IMAP real está desactivada.",
    };
  }

  if (isLocalFileMode()) {
    return {
      importedCount: 0,
      detail: "Modo local: la bandeja IMAP queda visible, pero la importación persistente todavía no está activada.",
    };
  }

  const config = getInboundMailConfig();

  if (!config) {
    throw new Error(
      "El módulo de correo entrante no está configurado. Añade las variables IMAP primero.",
    );
  }

  try {
    const messages = await listMessagesFromImap(config);
    let importedCount = 0;

    for (const message of messages) {
      const inserted = await importSingleMailMessage({
        userId,
        ...message,
      });

      if (inserted) {
        importedCount += 1;
      }
    }

    const detail =
      messages.length === 0
        ? `No se han encontrado correos nuevos en ${config.mailbox}.`
        : `Sincronización completada desde ${config.mailbox}.`;

    await logMailSyncRun(userId, {
      source: "imap",
      status: "success",
      imported_count: importedCount,
      detail,
    }).catch(() => null);

    return {
      importedCount,
      detail,
    };
  } catch (error) {
    const detail =
      error instanceof Error
        ? error.message
        : "No se ha podido completar la sincronización IMAP.";

    await logMailSyncRun(userId, {
      source: "imap",
      status: "error",
      imported_count: 0,
      detail,
    }).catch(() => null);

    throw error;
  }
}
type ParsedAddressEntry = {
  address?: string;
  name?: string;
};
