import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { exportBackupForUser, restoreBackupForUser } from "@/lib/backups";
import {
  createLocalCommercialDocumentRecord,
  createLocalDocumentSignatureRequest,
  createLocalExpenseRecord,
  createLocalFeedbackEntry,
  createLocalInvoiceRecord,
  getLocalCoreSnapshot,
  respondToLocalDocumentSignatureRequest,
  saveLocalClientRecord,
  saveLocalProfile,
} from "@/lib/local-core";

const userId = "user-backup-local";
const email = "asesor@despacho.local";

function buildLineItems() {
  return [
    {
      description: "Servicio mensual de asesoria fiscal y contable",
      quantity: 1,
      unitPrice: 350,
      vatRate: 21 as const,
      lineBase: 350,
      vatAmount: 73.5,
      lineTotal: 423.5,
    },
  ];
}

function buildTotals() {
  return {
    subtotal: 350,
    vatTotal: 73.5,
    irpfRate: 0,
    irpfAmount: 0,
    grandTotal: 423.5,
    vatBreakdown: [
      {
        rate: 21 as const,
        taxableBase: 350,
        vatAmount: 73.5,
      },
    ],
  };
}

let localDataDir = "";

beforeEach(async () => {
  localDataDir = await mkdtemp(path.join(os.tmpdir(), "facturaia-backup-local-"));
  process.env.FACTURAIA_LOCAL_MODE = "1";
  process.env.FACTURAIA_DATA_DIR = localDataDir;
  process.env.FACTURAIA_LOCAL_SESSION_SECRET = "backup-local-secret";
  process.env.NEXT_PUBLIC_APP_URL = "http://127.0.0.1:3999";
});

afterEach(async () => {
  await rm(localDataDir, { recursive: true, force: true });
});

describe("local backup export and restore", () => {
  test("exports local data and restores it into a fresh local directory", async () => {
    await saveLocalProfile({
      userId,
      email,
      fullName: "Asesoria Martin Fiscal",
      nif: "B12345678",
      address: "Calle Alcala 100, Madrid",
      logoUrl: null,
    });

    await saveLocalClientRecord({
      userId,
      relationKind: "client",
      status: "active",
      priority: "medium",
      displayName: "Empresa Norte S.L.",
      firstName: null,
      lastName: null,
      companyName: "Empresa Norte S.L.",
      email: "admin@empresanorte.es",
      phone: "+34 600111222",
      nif: "B76543210",
      address: "Avenida de Europa 15, Pozuelo",
      notes: "Cliente exportado",
      tags: ["local", "backup"],
    });

    await createLocalExpenseRecord({
      userId,
      expenseKind: "supplier_invoice",
      reviewStatus: "reviewed",
      vendorName: "Gestoria Externa SL",
      vendorNif: "B11223344",
      expenseDate: "2026-03-15",
      currency: "EUR",
      baseAmount: 100,
      vatAmount: 21,
      totalAmount: 121,
      notes: "Gasto exportado",
      sourceFileName: "factura.txt",
      sourceFilePath: "data:text/plain;base64,ZmFrZQ==",
      sourceFileMimeType: "text/plain",
      extractionMethod: "manual",
      rawText: "Proveedor: Gestoria Externa SL",
      extractedPayload: {
        confidence: 1,
      },
    });

    await createLocalFeedbackEntry({
      userId,
      sourceType: "pilot",
      moduleKey: "backup",
      severity: "medium",
      title: "Feedback exportado",
      message: "La bandeja de feedback también debe viajar en la copia local.",
      reporterName: "Asesoria Martin Fiscal",
      contactEmail: email,
    });

    const document = await createLocalCommercialDocumentRecord({
      userId,
      input: {
        document_type: "quote",
        status: "draft",
        issue_date: "2026-03-20",
        valid_until: "2026-04-19",
        issuer_name: "Asesoria Martin Fiscal",
        issuer_nif: "B12345678",
        issuer_address: "Calle Alcala 100, Madrid",
        issuer_logo_url: null,
        client_name: "Empresa Norte S.L.",
        client_nif: "B76543210",
        client_address: "Avenida de Europa 15, Pozuelo",
        client_email: "admin@empresanorte.es",
        line_items: buildLineItems(),
        vat_breakdown: buildTotals().vatBreakdown,
        subtotal: 350,
        vat_total: 73.5,
        irpf_rate: 0,
        irpf_amount: 0,
        grand_total: 423.5,
        notes: "Presupuesto exportado",
        converted_invoice_id: null,
      },
    });

    const request = await createLocalDocumentSignatureRequest({
      userId,
      documentId: document.id,
      documentType: "quote",
      requestKind: "quote_acceptance",
      publicToken: "token-export-restore",
      requestNote: null,
      requestedAt: "2026-03-20T10:00:00.000Z",
      expiresAt: "2026-04-19T23:59:59.000Z",
      evidence: {
        documentSnapshot: {
          hash: "hash-local-backup",
        },
      },
    });

    await respondToLocalDocumentSignatureRequest({
      token: request.public_token,
      status: "signed",
      signerName: "Empresa Norte S.L.",
      signerEmail: "admin@empresanorte.es",
      signerNif: "B76543210",
      signerMessage: "Aceptado",
      acceptedTerms: true,
      forwardedFor: "127.0.0.1",
      userAgent: "Vitest",
    });

    await createLocalInvoiceRecord({
      userId,
      payload: {
        issueDate: "2026-03-20",
        dueDate: "2026-03-20",
        issuerName: "Asesoria Martin Fiscal",
        issuerNif: "B12345678",
        issuerAddress: "Calle Alcala 100, Madrid",
        clientName: "Empresa Norte S.L.",
        clientNif: "B76543210",
        clientAddress: "Avenida de Europa 15, Pozuelo",
        clientEmail: "admin@empresanorte.es",
      },
      lineItems: buildLineItems(),
      totals: buildTotals(),
      issuerLogoUrl: null,
    });

    const backup = await exportBackupForUser(userId, email);

    expect(backup.appUrl).toBe("http://127.0.0.1:3999");
    expect(backup.clients).toHaveLength(1);
    expect(backup.feedbackEntries).toHaveLength(1);
    expect(backup.expenses).toHaveLength(1);
    expect(backup.commercialDocuments).toHaveLength(1);
    expect(backup.documentSignatureRequests).toHaveLength(1);
    expect(backup.invoices).toHaveLength(1);

    const restoreDir = await mkdtemp(path.join(os.tmpdir(), "facturaia-backup-restore-"));

    try {
      process.env.FACTURAIA_DATA_DIR = restoreDir;
      await restoreBackupForUser(userId, email, backup);

      const restored = await getLocalCoreSnapshot();

      expect(restored.profiles).toHaveLength(1);
      expect(restored.clients).toHaveLength(1);
      expect(restored.feedbackEntries).toHaveLength(1);
      expect(restored.expenses).toHaveLength(1);
      expect(restored.commercialDocuments).toHaveLength(1);
      expect(restored.documentSignatureRequests).toHaveLength(1);
      expect(restored.invoices).toHaveLength(1);
      expect(restored.feedbackEntries[0]?.title).toBe("Feedback exportado");
      expect(restored.commercialDocuments[0]?.status).toBe("accepted");
      expect(restored.documentSignatureRequests[0]?.status).toBe("signed");
      expect(restored.invoices[0]?.invoice_number).toBe(1);
      expect(restored.clients[0]?.display_name).toBe("Empresa Norte S.L.");
    } finally {
      await rm(restoreDir, { recursive: true, force: true });
      process.env.FACTURAIA_DATA_DIR = localDataDir;
    }
  });
});
