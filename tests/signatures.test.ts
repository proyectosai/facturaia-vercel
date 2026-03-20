import { describe, expect, test } from "vitest";

import {
  buildSignatureDocumentSnapshot,
  hasSignatureSnapshotMismatch,
} from "@/lib/signature-snapshot";
import { demoCommercialDocuments } from "@/lib/demo";

describe("signature snapshot integrity", () => {
  test("detects when a document changes after link creation", () => {
    const document = demoCommercialDocuments[0]!;
    const snapshot = buildSignatureDocumentSnapshot(document);
    const changedDocument = {
      ...document,
      notes: `${document.notes ?? ""} Cambio posterior`,
    };

    expect(
      hasSignatureSnapshotMismatch(
        {
          evidence: {
            documentSnapshot: snapshot,
          },
        },
        changedDocument,
      ),
    ).toBe(true);
  });

  test("keeps the same hash when the document is intact", () => {
    const document = demoCommercialDocuments[0]!;
    const snapshot = buildSignatureDocumentSnapshot(document);

    expect(
      hasSignatureSnapshotMismatch(
        {
          evidence: {
            documentSnapshot: snapshot,
          },
        },
        document,
      ),
    ).toBe(false);
  });
});
