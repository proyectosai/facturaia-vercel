import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import {
  createLocalExpenseRecord,
  createLocalBankMovementRecords,
  createLocalCommercialDocumentRecord,
  createLocalDocumentSignatureRequest,
  createLocalInvoiceRecord,
  getLocalSecurityReadiness,
  listLocalAuditEventsForUser,
  reconcileLocalBankMovement,
  respondToLocalDocumentSignatureRequest,
  saveLocalClientRecord,
  syncLocalInvoicePaymentStatusFromBankMatches,
  toggleLocalExpenseReview,
  updateLocalInvoicePaymentState,
} from "@/lib/local-core";
import type { CommercialDocumentRecord } from "@/lib/types";

const userId = "user-audit-local";

function buildLineItems() {
  return [
    {
      description: "Servicio recurrente de asesoría fiscal",
      quantity: 1,
      unitPrice: 420,
      vatRate: 21 as const,
      lineBase: 420,
      vatAmount: 88.2,
      lineTotal: 508.2,
    },
  ];
}

function buildTotals() {
  return {
    subtotal: 420,
    vatTotal: 88.2,
    irpfRate: 0,
    irpfAmount: 0,
    grandTotal: 508.2,
    vatBreakdown: [
      {
        rate: 21 as const,
        taxableBase: 420,
        vatAmount: 88.2,
      },
    ],
  };
}

function buildCommercialDocumentInput(
  type: CommercialDocumentRecord["document_type"],
): Omit<
  CommercialDocumentRecord,
  "id" | "user_id" | "public_id" | "document_number" | "created_at" | "updated_at"
> {
  return {
    document_type: type,
    status: "draft",
    issue_date: "2026-03-21",
    valid_until: type === "quote" ? "2026-04-20" : null,
    issuer_name: "Despacho Norte",
    issuer_nif: "B12345678",
    issuer_address: "Gran Via 100, Madrid",
    issuer_logo_url: null,
    client_name: "Cliente Auditoría S.L.",
    client_nif: "B76543210",
    client_address: "Paseo de la Castellana 1, Madrid",
    client_email: "admin@clienteauditoria.es",
    line_items: buildLineItems(),
    vat_breakdown: buildTotals().vatBreakdown,
    subtotal: 420,
    vat_total: 88.2,
    irpf_rate: 0,
    irpf_amount: 0,
    grand_total: 508.2,
    notes: "Documento de QA",
    converted_invoice_id: null,
  };
}

let localDataDir = "";
let previousNodeEnv: string | undefined;

beforeEach(async () => {
  localDataDir = await mkdtemp(path.join(os.tmpdir(), "facturaia-local-audit-"));
  previousNodeEnv = process.env.NODE_ENV;
  process.env.FACTURAIA_LOCAL_MODE = "1";
  process.env.FACTURAIA_DATA_DIR = localDataDir;
  process.env.FACTURAIA_LOCAL_SESSION_SECRET = "audit-local-secret";
  Reflect.set(process.env, "NODE_ENV", "test");
  delete process.env.FACTURAIA_ENCRYPT_LOCAL_DATA;
  delete process.env.FACTURAIA_ENCRYPT_BACKUPS;
  delete process.env.FACTURAIA_ENCRYPTION_PASSPHRASE;
});

afterEach(async () => {
  Reflect.set(process.env, "NODE_ENV", previousNodeEnv);
  await rm(localDataDir, { recursive: true, force: true });
});

