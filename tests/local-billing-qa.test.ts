import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { exportBackupForUser, restoreBackupForUser } from "@/lib/backups";
import {
  createLocalInvoiceRecord,
  getLocalCoreSnapshot,
  listLocalInvoicesForUser,
  recordLocalInvoiceReminder,
  updateLocalInvoicePaymentState,
} from "@/lib/local-core";
import {
  getInvoiceCollectionSummary,
  getInvoiceReminderQueues,
} from "@/lib/collections";
import type { InvoiceRecord } from "@/lib/types";

const userId = "user-local-billing-qa";
const email = "asesor@despacho.local";

function buildLineItems(index: number) {
  return [
    {
      description: `Iguala fiscal empresa ${index}`,
      quantity: 1,
      unitPrice: 300 + index,
      vatRate: 21 as const,
      lineBase: 300 + index,
      vatAmount: Number(((300 + index) * 0.21).toFixed(2)),
      lineTotal: Number(((300 + index) * 1.21).toFixed(2)),
    },
  ];
}

function buildTotals(index: number) {
  const base = 300 + index;
  const vat = Number((base * 0.21).toFixed(2));

  return {
    subtotal: base,
    vatTotal: vat,
    irpfRate: 0,
    irpfAmount: 0,
    grandTotal: Number((base + vat).toFixed(2)),
    vatBreakdown: [
      {
        rate: 21 as const,
        taxableBase: base,
        vatAmount: vat,
      },
    ],
  };
}

function buildDueDate(index: number) {
  if (index <= 4) {
    return `2026-03-${String(8 + index).padStart(2, "0")}`;
  }

  if (index <= 6) {
    return `2026-03-${String(20 + index - 4).padStart(2, "0")}`;
  }

  return `2026-03-${String(27 + index - 7).padStart(2, "0")}`;
}

let localDataDir = "";

beforeEach(async () => {
  localDataDir = await mkdtemp(path.join(os.tmpdir(), "facturaia-local-billing-"));
  process.env.FACTURAIA_LOCAL_MODE = "1";
  process.env.FACTURAIA_DATA_DIR = localDataDir;
  process.env.FACTURAIA_LOCAL_SESSION_SECRET = "billing-local-secret";
  process.env.NEXT_PUBLIC_APP_URL = "http://127.0.0.1:3998";
});

afterEach(async () => {
  await rm(localDataDir, { recursive: true, force: true });
});

