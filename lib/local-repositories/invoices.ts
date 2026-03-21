import "server-only";

import type { InvoiceRecord, InvoiceReminderRecord, LocalAuditEventRecord } from "@/lib/types";
import {
  getStructuredLocalCounters,
  getStructuredLocalInvoiceById,
  getStructuredLocalInvoiceByPublicId,
  listStructuredLocalInvoiceRemindersForUser,
  listStructuredLocalInvoicesForUser,
  persistStructuredLocalMutation,
} from "@/lib/local-db";

export async function getStructuredInvoiceRepositoryCounters() {
  return getStructuredLocalCounters();
}

export async function listStructuredInvoiceRepositoryRecords(userId: string) {
  return listStructuredLocalInvoicesForUser(userId);
}

export async function getStructuredInvoiceRepositoryRecord(userId: string, invoiceId: string) {
  return getStructuredLocalInvoiceById(userId, invoiceId);
}

export async function getStructuredInvoiceRepositoryRecordByPublicId(publicId: string) {
  return getStructuredLocalInvoiceByPublicId(publicId);
}

export async function listStructuredInvoiceRepositoryReminders(userId: string) {
  return listStructuredLocalInvoiceRemindersForUser(userId);
}

export async function persistStructuredInvoiceRepositoryState({
  invoices,
  invoiceReminders,
  auditEvents,
  counters,
}: {
  invoices?: InvoiceRecord[];
  invoiceReminders?: InvoiceReminderRecord[];
  auditEvents?: LocalAuditEventRecord[];
  counters?: {
    invoice_number: number;
    quote_number: number;
    delivery_note_number: number;
  };
}) {
  const saved = await persistStructuredLocalMutation({
    invoices,
    invoiceReminders,
    auditEvents,
    counters,
  });

  return saved;
}
