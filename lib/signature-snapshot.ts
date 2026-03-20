import { createHash } from "node:crypto";

import type { CommercialDocumentRecord, CommercialDocumentType, DocumentSignatureRequestRecord } from "@/lib/types";
import { toNumber } from "@/lib/utils";

export type SignatureDocumentSnapshot = {
  hash: string;
  documentType: CommercialDocumentType;
  documentNumber: number;
  issueDate: string;
  grandTotal: number;
  clientName: string;
  issuerName: string;
};

export function buildSignatureDocumentSnapshot(
  document: CommercialDocumentRecord,
): SignatureDocumentSnapshot {
  const payload = {
    documentType: document.document_type,
    documentNumber: Number(document.document_number),
    issueDate: document.issue_date,
    clientName: document.client_name,
    clientNif: document.client_nif,
    issuerName: document.issuer_name,
    issuerNif: document.issuer_nif,
    grandTotal: toNumber(document.grand_total),
    notes: document.notes ?? "",
    lineItems: (document.line_items ?? []).map((line) => ({
      description: line.description,
      quantity: toNumber(line.quantity),
      unitPrice: toNumber(line.unitPrice),
      vatRate: line.vatRate,
      lineTotal: toNumber(line.lineTotal),
    })),
  };
  const hash = createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");

  return {
    hash,
    documentType: document.document_type,
    documentNumber: Number(document.document_number),
    issueDate: document.issue_date,
    grandTotal: toNumber(document.grand_total),
    clientName: document.client_name,
    issuerName: document.issuer_name,
  };
}

export function extractSignatureSnapshot(
  evidence: DocumentSignatureRequestRecord["evidence"],
) {
  if (
    evidence &&
    typeof evidence === "object" &&
    "documentSnapshot" in evidence &&
    evidence.documentSnapshot &&
    typeof evidence.documentSnapshot === "object"
  ) {
    return evidence.documentSnapshot as SignatureDocumentSnapshot;
  }

  return null;
}

export function hasSignatureSnapshotMismatch(
  request: Pick<DocumentSignatureRequestRecord, "evidence">,
  document: CommercialDocumentRecord,
) {
  const snapshot = extractSignatureSnapshot(request.evidence);

  if (!snapshot) {
    return false;
  }

  return snapshot.hash !== buildSignatureDocumentSnapshot(document).hash;
}
