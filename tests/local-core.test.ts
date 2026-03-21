import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import {
  authenticateLocalUser,
  createLocalFeedbackEntry,
  createLocalCommercialDocumentRecord,
  createLocalDocumentSignatureRequest,
  createLocalExpenseRecord,
  createLocalInvoiceRecord,
  ensureInitialLocalUser,
  getLocalClientById,
  getLocalCoreSnapshot,
  getLocalInvoiceById,
  getLocalInvoiceByPublicId,
  incrementLocalDailyAiUsage,
  listLocalClientsForUser,
  listLocalFeedbackEntriesForUser,
  listLocalInvoicesForUser,
  listLocalInvoiceRemindersForUser,
  getLocalPublicSignatureRequestByToken,
  linkLocalCommercialDocumentToInvoice,
  markLocalSignatureRequestViewed,
  recordLocalAuditEvent,
  recordLocalInvoiceReminder,
  replaceLocalUserData,
  respondToLocalDocumentSignatureRequest,
  saveLocalClientRecord,
  toggleLocalExpenseReview,
  updateLocalInvoicePaymentStates,
  updateLocalFeedbackStatus,
  updateLocalInvoicePaymentState,
} from "@/lib/local-core";
import {
  getLegacyLocalJsonFilePath,
  getStructuredLocalDailyAiUsage,
  getStructuredLocalMonthlyInvoiceUsage,
  listStructuredLocalAuditEventsForUser,
  getLocalDatabaseFilePath,
  inspectLocalStructuredMirror,
  readLocalStateText,
  writeLocalStateText,
} from "@/lib/local-db";
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

  test("serves audit and usage reads from the structured mirror", async () => {
    await createLocalInvoiceRecord({
      userId,
      payload: {
        issueDate: "2026-03-20",
        dueDate: "2026-03-27",
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

    await incrementLocalDailyAiUsage(userId, "2026-03-20", null);
    await recordLocalAuditEvent({
      userId,
      actorType: "user",
      actorId: userId,
      source: "system",
      action: "mirror_probe",
      entityType: "qa",
      entityId: "mirror",
      afterJson: {
        ok: true,
      },
    });

    const monthlyInvoices = await getStructuredLocalMonthlyInvoiceUsage(
      userId,
      "2026-03-01",
    );
    const dailyAiUsage = await getStructuredLocalDailyAiUsage(userId, "2026-03-20");
    const auditEvents = await listStructuredLocalAuditEventsForUser(userId, 10);

    expect(monthlyInvoices).toBe(1);
    expect(dailyAiUsage).toBe(1);
    expect(auditEvents?.some((event) => event.action === "mirror_probe")).toBe(true);
  });

  test("keeps a relational SQLite mirror in sync with local snapshot writes", async () => {
    await saveLocalClientRecord({
      userId,
      relationKind: "client",
      status: "active",
      priority: "medium",
      displayName: "Empresa SQLite S.L.",
      firstName: null,
      lastName: null,
      companyName: "Empresa SQLite S.L.",
      email: "admin@sqlite.es",
      phone: "+34 600000000",
      nif: "B11111111",
      address: "Calle Mayor 1, Madrid",
      notes: "Cliente espejo",
      tags: ["sqlite"],
    });

    await createLocalInvoiceRecord({
      userId,
      payload: {
        issueDate: "2026-03-21",
        dueDate: "2026-03-28",
        issuerName: "Asesoria Martin Fiscal",
        issuerNif: "B12345678",
        issuerAddress: "Calle Alcala 100, Madrid",
        clientName: "Empresa SQLite S.L.",
        clientNif: "B11111111",
        clientAddress: "Calle Mayor 1, Madrid",
        clientEmail: "admin@sqlite.es",
      },
      lineItems: buildLineItems(),
      totals: buildTotals(),
      issuerLogoUrl: null,
    });

    const mirror = await inspectLocalStructuredMirror();

    expect(mirror.schemaVersion).toBe(1);
    expect(mirror.snapshotVersion).toBe(1);
    expect(mirror.lastSyncedAt).toBeTruthy();
    expect(mirror.counts.clients).toBe(1);
    expect(mirror.counts.invoices).toBe(1);
    expect(mirror.counts.counters).toBe(3);
  });

  test("serves client and invoice reads from the structured mirror", async () => {
    const client = await saveLocalClientRecord({
      userId,
      relationKind: "client",
      status: "active",
      priority: "high",
      displayName: "Empresa Mirror S.L.",
      firstName: null,
      lastName: null,
      companyName: "Empresa Mirror S.L.",
      email: "admin@mirror.es",
      phone: "+34 600222333",
      nif: "B88888888",
      address: "Calle Mirror 8, Madrid",
      notes: "Cliente servido desde SQLite",
      tags: ["mirror", "priority"],
    });

    const invoice = await createLocalInvoiceRecord({
      userId,
      payload: {
        issueDate: "2026-03-22",
        dueDate: "2026-03-29",
        issuerName: "Asesoria Martin Fiscal",
        issuerNif: "B12345678",
        issuerAddress: "Calle Alcala 100, Madrid",
        clientName: client.display_name,
        clientNif: client.nif ?? "",
        clientAddress: client.address ?? "",
        clientEmail: client.email ?? "",
      },
      lineItems: buildLineItems(),
      totals: buildTotals(),
      issuerLogoUrl: null,
    });

    const clients = await listLocalClientsForUser(userId);
    const invoices = await listLocalInvoicesForUser(userId);
    const byClientId = await getLocalClientById(userId, client.id);
    const byInvoiceId = await getLocalInvoiceById(userId, invoice.id);
    const byPublicId = await getLocalInvoiceByPublicId(invoice.public_id);

    expect(clients).toHaveLength(1);
    expect(clients[0]?.tags).toEqual(["mirror", "priority"]);
    expect(byClientId?.email).toBe("admin@mirror.es");
    expect(invoices).toHaveLength(1);
    expect(invoices[0]?.line_items[0]?.description).toContain("Servicio mensual");
    expect(byInvoiceId?.invoice_number).toBe(1);
    expect(byPublicId?.client_name).toBe("Empresa Mirror S.L.");
  });

  test("keeps invoice payment and reminder writes in sync through selective mirror updates", async () => {
    const invoice = await createLocalInvoiceRecord({
      userId,
      payload: {
        issueDate: "2026-03-23",
        dueDate: "2026-03-30",
        issuerName: "Asesoria Martin Fiscal",
        issuerNif: "B12345678",
        issuerAddress: "Calle Alcala 100, Madrid",
        clientName: "Empresa Cobros S.L.",
        clientNif: "B99999999",
        clientAddress: "Calle Cobros 9, Madrid",
        clientEmail: "admin@cobros.es",
      },
      lineItems: buildLineItems(),
      totals: buildTotals(),
      issuerLogoUrl: null,
    });

    const paid = await updateLocalInvoicePaymentState(userId, invoice.id, "mark_paid");
    const reopened = await updateLocalInvoicePaymentStates(userId, [invoice.id], "reopen");
    const reminder = await recordLocalInvoiceReminder({
      userId,
      invoiceId: invoice.id,
      recipientEmail: "admin@cobros.es",
      subject: "Recordatorio de vencimiento",
      triggerMode: "manual",
      batchKey: null,
    });

    const fromMirror = await getLocalInvoiceById(userId, invoice.id);
    const reminders = await listLocalInvoiceRemindersForUser(userId);
    const mirror = await inspectLocalStructuredMirror();

    expect(paid?.payment_status).toBe("paid");
    expect(reopened[0]?.payment_status).toBe("pending");
    expect(reminder?.invoice_id).toBe(invoice.id);
    expect(fromMirror?.payment_status).toBe("pending");
    expect(fromMirror?.reminder_count).toBe(1);
    expect(fromMirror?.last_reminder_at).toBeTruthy();
    expect(reminders).toHaveLength(1);
    expect(reminders[0]?.recipient_email).toBe("admin@cobros.es");
    expect(mirror.counts.invoices).toBe(1);
    expect(mirror.counts.invoiceReminders).toBe(1);
  });

  test("treats sqlite as the primary source for clients invoices reminders and counters", async () => {
    const client = await saveLocalClientRecord({
      userId,
      relationKind: "client",
      status: "active",
      priority: "medium",
      displayName: "Empresa Fuente Principal S.L.",
      firstName: null,
      lastName: null,
      companyName: "Empresa Fuente Principal S.L.",
      email: "admin@principal.es",
      phone: "+34 600444555",
      nif: "B77777777",
      address: "Calle Principal 1, Madrid",
      notes: "Cliente que debe sobrevivir al snapshot",
      tags: ["sqlite-primary"],
    });

    const invoice = await createLocalInvoiceRecord({
      userId,
      payload: {
        issueDate: "2026-03-24",
        dueDate: "2026-03-31",
        issuerName: "Asesoria Martin Fiscal",
        issuerNif: "B12345678",
        issuerAddress: "Calle Alcala 100, Madrid",
        clientName: client.display_name,
        clientNif: client.nif ?? "",
        clientAddress: client.address ?? "",
        clientEmail: client.email ?? "",
      },
      lineItems: buildLineItems(),
      totals: buildTotals(),
      issuerLogoUrl: null,
    });

    await recordLocalInvoiceReminder({
      userId,
      invoiceId: invoice.id,
      recipientEmail: "admin@principal.es",
      subject: "Recordatorio principal",
      triggerMode: "manual",
      batchKey: null,
    });

    const staleSnapshot = await getLocalCoreSnapshot();
    staleSnapshot.clients = [];
    staleSnapshot.invoices = [];
    staleSnapshot.invoiceReminders = [];
    staleSnapshot.auditEvents = [];
    staleSnapshot.counters.invoice_number = 0;

    await writeLocalStateText(
      JSON.stringify(staleSnapshot, null, 2),
      JSON.stringify(staleSnapshot, null, 2),
      { structuredMutation: {} },
    );

    const secondClient = await saveLocalClientRecord({
      userId,
      relationKind: "client",
      status: "active",
      priority: "high",
      displayName: "Empresa Segunda S.L.",
      firstName: null,
      lastName: null,
      companyName: "Empresa Segunda S.L.",
      email: "admin@segunda.es",
      phone: "+34 600888999",
      nif: "B66666666",
      address: "Calle Segunda 2, Madrid",
      notes: "Cliente creado con snapshot degradado",
      tags: ["sqlite-primary-2"],
    });

    const secondInvoice = await createLocalInvoiceRecord({
      userId,
      payload: {
        issueDate: "2026-03-25",
        dueDate: "2026-04-01",
        issuerName: "Asesoria Martin Fiscal",
        issuerNif: "B12345678",
        issuerAddress: "Calle Alcala 100, Madrid",
        clientName: secondClient.display_name,
        clientNif: secondClient.nif ?? "",
        clientAddress: secondClient.address ?? "",
        clientEmail: secondClient.email ?? "",
      },
      lineItems: buildLineItems(),
      totals: buildTotals(),
      issuerLogoUrl: null,
    });

    const recovered = await getLocalCoreSnapshot();

    expect(recovered.clients).toHaveLength(2);
    expect(recovered.invoices).toHaveLength(2);
    expect(recovered.invoiceReminders).toHaveLength(1);
    expect(recovered.auditEvents.length).toBeGreaterThan(0);
    expect(recovered.counters.invoice_number).toBe(2);
    expect(recovered.clients.some((entry) => entry.display_name === "Empresa Fuente Principal S.L.")).toBe(true);
    expect(recovered.clients.some((entry) => entry.display_name === "Empresa Segunda S.L.")).toBe(true);
    expect(recovered.invoices.some((entry) => entry.client_name === "Empresa Fuente Principal S.L.")).toBe(true);
    expect(recovered.invoices.some((entry) => entry.client_name === "Empresa Segunda S.L.")).toBe(true);
    expect(secondInvoice.invoice_number).toBe(2);
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

  test("keeps the compatibility snapshot aligned after sqlite-first mutations", async () => {
    const client = await saveLocalClientRecord({
      userId,
      relationKind: "client",
      status: "active",
      priority: "medium",
      displayName: "Empresa Snapshot S.L.",
      firstName: null,
      lastName: null,
      companyName: "Empresa Snapshot S.L.",
      email: "admin@snapshot.es",
      phone: null,
      nif: "B99887766",
      address: "Gran Via 1, Madrid",
      notes: "Cliente para snapshot compatible",
      tags: ["snapshot"],
    });

    const invoice = await createLocalInvoiceRecord({
      userId,
      payload: {
        issueDate: "2026-03-20",
        dueDate: "2026-03-27",
        issuerName: "Asesoria Martin Fiscal",
        issuerNif: "B12345678",
        issuerAddress: "Calle Alcala 100, Madrid",
        clientName: client.display_name,
        clientNif: client.nif ?? "",
        clientAddress: client.address ?? "",
        clientEmail: client.email ?? "",
      },
      lineItems: buildLineItems(),
      totals: buildTotals(),
      issuerLogoUrl: null,
    });

    const document = await createLocalCommercialDocumentRecord({
      userId,
      input: buildCommercialDocumentInput("quote"),
    });

    await incrementLocalDailyAiUsage(userId, "2026-03-22", null);

    const rawSnapshot = await readLocalStateText();
    expect(rawSnapshot).toBeTruthy();
    const parsed = JSON.parse(rawSnapshot ?? "{}") as {
      clients: Array<{ id: string }>;
      invoices: Array<{ id: string }>;
      commercialDocuments: Array<{ id: string }>;
      aiUsage: Array<{ user_id: string; date: string; calls_count: number }>;
      counters: {
        invoice_number: number;
        quote_number: number;
      };
    };

    expect(parsed.clients.some((entry) => entry.id === client.id)).toBe(true);
    expect(parsed.invoices.some((entry) => entry.id === invoice.id)).toBe(true);
    expect(parsed.commercialDocuments.some((entry) => entry.id === document.id)).toBe(true);
    expect(parsed.aiUsage).toContainEqual({
      user_id: userId,
      date: "2026-03-22",
      calls_count: 1,
    });
    expect(parsed.counters.invoice_number).toBeGreaterThanOrEqual(1);
    expect(parsed.counters.quote_number).toBeGreaterThanOrEqual(1);
  });

  test("recovers users, profiles, feedback and auth limits from sqlite when snapshot degrades", async () => {
    const bootstrappedUser = await ensureInitialLocalUser(
      userEmail,
      "ClaveSegura123",
    );

    await createLocalFeedbackEntry({
      userId: bootstrappedUser.id,
      sourceType: "pilot",
      moduleKey: "feedback",
      severity: "medium",
      title: "Feedback persistente",
      message: "Debe sobrevivir aunque el snapshot quede incompleto.",
      reporterName: "Asesoria Martin Fiscal",
      contactEmail: userEmail,
    });
    await createLocalExpenseRecord({
      userId: bootstrappedUser.id,
      expenseKind: "supplier_invoice",
      reviewStatus: "draft",
      vendorName: "Proveedor Persistente SL",
      vendorNif: "B12312312",
      expenseDate: "2026-03-21",
      currency: "EUR",
      baseAmount: 80,
      vatAmount: 16.8,
      totalAmount: 96.8,
      notes: "Debe sobrevivir al snapshot degradado.",
      sourceFileName: "proveedor.txt",
      sourceFilePath: "data:text/plain;base64,cHJ1ZWJh",
      sourceFileMimeType: "text/plain",
      extractionMethod: "manual",
      rawText: "Proveedor Persistente SL",
      extractedPayload: {
        confidence: 1,
      },
    });
    await incrementLocalDailyAiUsage(bootstrappedUser.id, "2026-03-21", null);

    const failedLogin = await authenticateLocalUser(
      userEmail,
      "ClaveIncorrecta123",
      {
        ipAddress: "127.0.0.1",
        userAgent: "Vitest",
      },
    );

    expect(failedLogin.status).toBe("invalid");

    const staleSnapshot = await getLocalCoreSnapshot();
    staleSnapshot.users = [];
    staleSnapshot.profiles = [];
    staleSnapshot.feedbackEntries = [];
    staleSnapshot.authRateLimits = [];
    staleSnapshot.auditEvents = [];
    staleSnapshot.expenses = [];
    staleSnapshot.aiUsage = [];

    await writeLocalStateText(
      JSON.stringify(staleSnapshot, null, 2),
      JSON.stringify(staleSnapshot, null, 2),
      { structuredMutation: {} },
    );

    const recovered = await getLocalCoreSnapshot();

    expect(recovered.users).toHaveLength(1);
    expect(recovered.users[0]?.email).toBe(userEmail);
    expect(recovered.profiles).toHaveLength(1);
    expect(recovered.profiles[0]?.id).toBe(bootstrappedUser.id);
    expect(recovered.feedbackEntries).toHaveLength(1);
    expect(recovered.feedbackEntries[0]?.title).toBe("Feedback persistente");
    expect(recovered.authRateLimits).toHaveLength(1);
    expect(recovered.authRateLimits[0]?.failed_attempts).toBe(1);
    expect(recovered.expenses).toHaveLength(1);
    expect(recovered.expenses[0]?.vendor_name).toBe("Proveedor Persistente SL");
    expect(recovered.aiUsage).toHaveLength(1);
    expect(recovered.aiUsage[0]).toMatchObject({
      user_id: bootstrappedUser.id,
      date: "2026-03-21",
      calls_count: 1,
    });
    expect(recovered.auditEvents.length).toBeGreaterThan(0);

    const dailyAiUsage = await getStructuredLocalDailyAiUsage(
      bootstrappedUser.id,
      "2026-03-21",
    );
    expect(dailyAiUsage).toBe(1);
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

  test("recovers commercial documents and signature requests from sqlite when snapshot degrades", async () => {
    const document = await createLocalCommercialDocumentRecord({
      userId,
      input: buildCommercialDocumentInput("quote"),
    });

    await createLocalDocumentSignatureRequest({
      userId,
      documentId: document.id,
      documentType: "quote",
      requestKind: "quote_acceptance",
      publicToken: "token-commercial-recovery",
      requestNote: "Revisa este presupuesto",
      requestedAt: "2026-03-20T10:00:00.000Z",
      expiresAt: "2026-04-19T23:59:59.000Z",
      evidence: {
        documentSnapshot: {
          hash: "abc123",
        },
      },
    });

    const staleSnapshot = await getLocalCoreSnapshot();
    staleSnapshot.commercialDocuments = [];
    staleSnapshot.documentSignatureRequests = [];
    staleSnapshot.counters.quote_number = 0;
    staleSnapshot.counters.delivery_note_number = 0;

    await writeLocalStateText(
      JSON.stringify(staleSnapshot, null, 2),
      JSON.stringify(staleSnapshot, null, 2),
      { structuredMutation: {} },
    );

    const recovered = await getLocalCoreSnapshot();
    const recoveredPublicRequest = await getLocalPublicSignatureRequestByToken(
      "token-commercial-recovery",
    );
    const nextQuote = await createLocalCommercialDocumentRecord({
      userId,
      input: buildCommercialDocumentInput("quote"),
    });

    expect(recovered.commercialDocuments).toHaveLength(1);
    expect(recovered.commercialDocuments[0]).toMatchObject({
      id: document.id,
      document_type: "quote",
      document_number: 1,
    });
    expect(recovered.documentSignatureRequests).toHaveLength(1);
    expect(recoveredPublicRequest?.document_id).toBe(document.id);
    expect(recoveredPublicRequest?.status).toBe("pending");
    expect(nextQuote.document_number).toBe(2);
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

    const staleSnapshot = await getLocalCoreSnapshot();
    staleSnapshot.clients = [];
    staleSnapshot.invoices = [];
    staleSnapshot.invoiceReminders = [];
    staleSnapshot.auditEvents = [];
    staleSnapshot.counters.invoice_number = 0;

    await writeLocalStateText(
      JSON.stringify(staleSnapshot, null, 2),
      JSON.stringify(staleSnapshot, null, 2),
      { structuredMutation: {} },
    );

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

    const mirror = await inspectLocalStructuredMirror();
    expect(mirror.counts.clients).toBe(1);
    expect(mirror.counts.profiles).toBe(0);
    expect(mirror.counts.counters).toBe(3);
  });
});
