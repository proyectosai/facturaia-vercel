import "server-only";

import type { LocalAuditEventRecord } from "@/lib/types";
import {
  getStructuredLocalCounters,
  listStructuredLocalAiUsageForUser,
  listStructuredLocalAuditEventsForUser,
  persistStructuredLocalMutation,
  replaceStructuredLocalAiUsageForUser,
  replaceStructuredLocalAuditEventsForUser,
  type StructuredAiUsageRow,
} from "@/lib/local-db";

export async function getStructuredCounterRepositoryState() {
  return getStructuredLocalCounters();
}

export async function persistStructuredCounterRepositoryState(counters: {
  invoice_number: number;
  quote_number: number;
  delivery_note_number: number;
}) {
  return persistStructuredLocalMutation({ counters });
}

export async function listStructuredAuditRepositoryRecords(
  userId: string,
  limit?: number,
) {
  return listStructuredLocalAuditEventsForUser(userId, limit);
}

export async function persistStructuredAuditRepositoryRecords(
  auditEvents: LocalAuditEventRecord[],
) {
  return persistStructuredLocalMutation({ auditEvents });
}

export async function replaceStructuredAuditRepositoryRecords(
  userId: string,
  auditEvents: LocalAuditEventRecord[],
) {
  return replaceStructuredLocalAuditEventsForUser(userId, auditEvents);
}

export async function listStructuredAiUsageRepositoryRecords(userId: string) {
  return listStructuredLocalAiUsageForUser(userId);
}

export async function persistStructuredAiUsageRepositoryRecords(
  aiUsage: StructuredAiUsageRow[],
) {
  return persistStructuredLocalMutation({ aiUsage });
}

export async function replaceStructuredAiUsageRepositoryRecords(
  userId: string,
  aiUsage: StructuredAiUsageRow[],
) {
  return replaceStructuredLocalAiUsageForUser(userId, aiUsage);
}
