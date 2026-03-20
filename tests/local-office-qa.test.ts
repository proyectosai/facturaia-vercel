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
  linkLocalCommercialDocumentToInvoice,
  recordLocalInvoiceReminder,
  respondToLocalDocumentSignatureRequest,
  saveLocalClientRecord,
  saveLocalProfile,
  updateLocalInvoicePaymentState,
} from "@/lib/local-core";

const userId = "user-local-office-qa";
const email = "asesor@despacho.local";

function buildLineItems(index: number) {
  return [
    {
      description: `Servicio mensual despacho ${index}`,
      quantity: 1,
      unitPrice: 200 + index,
      vatRate: 21 as const,
      lineBase: 200 + index,
      vatAmount: Number(((200 + index) * 0.21).toFixed(2)),
      lineTotal: Number(((200 + index) * 1.21).toFixed(2)),
    },
  ];
}

function buildTotals(index: number) {
  const base = 200 + index;
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

let localDataDir = "";

beforeEach(async () => {
  localDataDir = await mkdtemp(path.join(os.tmpdir(), "facturaia-local-office-"));
  process.env.FACTURAIA_LOCAL_MODE = "1";
  process.env.FACTURAIA_DATA_DIR = localDataDir;
  process.env.FACTURAIA_LOCAL_SESSION_SECRET = "office-local-secret";
  process.env.NEXT_PUBLIC_APP_URL = "http://127.0.0.1:4011";
});

afterEach(async () => {
  await rm(localDataDir, { recursive: true, force: true });
});

describe("local office qa", () => {
  test("survives a dense despacho workflow and keeps counters after restore", async () => {
    await saveLocalProfile({
      userId,
      email,
      fullName: "Asesoria Sierra Fiscal",
      nif: "B12345678",
      address: "Gran Via 10, Madrid",
      logoUrl: null,
    });

    for (let index = 1; index <= 15; index += 1) {
      await saveLocalClientRecord({
        userId,
        relationKind: index % 5 === 0 ? "mixed" : "client",
        status: index <= 12 ? "active" : "lead",
        priority: index % 3 === 0 ? "high" : "medium",
        displayName: `Cliente ${index} S.L.`,
        firstName: null,
        lastName: null,
        companyName: `Cliente ${index} S.L.`,
        email: `cliente${index}@despacho.test`,
        phone: `+34 600 00 ${String(index).padStart(2, "0")} ${String(index).padStart(2, "0")}`,
        nif: `B7000${String(index).padStart(4, "0")}`,
        address: `Calle Cliente ${index}, Madrid`,
        notes: `Ficha ${index}`,
        tags: ["qa", index % 2 === 0 ? "mensual" : "trimestral"],
      });
    }

    for (let index = 1; index <= 12; index += 1) {
      await createLocalExpenseRecord({
        userId,
        expenseKind: index % 2 === 0 ? "ticket" : "supplier_invoice",
        reviewStatus: index <= 8 ? "reviewed" : "draft",
        vendorName: `Proveedor ${index} SL`,
        vendorNif: `B8000${String(index).padStart(4, "0")}`,
        expenseDate: `2026-03-${String(index).padStart(2, "0")}`,
        currency: "EUR",
        baseAmount: 50 + index,
        vatAmount: Number(((50 + index) * 0.21).toFixed(2)),
        totalAmount: Number(((50 + index) * 1.21).toFixed(2)),
        notes: `Gasto ${index}`,
        sourceFileName: `gasto-${index}.txt`,
        sourceFilePath: "data:text/plain;base64,ZmFrZQ==",
        sourceFileMimeType: "text/plain",
        extractionMethod: "manual",
        rawText: `Proveedor ${index}`,
        extractedPayload: {
          confidence: 0.95,
        },
      });
    }

    const quotes = [];
    const deliveryNotes = [];

    for (let index = 1; index <= 6; index += 1) {
      quotes.push(
        await createLocalCommercialDocumentRecord({
          userId,
          input: {
            document_type: "quote",
            status: "draft",
            issue_date: `2026-03-${String(index).padStart(2, "0")}`,
            valid_until: `2026-04-${String(index + 10).padStart(2, "0")}`,
            issuer_name: "Asesoria Sierra Fiscal",
            issuer_nif: "B12345678",
            issuer_address: "Gran Via 10, Madrid",
            issuer_logo_url: null,
            client_name: `Cliente ${index} S.L.`,
            client_nif: `B7000${String(index).padStart(4, "0")}`,
            client_address: `Calle Cliente ${index}, Madrid`,
            client_email: `cliente${index}@despacho.test`,
            line_items: buildLineItems(index),
            vat_breakdown: buildTotals(index).vatBreakdown,
            subtotal: buildTotals(index).subtotal,
            vat_total: buildTotals(index).vatTotal,
            irpf_rate: 0,
            irpf_amount: 0,
            grand_total: buildTotals(index).grandTotal,
            notes: `Presupuesto ${index}`,
            converted_invoice_id: null,
          },
        }),
      );
    }

    for (let index = 1; index <= 3; index += 1) {
      deliveryNotes.push(
        await createLocalCommercialDocumentRecord({
          userId,
          input: {
            document_type: "delivery_note",
            status: "draft",
            issue_date: `2026-03-${String(index + 10).padStart(2, "0")}`,
            valid_until: null,
            issuer_name: "Asesoria Sierra Fiscal",
            issuer_nif: "B12345678",
            issuer_address: "Gran Via 10, Madrid",
            issuer_logo_url: null,
            client_name: `Cliente ${index} S.L.`,
            client_nif: `B7000${String(index).padStart(4, "0")}`,
            client_address: `Calle Cliente ${index}, Madrid`,
            client_email: `cliente${index}@despacho.test`,
            line_items: buildLineItems(index + 20),
            vat_breakdown: buildTotals(index + 20).vatBreakdown,
            subtotal: buildTotals(index + 20).subtotal,
            vat_total: buildTotals(index + 20).vatTotal,
            irpf_rate: 0,
            irpf_amount: 0,
            grand_total: buildTotals(index + 20).grandTotal,
            notes: `Albaran ${index}`,
            converted_invoice_id: null,
          },
        }),
      );
    }

    const firstRequest = await createLocalDocumentSignatureRequest({
      userId,
      documentId: quotes[0]!.id,
      documentType: "quote",
      requestKind: "quote_acceptance",
      publicToken: "office-quote-1",
      requestNote: "Firma presupuesto 1",
      requestedAt: "2026-03-20T08:00:00.000Z",
      expiresAt: "2026-04-20T08:00:00.000Z",
      evidence: {
        documentSnapshot: {
          hash: "hash-quote-1",
        },
      },
    });
    const secondRequest = await createLocalDocumentSignatureRequest({
      userId,
      documentId: quotes[1]!.id,
      documentType: "quote",
      requestKind: "quote_acceptance",
      publicToken: "office-quote-2",
      requestNote: "Firma presupuesto 2",
      requestedAt: "2026-03-20T09:00:00.000Z",
      expiresAt: "2026-04-20T09:00:00.000Z",
      evidence: {
        documentSnapshot: {
          hash: "hash-quote-2",
        },
      },
    });
    await createLocalDocumentSignatureRequest({
      userId,
      documentId: deliveryNotes[0]!.id,
      documentType: "delivery_note",
      requestKind: "delivery_note_signature",
      publicToken: "office-delivery-1",
      requestNote: "Firma albaran 1",
      requestedAt: "2026-03-20T10:00:00.000Z",
      expiresAt: "2026-04-20T10:00:00.000Z",
      evidence: {
        documentSnapshot: {
          hash: "hash-delivery-1",
        },
      },
    });

    await respondToLocalDocumentSignatureRequest({
      token: firstRequest.public_token,
      status: "signed",
      signerName: "Cliente 1 S.L.",
      signerEmail: "cliente1@despacho.test",
      signerNif: "B70000001",
      signerMessage: "Aceptado",
      acceptedTerms: true,
      forwardedFor: "127.0.0.1",
      userAgent: "Vitest",
    });
    await respondToLocalDocumentSignatureRequest({
      token: secondRequest.public_token,
      status: "signed",
      signerName: "Cliente 2 S.L.",
      signerEmail: "cliente2@despacho.test",
      signerNif: "B70000002",
      signerMessage: "Aceptado",
      acceptedTerms: true,
      forwardedFor: "127.0.0.1",
      userAgent: "Vitest",
    });

    const firstInvoice = await createLocalInvoiceRecord({
      userId,
      payload: {
        issueDate: "2026-03-20",
        dueDate: "2026-03-30",
        issuerName: "Asesoria Sierra Fiscal",
        issuerNif: "B12345678",
        issuerAddress: "Gran Via 10, Madrid",
        clientName: quotes[0]!.client_name,
        clientNif: quotes[0]!.client_nif,
        clientAddress: quotes[0]!.client_address,
        clientEmail: quotes[0]!.client_email,
      },
      lineItems: quotes[0]!.line_items,
      totals: {
        subtotal: Number(quotes[0]!.subtotal),
        vatTotal: Number(quotes[0]!.vat_total),
        irpfRate: Number(quotes[0]!.irpf_rate),
        irpfAmount: Number(quotes[0]!.irpf_amount),
        grandTotal: Number(quotes[0]!.grand_total),
        vatBreakdown: quotes[0]!.vat_breakdown,
      },
      issuerLogoUrl: quotes[0]!.issuer_logo_url,
    });
    const secondInvoice = await createLocalInvoiceRecord({
      userId,
      payload: {
        issueDate: "2026-03-21",
        dueDate: "2026-03-31",
        issuerName: "Asesoria Sierra Fiscal",
        issuerNif: "B12345678",
        issuerAddress: "Gran Via 10, Madrid",
        clientName: quotes[1]!.client_name,
        clientNif: quotes[1]!.client_nif,
        clientAddress: quotes[1]!.client_address,
        clientEmail: quotes[1]!.client_email,
      },
      lineItems: quotes[1]!.line_items,
      totals: {
        subtotal: Number(quotes[1]!.subtotal),
        vatTotal: Number(quotes[1]!.vat_total),
        irpfRate: Number(quotes[1]!.irpf_rate),
        irpfAmount: Number(quotes[1]!.irpf_amount),
        grandTotal: Number(quotes[1]!.grand_total),
        vatBreakdown: quotes[1]!.vat_breakdown,
      },
      issuerLogoUrl: quotes[1]!.issuer_logo_url,
    });

    await linkLocalCommercialDocumentToInvoice({
      userId,
      documentId: quotes[0]!.id,
      invoiceId: firstInvoice.id,
    });
    await linkLocalCommercialDocumentToInvoice({
      userId,
      documentId: quotes[1]!.id,
      invoiceId: secondInvoice.id,
    });
    await updateLocalInvoicePaymentState(userId, firstInvoice.id, "mark_paid");
    await recordLocalInvoiceReminder({
      userId,
      invoiceId: secondInvoice.id,
      recipientEmail: secondInvoice.client_email,
      subject: "Recordatorio despacho local",
      triggerMode: "batch",
      batchKey: "overdue_due",
    });

    for (let index = 1; index <= 4; index += 1) {
      await createLocalFeedbackEntry({
        userId,
        sourceType: "pilot",
        moduleKey: index % 2 === 0 ? "cobros" : "clientes",
        severity: index % 2 === 0 ? "high" : "medium",
        title: `Feedback ${index}`,
        message: `Incidencia ${index}`,
        reporterName: "Asesoria Sierra Fiscal",
        contactEmail: email,
      });
    }

    const snapshotBeforeBackup = await getLocalCoreSnapshot();
    const backup = await exportBackupForUser(userId, email);

    expect(snapshotBeforeBackup.clients).toHaveLength(15);
    expect(snapshotBeforeBackup.expenses).toHaveLength(12);
    expect(snapshotBeforeBackup.commercialDocuments).toHaveLength(9);
    expect(snapshotBeforeBackup.documentSignatureRequests).toHaveLength(3);
    expect(snapshotBeforeBackup.invoices).toHaveLength(2);
    expect(snapshotBeforeBackup.invoiceReminders).toHaveLength(1);
    expect(snapshotBeforeBackup.feedbackEntries).toHaveLength(4);
    expect(snapshotBeforeBackup.commercialDocuments.filter((item) => item.document_type === "quote")).toHaveLength(6);
    expect(snapshotBeforeBackup.commercialDocuments.filter((item) => item.status === "converted")).toHaveLength(2);
    expect(snapshotBeforeBackup.invoices.find((item) => item.id === firstInvoice.id)?.payment_status).toBe("paid");

    const restoreDir = await mkdtemp(path.join(os.tmpdir(), "facturaia-local-office-restore-"));

    try {
      process.env.FACTURAIA_DATA_DIR = restoreDir;
      await restoreBackupForUser(userId, email, backup);

      const restoredSnapshot = await getLocalCoreSnapshot();

      expect(restoredSnapshot.clients).toHaveLength(15);
      expect(restoredSnapshot.expenses).toHaveLength(12);
      expect(restoredSnapshot.commercialDocuments).toHaveLength(9);
      expect(restoredSnapshot.documentSignatureRequests).toHaveLength(3);
      expect(restoredSnapshot.invoices).toHaveLength(2);
      expect(restoredSnapshot.invoiceReminders).toHaveLength(1);
      expect(restoredSnapshot.feedbackEntries).toHaveLength(4);

      const nextQuote = await createLocalCommercialDocumentRecord({
        userId,
        input: {
          document_type: "quote",
          status: "draft",
          issue_date: "2026-03-25",
          valid_until: "2026-04-25",
          issuer_name: "Asesoria Sierra Fiscal",
          issuer_nif: "B12345678",
          issuer_address: "Gran Via 10, Madrid",
          issuer_logo_url: null,
          client_name: "Cliente 16 S.L.",
          client_nif: "B70000016",
          client_address: "Calle Cliente 16, Madrid",
          client_email: "cliente16@despacho.test",
          line_items: buildLineItems(16),
          vat_breakdown: buildTotals(16).vatBreakdown,
          subtotal: buildTotals(16).subtotal,
          vat_total: buildTotals(16).vatTotal,
          irpf_rate: 0,
          irpf_amount: 0,
          grand_total: buildTotals(16).grandTotal,
          notes: "Presupuesto tras restore",
          converted_invoice_id: null,
        },
      });
      const nextDeliveryNote = await createLocalCommercialDocumentRecord({
        userId,
        input: {
          document_type: "delivery_note",
          status: "draft",
          issue_date: "2026-03-26",
          valid_until: null,
          issuer_name: "Asesoria Sierra Fiscal",
          issuer_nif: "B12345678",
          issuer_address: "Gran Via 10, Madrid",
          issuer_logo_url: null,
          client_name: "Cliente 17 S.L.",
          client_nif: "B70000017",
          client_address: "Calle Cliente 17, Madrid",
          client_email: "cliente17@despacho.test",
          line_items: buildLineItems(17),
          vat_breakdown: buildTotals(17).vatBreakdown,
          subtotal: buildTotals(17).subtotal,
          vat_total: buildTotals(17).vatTotal,
          irpf_rate: 0,
          irpf_amount: 0,
          grand_total: buildTotals(17).grandTotal,
          notes: "Albaran tras restore",
          converted_invoice_id: null,
        },
      });
      const nextInvoice = await createLocalInvoiceRecord({
        userId,
        payload: {
          issueDate: "2026-03-27",
          dueDate: "2026-04-05",
          issuerName: "Asesoria Sierra Fiscal",
          issuerNif: "B12345678",
          issuerAddress: "Gran Via 10, Madrid",
          clientName: "Cliente 16 S.L.",
          clientNif: "B70000016",
          clientAddress: "Calle Cliente 16, Madrid",
          clientEmail: "cliente16@despacho.test",
        },
        lineItems: buildLineItems(16),
        totals: buildTotals(16),
        issuerLogoUrl: null,
      });

      expect(nextQuote.document_number).toBe(7);
      expect(nextDeliveryNote.document_number).toBe(4);
      expect(nextInvoice.invoice_number).toBe(3);
    } finally {
      await rm(restoreDir, { recursive: true, force: true });
      process.env.FACTURAIA_DATA_DIR = localDataDir;
    }
  });
});
