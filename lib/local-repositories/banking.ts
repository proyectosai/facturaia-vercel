import "server-only";

import type { BankMovementRecord, LocalAuditEventRecord } from "@/lib/types";
import {
  getStructuredLocalBankMovementById,
  listStructuredLocalBankMovementsForUser,
  persistStructuredLocalMutation,
  replaceStructuredLocalBankMovementsForUser,
} from "@/lib/local-db";

export async function listStructuredBankingRepositoryRecords(userId: string) {
  return listStructuredLocalBankMovementsForUser(userId);
}

export async function getStructuredBankingRepositoryRecord(
  userId: string,
  movementId: string,
) {
  return getStructuredLocalBankMovementById(userId, movementId);
}

export async function persistStructuredBankingRepositoryState({
  bankMovements,
  auditEvents,
}: {
  bankMovements?: BankMovementRecord[];
  auditEvents?: LocalAuditEventRecord[];
}) {
  return persistStructuredLocalMutation({
    bankMovements,
    auditEvents,
  });
}

export async function replaceStructuredBankingRepositoryRecords(
  userId: string,
  bankMovements: BankMovementRecord[],
) {
  return replaceStructuredLocalBankMovementsForUser(userId, bankMovements);
}
