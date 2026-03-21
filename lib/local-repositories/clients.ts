import "server-only";

import type { ClientRecord, LocalAuditEventRecord } from "@/lib/types";
import {
  getStructuredLocalClientById,
  listStructuredLocalClientsForUser,
  persistStructuredLocalMutation,
} from "@/lib/local-db";

export async function listStructuredClientRepositoryRecords(userId: string) {
  return listStructuredLocalClientsForUser(userId);
}

export async function getStructuredClientRepositoryRecord(userId: string, clientId: string) {
  return getStructuredLocalClientById(userId, clientId);
}

export async function saveStructuredClientRepositoryRecord({
  client,
  auditEvent,
}: {
  client: ClientRecord;
  auditEvent?: LocalAuditEventRecord | null;
}) {
  const saved = await persistStructuredLocalMutation({
    clients: [client],
    auditEvents: auditEvent ? [auditEvent] : [],
  });

  return saved ? client : null;
}
