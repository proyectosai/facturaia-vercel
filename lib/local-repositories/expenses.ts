import "server-only";

import type { ExpenseRecord, LocalAuditEventRecord } from "@/lib/types";
import {
  getStructuredLocalExpenseById,
  listStructuredLocalExpensesForUser,
  persistStructuredLocalMutation,
  replaceStructuredLocalExpensesForUser,
} from "@/lib/local-db";

export async function listStructuredExpenseRepositoryRecords(userId: string) {
  return listStructuredLocalExpensesForUser(userId);
}

export async function getStructuredExpenseRepositoryRecord(
  userId: string,
  expenseId: string,
) {
  return getStructuredLocalExpenseById(userId, expenseId);
}

export async function saveStructuredExpenseRepositoryRecord({
  expense,
  auditEvent,
}: {
  expense: ExpenseRecord;
  auditEvent?: LocalAuditEventRecord | null;
}) {
  const saved = await persistStructuredLocalMutation({
    expenses: [expense],
    auditEvents: auditEvent ? [auditEvent] : [],
  });

  return saved ? expense : null;
}

export async function replaceStructuredExpenseRepositoryRecords(
  userId: string,
  expenses: ExpenseRecord[],
) {
  return replaceStructuredLocalExpensesForUser(userId, expenses);
}