describe("local billing qa", () => {
  test("supports mass invoicing, payment states and reminder queues locally", async () => {
    const created: InvoiceRecord[] = [];

    for (let index = 1; index <= 12; index += 1) {
      created.push(
        await createLocalInvoiceRecord({
          userId,
          payload: {
            issueDate: `2026-03-${String(index).padStart(2, "0")}`,
            dueDate: buildDueDate(index),
            issuerName: "Asesoria Martin Fiscal",
            issuerNif: "B12345678",
            issuerAddress: "Calle Alcala 100, Madrid",
            clientName: `Empresa ${index} S.L.`,
            clientNif: `B76543${String(index).padStart(3, "0")}`,
            clientAddress: `Calle Cliente ${index}, Madrid`,
            clientEmail: `cliente${index}@empresa.test`,
          },
          lineItems: buildLineItems(index),
          totals: buildTotals(index),
          issuerLogoUrl: null,
        }),
      );
    }

    await updateLocalInvoicePaymentState(userId, created[0]!.id, "mark_paid");
    await recordLocalInvoiceReminder({
      userId,
      invoiceId: created[1]!.id,
      recipientEmail: created[1]!.client_email,
      subject: "Recordatorio de pago F-2",
      triggerMode: "manual",
      batchKey: "overdue_due",
    });

    const invoices = await listLocalInvoicesForUser(userId);
    const snapshot = await getLocalCoreSnapshot();
    const summary = getInvoiceCollectionSummary(invoices, new Date("2026-03-20T09:00:00.000Z"));
    const queues = getInvoiceReminderQueues(invoices, new Date("2026-03-20T09:00:00.000Z"));

    expect(created).toHaveLength(12);
    expect(snapshot.invoices).toHaveLength(12);
    expect(new Set(snapshot.invoices.map((invoice) => invoice.public_id)).size).toBe(12);
    expect(snapshot.invoices.map((invoice) => invoice.invoice_number)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
    ]);
    expect(invoices[0]?.invoice_number).toBe(12);
    expect(invoices.at(-1)?.invoice_number).toBe(1);
    expect(snapshot.invoices.find((invoice) => invoice.id === created[0]!.id)?.payment_status).toBe("paid");
    expect(snapshot.invoices.find((invoice) => invoice.id === created[1]!.id)?.reminder_count).toBe(1);
    expect(summary.total).toBe(12);
    expect(summary.paid).toBe(1);
    expect(summary.overdue).toBe(3);
    expect(queues.find((queue) => queue.key === "overdue_due")?.count).toBe(2);
    expect(queues.find((queue) => queue.key === "due_soon")?.count).toBe(2);
  });

  test("keeps numbering and collection state after backup and restore", async () => {
    for (let index = 1; index <= 10; index += 1) {
      await createLocalInvoiceRecord({
        userId,
        payload: {
          issueDate: `2026-03-${String(index).padStart(2, "0")}`,
          dueDate: `2026-03-${String(10 + index).padStart(2, "0")}`,
          issuerName: "Asesoria Martin Fiscal",
          issuerNif: "B12345678",
          issuerAddress: "Calle Alcala 100, Madrid",
          clientName: `Empresa ${index} S.L.`,
          clientNif: `B99000${String(index).padStart(3, "0")}`,
          clientAddress: `Avenida Fiscal ${index}, Madrid`,
          clientEmail: `empresa${index}@restore.test`,
        },
        lineItems: buildLineItems(index),
        totals: buildTotals(index),
        issuerLogoUrl: null,
      });
    }

    const beforeBackup = await listLocalInvoicesForUser(userId);
    await updateLocalInvoicePaymentState(userId, beforeBackup[0]!.id, "mark_paid");
    await recordLocalInvoiceReminder({
      userId,
      invoiceId: beforeBackup[1]!.id,
      recipientEmail: beforeBackup[1]!.client_email,
      subject: "Seguimiento tras restore",
      triggerMode: "batch",
      batchKey: "due_soon",
    });

    const backup = await exportBackupForUser(userId, email);
    const restoreDir = await mkdtemp(path.join(os.tmpdir(), "facturaia-local-billing-restore-"));

    try {
      process.env.FACTURAIA_DATA_DIR = restoreDir;
      await restoreBackupForUser(userId, email, backup);

      const restoredInvoices = await listLocalInvoicesForUser(userId);
      const restoredSnapshot = await getLocalCoreSnapshot();

      expect(restoredInvoices).toHaveLength(10);
      expect(restoredSnapshot.invoiceReminders).toHaveLength(1);
      expect(restoredInvoices.some((invoice) => invoice.payment_status === "paid")).toBe(true);

      const nextInvoice = await createLocalInvoiceRecord({
        userId,
        payload: {
          issueDate: "2026-03-21",
          dueDate: "2026-03-31",
          issuerName: "Asesoria Martin Fiscal",
          issuerNif: "B12345678",
          issuerAddress: "Calle Alcala 100, Madrid",
          clientName: "Empresa Once S.L.",
          clientNif: "B11111111",
          clientAddress: "Calle Continuidad 11, Madrid",
          clientEmail: "empresa11@restore.test",
        },
        lineItems: buildLineItems(11),
        totals: buildTotals(11),
        issuerLogoUrl: null,
      });

      const finalSnapshot = await getLocalCoreSnapshot();

      expect(nextInvoice.invoice_number).toBe(11);
      expect(finalSnapshot.invoices).toHaveLength(11);
      expect(finalSnapshot.invoiceReminders).toHaveLength(1);
    } finally {
      await rm(restoreDir, { recursive: true, force: true });
      process.env.FACTURAIA_DATA_DIR = localDataDir;
    }
  });
});