describe("local audit trail", () => {
  test("records invoice creation and manual collection changes", async () => {
    const invoice = await createLocalInvoiceRecord({
      userId,
      payload: {
        issueDate: "2026-03-21",
        dueDate: "2026-03-28",
        issuerName: "Despacho Norte",
        issuerNif: "B12345678",
        issuerAddress: "Gran Via 100, Madrid",
        clientName: "Cliente Auditoría S.L.",
        clientNif: "B76543210",
        clientAddress: "Paseo de la Castellana 1, Madrid",
        clientEmail: "admin@clienteauditoria.es",
      },
      lineItems: buildLineItems(),
      totals: buildTotals(),
      issuerLogoUrl: null,
    });

    await updateLocalInvoicePaymentState(userId, invoice.id, "mark_paid");
    await updateLocalInvoicePaymentState(userId, invoice.id, "reopen");

    const events = await listLocalAuditEventsForUser(userId, 50);
    const created = events.find((event) => event.action === "invoice_created");
    const markedPaid = events.find((event) => event.action === "invoice_payment_marked_paid");
    const reopened = events.find((event) => event.action === "invoice_payment_reopened");

    expect(created?.entity_id).toBe(invoice.id);
    expect(created?.after_json).toMatchObject({
      invoiceNumber: invoice.invoice_number,
      paymentStatus: "pending",
    });
    expect(markedPaid?.before_json).toMatchObject({
      paymentStatus: "pending",
    });
    expect(markedPaid?.after_json).toMatchObject({
      paymentStatus: "paid",
    });
    expect(reopened?.after_json).toMatchObject({
      paymentStatus: "pending",
      amountPaid: 0,
    });
  });

  test("records crm and expense state changes", async () => {
    const client = await saveLocalClientRecord({
      userId,
      relationKind: "client",
      status: "active",
      priority: "high",
      displayName: "Cliente QA S.L.",
      firstName: "Cliente",
      lastName: "QA",
      companyName: "Cliente QA S.L.",
      email: "facturas@clienteqa.es",
      phone: "600111222",
      nif: "B99887766",
      address: "Calle Serrano 10, Madrid",
      notes: "Cliente piloto",
      tags: ["piloto", "fiscal"],
    });

    await saveLocalClientRecord({
      userId,
      clientId: client.id,
      relationKind: "mixed",
      status: "paused",
      priority: "medium",
      displayName: "Cliente QA Holding",
      firstName: "Cliente",
      lastName: "QA",
      companyName: "Cliente QA Holding",
      email: "direccion@clienteqa.es",
      phone: "600111333",
      nif: "B99887766",
      address: "Calle Serrano 10, Madrid",
      notes: "Actualizado para QA",
      tags: ["holding"],
    });

    const expense = await createLocalExpenseRecord({
      userId,
      expenseKind: "supplier_invoice",
      reviewStatus: "draft",
      vendorName: "Proveedor QA S.L.",
      vendorNif: "B55443322",
      expenseDate: "2026-03-20",
      currency: "EUR",
      baseAmount: 100,
      vatAmount: 21,
      totalAmount: 121,
      notes: "Gasto de prueba",
      sourceFileName: "proveedor-qa.pdf",
      sourceFilePath: "/tmp/proveedor-qa.pdf",
      sourceFileMimeType: "application/pdf",
      extractionMethod: "pdf_text",
      rawText: "Factura proveedor QA",
      extractedPayload: {
        total: 121,
      },
    });

    await toggleLocalExpenseReview(userId, expense.id);
    await toggleLocalExpenseReview(userId, expense.id);

    const events = await listLocalAuditEventsForUser(userId, 50);

    expect(events.find((event) => event.action === "client_created")?.after_json).toMatchObject({
      displayName: "Cliente QA S.L.",
      status: "active",
    });
    expect(events.find((event) => event.action === "client_updated")?.after_json).toMatchObject({
      displayName: "Cliente QA Holding",
      status: "paused",
      relationKind: "mixed",
    });
    expect(events.find((event) => event.action === "expense_created")?.after_json).toMatchObject({
      vendorName: "Proveedor QA S.L.",
      reviewStatus: "draft",
    });
    expect(
      events.find((event) => event.action === "expense_marked_reviewed")?.after_json,
    ).toMatchObject({
      reviewStatus: "reviewed",
    });
    expect(events.find((event) => event.action === "expense_reopened")?.after_json).toMatchObject(
      {
        reviewStatus: "draft",
      },
    );
  });

  test("records signature and banking audit events with context", async () => {
    const quote = await createLocalCommercialDocumentRecord({
      userId,
      input: buildCommercialDocumentInput("quote"),
    });
    const request = await createLocalDocumentSignatureRequest({
      userId,
      documentId: quote.id,
      documentType: "quote",
      requestKind: "quote_acceptance",
      publicToken: "token-audit-signature",
      requestNote: "Firma de QA",
      requestedAt: "2026-03-21T09:00:00.000Z",
      expiresAt: "2026-04-21T09:00:00.000Z",
      evidence: {
        documentSnapshot: {
          hash: "hash-audit",
        },
      },
    });

    await respondToLocalDocumentSignatureRequest({
      token: request.public_token,
      status: "signed",
      signerName: "Cliente Auditoría S.L.",
      signerEmail: "admin@clienteauditoria.es",
      signerNif: "B76543210",
      signerMessage: "Aceptado",
      acceptedTerms: true,
      forwardedFor: "127.0.0.1",
      userAgent: "Vitest",
    });

    const invoice = await createLocalInvoiceRecord({
      userId,
      payload: {
        issueDate: "2026-03-21",
        dueDate: "2026-03-28",
        issuerName: "Despacho Norte",
        issuerNif: "B12345678",
        issuerAddress: "Gran Via 100, Madrid",
        clientName: "Cliente Auditoría S.L.",
        clientNif: "B76543210",
        clientAddress: "Paseo de la Castellana 1, Madrid",
        clientEmail: "admin@clienteauditoria.es",
      },
      lineItems: buildLineItems(),
      totals: buildTotals(),
      issuerLogoUrl: null,
    });

    const [movement] = await createLocalBankMovementRecords({
      userId,
      rows: [
        {
          accountLabel: "Cuenta principal",
          bookingDate: "2026-03-25",
          valueDate: "2026-03-25",
          description: "Cobro factura Cliente Auditoría",
          counterpartyName: "Cliente Auditoría S.L.",
          amount: 508.2,
          currency: "EUR",
          direction: "credit",
          balance: 1200,
          sourceFileName: "movimientos-marzo.csv",
          sourceHash: "hash-movimiento-1",
          rawRow: {
            row: 1,
          },
        },
      ],
    });

    await reconcileLocalBankMovement({
      userId,
      movementId: movement.id,
      actionKind: "match_invoice",
      targetId: invoice.id,
      notes: "Conciliado en QA",
    });
    await syncLocalInvoicePaymentStatusFromBankMatches(userId, [invoice.id]);

    const events = await listLocalAuditEventsForUser(userId, 100);

    expect(events.some((event) => event.action === "signature_request_created")).toBe(true);
    expect(events.some((event) => event.action === "signature_request_signed")).toBe(true);
    expect(events.some((event) => event.action === "bank_movements_imported")).toBe(true);
    expect(events.some((event) => event.action === "bank_movement_match_invoice")).toBe(true);

    const syncedFromBank = events.find(
      (event) => event.action === "invoice_payment_synced_from_banking",
    );

    expect(syncedFromBank?.after_json).toMatchObject({
      paymentStatus: "paid",
      amountPaid: 508.2,
    });
    expect(syncedFromBank?.actor_type).toBe("system");
  });

  test("reports missing passphrase when local encryption is requested in production", () => {
    Reflect.set(process.env, "NODE_ENV", "production");
    process.env.FACTURAIA_ENCRYPT_LOCAL_DATA = "1";
    delete process.env.FACTURAIA_ENCRYPTION_PASSPHRASE;

    const readiness = getLocalSecurityReadiness();

    expect(readiness.ready).toBe(false);
    expect(readiness.issues.some((issue) => issue.includes("FACTURAIA_ENCRYPTION_PASSPHRASE"))).toBe(
      true,
    );
  });
});
