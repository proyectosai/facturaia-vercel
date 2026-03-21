import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import {
  createLocalFeedbackEntry,
  createLocalCommercialDocumentRecord,
  createLocalDocumentSignatureRequest,
  createLocalExpenseRecord,
  createLocalInvoiceRecord,
  getLocalCoreSnapshot,
  listLocalFeedbackEntriesForUser,
  getLocalPublicSignatureRequestByToken,
  linkLocalCommercialDocumentToInvoice,
  markLocalSignatureRequestViewed,
  recordLocalInvoiceReminder,
  replaceLocalUserData,
  respondToLocalDocumentSignatureRequest,
  saveLocalClientRecord,
  toggleLocalExpenseReview,
  updateLocalFeedbackStatus,
  updateLocalInvoicePaymentState,
} from "@/lib/local-core";
import { getLegacyLocalJsonFilePath, getLocalDatabaseFilePath } from "@/lib/local-db";
import type {
  CommercialDocumentRecord,
  InvoiceRecord,
  Profile,
} from "@/lib/types";

const userId = "user-local-qa";
const userEmail = "asesor@despacho.local";

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

function buildCommercialDocumentInput(
  type: CommercialDocumentRecord["document_type"],
) {
  return {
    document_type: type,
    status: "draft" as const,
    issue_date: "2026-03-20",
    valid_until: type === "quote" ? "2026-04-19" : null,
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
    notes: `Documento ${type}`,
    converted_invoice_id: null,
  };
}

function buildRestoredInvoice(invoiceNumber: number): InvoiceRecord {
  return {
    id: `invoice-${invoiceNumber}`,
    user_id: userId,
    public_id: `public-${invoiceNumber}`,
    invoice_number: invoiceNumber,
    issue_date: "2026-03-20",
    due_date: "2026-03-20",
    issuer_name: "Asesoria Martin Fiscal",
    issuer_nif: "B12345678",
    issuer_address: "Calle Alcala 100, Madrid",
    issuer_logo_url: null,
    client_name: "Empresa Norte S.L.",
    client_nif: "B76543210",
    client_address: "Avenida de Europa 15, Pozuelo",
    client_email: "admin@empresanorte.es",
    line_items: buildLineItems(),
    subtotal: 350,
    vat_total: 73.5,
    irpf_rate: 0,
    irpf_amount: 0,
    grand_total: 423.5,
    amount_paid: 0,
    payment_status: "pending",
    paid_at: null,
    last_reminder_at: null,
    reminder_count: 0,
    collection_notes: null,
    vat_breakdown: buildTotals().vatBreakdown,
    created_at: "2026-03-20T08:00:00.000Z",
    updated_at: "2026-03-20T08:00:00.000Z",
  };
}

let localDataDir = "";

beforeEach(async () => {
  localDataDir = await mkdtemp(path.join(os.tmpdir(), "facturaia-local-core-"));
  process.env.FACTURAIA_DATA_DIR = localDataDir;
  process.env.FACTURAIA_LOCAL_SESSION_SECRET = "test-local-secret";
});

afterEach(async () => {
  await rm(localDataDir, { recursive: true, force: true });
});

