import "server-only";

import type {
  CommercialDocumentRecord,
  DocumentSignatureRequestRecord,
  LocalAuditEventRecord,
} from "@/lib/types";
import {
  getStructuredLocalCommercialDocumentById,
  getStructuredLocalDocumentSignatureRequestByAnyId,
  getStructuredLocalDocumentSignatureRequestById,
  getStructuredLocalPublicSignatureRequestByToken,
  listStructuredLocalCommercialDocumentsForUser,
  listStructuredLocalDocumentSignatureRequestsForUser,
  persistStructuredLocalMutation,
  replaceStructuredLocalCommercialStateForUser,
} from "@/lib/local-db";

export async function listStructuredCommercialRepositoryRecords(userId: string) {
  return listStructuredLocalCommercialDocumentsForUser(userId);
}

export async function getStructuredCommercialRepositoryRecord(
  userId: string,
  documentId: string,
) {
  return getStructuredLocalCommercialDocumentById(userId, documentId);
}

export async function saveStructuredCommercialRepositoryRecord({
  document,
  counters,
  auditEvent,
}: {
  document: CommercialDocumentRecord;
  counters?: {
    invoice_number: number;
    quote_number: number;
    delivery_note_number: number;
  };
  auditEvent?: LocalAuditEventRecord | null;
}) {
  const saved = await persistStructuredLocalMutation({
    commercialDocuments: [document],
    counters,
    auditEvents: auditEvent ? [auditEvent] : [],
  });

  return saved ? document : null;
}

export async function listStructuredSignatureRepositoryRecords(userId: string) {
  return listStructuredLocalDocumentSignatureRequestsForUser(userId);
}

export async function getStructuredSignatureRepositoryRecord(
  userId: string,
  requestId: string,
) {
  return getStructuredLocalDocumentSignatureRequestById(userId, requestId);
}

export async function getStructuredSignatureRepositoryRecordByAnyId(
  requestId: string,
) {
  return getStructuredLocalDocumentSignatureRequestByAnyId(requestId);
}

export async function getStructuredSignatureRepositoryPublicRecord(token: string) {
  return getStructuredLocalPublicSignatureRequestByToken(token);
}

export async function saveStructuredSignatureRepositoryState({
  requests,
  documents,
  auditEvent,
}: {
  requests: DocumentSignatureRequestRecord[];
  documents?: CommercialDocumentRecord[];
  auditEvent?: LocalAuditEventRecord | null;
}) {
  const saved = await persistStructuredLocalMutation({
    documentSignatureRequests: requests,
    commercialDocuments: documents ?? [],
    auditEvents: auditEvent ? [auditEvent] : [],
  });

  return saved;
}

export async function replaceStructuredCommercialRepositoryStateForUser({
  userId,
  commercialDocuments,
  documentSignatureRequests,
}: {
  userId: string;
  commercialDocuments: CommercialDocumentRecord[];
  documentSignatureRequests: DocumentSignatureRequestRecord[];
}) {
  return replaceStructuredLocalCommercialStateForUser({
    userId,
    commercialDocuments,
    documentSignatureRequests,
  });
}