describe("local core persistence", () => {
  test("stores and updates local client records", async () => {
    const created = await saveLocalClientRecord({
      userId,
      relationKind: "client",
      status: "lead",
      priority: "medium",
      displayName: "Empresa Norte S.L.",
      firstName: null,
      lastName: null,
      companyName: "Empresa Norte S.L.",
      email: "admin@empresanorte.es",
      phone: "+34 600111222",
      nif: "B76543210",
      address: null,
      notes: "Cliente inicial",
      tags: ["local", "qa"],
    });

    const updated = await saveLocalClientRecord({
      userId,
      clientId: created.id,
      relationKind: "mixed",
      status: "active",
      priority: "high",
      displayName: "Empresa Norte S.L.",
      firstName: null,
      lastName: null,
      companyName: "Empresa Norte S.L.",
      email: "facturacion@empresanorte.es",
      phone: "+34 600111222",
      nif: "B76543210",
      address: "Avenida de Europa 15, Pozuelo",
      notes: "Cliente actualizado",
      tags: ["vip"],
    });

    const snapshot = await getLocalCoreSnapshot();

    expect(snapshot.clients).toHaveLength(1);
    expect(updated.status).toBe("active");
    expect(updated.priority).toBe("high");
    expect(snapshot.clients[0]?.email).toBe("facturacion@empresanorte.es");
    expect(snapshot.clients[0]?.tags).toEqual(["vip"]);
  });

  test("stores expenses and toggles their review state", async () => {
    const expense = await createLocalExpenseRecord({
      userId,
      expenseKind: "supplier_invoice",
      reviewStatus: "draft",
      vendorName: "Gestoria Externa SL",
      vendorNif: "B11223344",
      expenseDate: "2026-03-15",
      currency: "EUR",
      baseAmount: 100,
      vatAmount: 21,
      totalAmount: 121,
      notes: "Factura proveedor",
      sourceFileName: "factura.txt",
      sourceFilePath: "data:text/plain;base64,ZmFrZQ==",
      sourceFileMimeType: "text/plain",
      extractionMethod: "manual",
      rawText: "Proveedor: Gestoria Externa SL",
      extractedPayload: {
        confidence: 1,
      },
    });

    const reviewed = await toggleLocalExpenseReview(userId, expense.id);
    const reopened = await toggleLocalExpenseReview(userId, expense.id);
    const snapshot = await getLocalCoreSnapshot();

    expect(reviewed?.review_status).toBe("reviewed");
    expect(reopened?.review_status).toBe("draft");
    expect(snapshot.expenses).toHaveLength(1);
    expect(snapshot.expenses[0]?.vendor_name).toBe("Gestoria Externa SL");
  });

  test("stores feedback entries locally and updates their status", async () => {
    const created = await createLocalFeedbackEntry({
      userId,
      sourceType: "pilot",
      moduleKey: "feedback",
      severity: "high",
      title: "Error en bandeja local",
      message: "La pestaña feedback no debe depender de Supabase en modo local.",
      reporterName: "Asesoria Martin Fiscal",
      contactEmail: "asesor@despacho.local",
    });

    const updated = await updateLocalFeedbackStatus(userId, created.id, "planned");
    const entries = await listLocalFeedbackEntriesForUser(userId);
    const snapshot = await getLocalCoreSnapshot();

    expect(updated?.status).toBe("planned");
    expect(entries).toHaveLength(1);
    expect(entries[0]?.title).toBe("Error en bandeja local");
    expect(snapshot.feedbackEntries[0]?.contact_email).toBe("asesor@despacho.local");
  });

  test("uses separate counters for quotes and delivery notes", async () => {
    const quoteA = await createLocalCommercialDocumentRecord({
      userId,
      input: buildCommercialDocumentInput("quote"),
    });
    const delivery = await createLocalCommercialDocumentRecord({
      userId,
      input: buildCommercialDocumentInput("delivery_note"),
    });
    const quoteB = await createLocalCommercialDocumentRecord({
      userId,
      input: buildCommercialDocumentInput("quote"),
    });

    expect(quoteA.document_number).toBe(1);
    expect(delivery.document_number).toBe(1);
    expect(quoteB.document_number).toBe(2);
  });

  test("tracks signature lifecycle and updates quote status after acceptance", async () => {
    const document = await createLocalCommercialDocumentRecord({
      userId,
      input: buildCommercialDocumentInput("quote"),
    });

    const request = await createLocalDocumentSignatureRequest({
      userId,
      documentId: document.id,
      documentType: "quote",
      requestKind: "quote_acceptance",
      publicToken: "token-qa-signature",
      requestNote: "Revisa este presupuesto",
      requestedAt: "2026-03-20T10:00:00.000Z",
      expiresAt: "2026-04-19T23:59:59.000Z",
      evidence: {
        documentSnapshot: {
          hash: "abc123",
        },
      },
    });

    await markLocalSignatureRequestViewed(request.public_token);
    const responded = await respondToLocalDocumentSignatureRequest({
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

    const publicRequest = await getLocalPublicSignatureRequestByToken(request.public_token);
    const snapshot = await getLocalCoreSnapshot();

    expect(publicRequest?.viewed_at).toBeTruthy();
    expect(responded?.status).toBe("signed");
    expect(responded?.signer_name).toBe("Empresa Norte S.L.");
    expect(snapshot.documentSignatureRequests).toHaveLength(1);
    expect(snapshot.commercialDocuments[0]?.status).toBe("accepted");
  });

  test("converts accepted quote to invoice and keeps payment/reminder state", async () => {
    const document = await createLocalCommercialDocumentRecord({
      userId,
      input: {
        ...buildCommercialDocumentInput("quote"),
        status: "accepted",
      },
    });
    const invoice = await createLocalInvoiceRecord({
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

    await linkLocalCommercialDocumentToInvoice({
      userId,
      documentId: document.id,
      invoiceId: invoice.id,
    });
    await updateLocalInvoicePaymentState(userId, invoice.id, "mark_paid");
    await recordLocalInvoiceReminder({
      userId,
      invoiceId: invoice.id,
      recipientEmail: "admin@empresanorte.es",
      subject: "Recordatorio de pago",
      triggerMode: "manual",
      batchKey: null,
    });
    await updateLocalInvoicePaymentState(userId, invoice.id, "reopen");

    const snapshot = await getLocalCoreSnapshot();
    const storedInvoice = snapshot.invoices[0];
    const storedDocument = snapshot.commercialDocuments[0];

    expect(snapshot.invoices).toHaveLength(1);
    expect(snapshot.invoiceReminders).toHaveLength(1);
    expect(storedDocument?.status).toBe("converted");
    expect(storedDocument?.converted_invoice_id).toBe(invoice.id);
    expect(storedInvoice?.payment_status).toBe("pending");
    expect(storedInvoice?.reminder_count).toBe(1);
    expect(storedInvoice?.last_reminder_at).toBeTruthy();
  });

  test("recalculates counters after restoring local user data", async () => {
    const profile: Profile = {
      id: userId,
      email: userEmail,
      full_name: "Asesoria Martin Fiscal",
      nif: "B12345678",
      address: "Calle Alcala 100, Madrid",
      logo_path: null,
      logo_url: null,
      created_at: "2026-03-20T08:00:00.000Z",
      updated_at: "2026-03-20T08:00:00.000Z",
    };

    await replaceLocalUserData({
      userId,
      email: userEmail,
      profile,
      clients: [],
      feedbackEntries: [],
      auditEvents: [],
      invoices: [buildRestoredInvoice(7)],
      invoiceReminders: [],
      bankMovements: [],
      messageConnections: [],
      messageThreads: [],
      messageRecords: [],
      mailThreads: [],
      mailMessages: [],
      mailSyncRuns: [],
      commercialDocuments: [
        {
          ...buildCommercialDocumentInput("quote"),
          id: "quote-restored",
          user_id: userId,
          public_id: "quote-public",
          document_number: 4,
          created_at: "2026-03-20T08:00:00.000Z",
          updated_at: "2026-03-20T08:00:00.000Z",
        },
        {
          ...buildCommercialDocumentInput("delivery_note"),
          id: "delivery-restored",
          user_id: userId,
          public_id: "delivery-public",
          document_number: 2,
          created_at: "2026-03-20T08:00:00.000Z",
          updated_at: "2026-03-20T08:00:00.000Z",
        },
      ],
      documentSignatureRequests: [],
      expenses: [],
      aiUsage: [],
    });

    const nextInvoice = await createLocalInvoiceRecord({
      userId,
      payload: {
        issueDate: "2026-03-21",
        dueDate: "2026-03-21",
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
    const nextQuote = await createLocalCommercialDocumentRecord({
      userId,
      input: buildCommercialDocumentInput("quote"),
    });
    const nextDelivery = await createLocalCommercialDocumentRecord({
      userId,
      input: buildCommercialDocumentInput("delivery_note"),
    });

    expect(nextInvoice.invoice_number).toBe(8);
    expect(nextQuote.document_number).toBe(5);
    expect(nextDelivery.document_number).toBe(3);
  });

  test("migrates legacy core.json into SQLite automatically", async () => {
    const legacyPayload = {
      version: 1,
      users: [],
      profiles: [],
      clients: [
        {
          id: "legacy-client",
          user_id: userId,
          relation_kind: "client",
          status: "active",
          priority: "medium",
          display_name: "Cliente legado S.L.",
          first_name: null,
          last_name: null,
          company_name: "Cliente legado S.L.",
          email: "hola@legado.es",
          phone: null,
          nif: "B76543210",
          address: null,
          notes: null,
          tags: [],
          created_at: "2026-03-20T08:00:00.000Z",
          updated_at: "2026-03-20T08:00:00.000Z",
        },
      ],
      feedbackEntries: [],
      invoices: [],
      invoiceReminders: [],
      bankMovements: [],
      messageConnections: [],
      messageThreads: [],
      messageRecords: [],
      mailThreads: [],
      mailMessages: [],
      mailSyncRuns: [],
      commercialDocuments: [],
      documentSignatureRequests: [],
      expenses: [],
      aiUsage: [],
      counters: {
        invoice_number: 0,
        quote_number: 0,
        delivery_note_number: 0,
      },
    };

    await writeFile(
      getLegacyLocalJsonFilePath(),
      JSON.stringify(legacyPayload, null, 2),
      "utf8",
    );

    const snapshot = await getLocalCoreSnapshot();

    expect(snapshot.clients).toHaveLength(1);
    expect(snapshot.clients[0]?.display_name).toBe("Cliente legado S.L.");

    const sqliteBuffer = await readFile(getLocalDatabaseFilePath());
    expect(sqliteBuffer.toString("utf8")).toContain("SQLite format 3");
  });
});
