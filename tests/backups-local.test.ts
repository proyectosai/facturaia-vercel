import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import type { InvoiceRecord } from "@/lib/types";
import {
  compareBackupContents,
  exportBackupForUser,
  inspectBackupPayload,
  parseBackupPayload,
  restoreBackupForUser,
  serializeBackupPayload,
} from "@/lib/backups";
import {
  writeLocalStateText,
} from "@/lib/local-db";
import {
  createStudyNoteForUser,
  listStudyDocumentsForUser,
} from "@/lib/document-study";
import {
  createLocalBankMovementRecords,
  createLocalCommercialDocumentRecord,
  createLocalDocumentSignatureRequest,
  createLocalExpenseRecord,
  createLocalFeedbackEntry,
  createLocalInvoiceRecord,
  getLocalCoreSnapshot,
  reconcileLocalBankMovement,
  recordLocalAuditEvent,
  recordLocalInvoiceReminder,
  respondToLocalDocumentSignatureRequest,
  saveLocalClientRecord,
  saveLocalProfile,
  syncLocalInvoicePaymentStatusFromBankMatches,
  updateLocalInvoicePaymentState,
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

function buildMassLineItems(index: number) {
  const base = 250 + index * 5;
  const vat = Number((base * 0.21).toFixed(2));

  return {
    lineItems: [
      {
        description: `Servicio recurrente empresa ${index}`,
        quantity: 1,
        unitPrice: base,
        vatRate: 21 as const,
        lineBase: base,
        vatAmount: vat,
        lineTotal: Number((base + vat).toFixed(2)),
      },
    ],
    totals: {
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
    },
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
  test("serializes local backups with manifest and checksum", async () => {
    await saveLocalProfile({
      userId,
      email,
      fullName: "Asesoria Martin Fiscal",
      nif: "B12345678",
      address: "Calle Alcala 100, Madrid",
      logoUrl: null,
    });

    await createLocalInvoiceRecord({
      userId,
      payload: {
        issueDate: "2026-03-20",
        dueDate: "2026-03-30",
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
    await recordLocalAuditEvent({
      userId,
      actorType: "user",
      actorId: userId,
      source: "auth",
      action: "local_login_succeeded",
      entityType: "session",
      entityId: userId,
      afterJson: {
        email,
      },
      contextJson: {
        ipAddress: "127.0.0.1",
      },
    });
    await createStudyNoteForUser({
      userId,
      title: "Notas cierre marzo",
      text:
        "Estas notas internas recuerdan que la factura de marzo debe revisarse junto con el vencimiento del cliente y la documentacion bancaria adjunta.",
    });

    const backup = await exportBackupForUser(userId, email);
    const serialized = serializeBackupPayload(backup);
    const inspected = inspectBackupPayload(serialized);

    expect(inspected.manifest.schemaVersion).toBe(1);
    expect(inspected.manifest.appVersion).toBeTruthy();
    expect(inspected.manifest.checksumAlgorithm).toBe("sha256");
    expect(inspected.manifest.modulesIncluded).toContain("core");
    expect(inspected.manifest.modulesIncluded).toContain("security");
    expect(inspected.manifest.modulesIncluded).toContain("document-study");
    expect(inspected.manifest.counts.auditEvents).toBe(backup.auditEvents.length);
    expect(inspected.manifest.counts.auditEvents).toBeGreaterThanOrEqual(3);
    expect(inspected.manifest.counts.invoices).toBe(1);
    expect(inspected.manifest.counts.studyDocuments).toBe(1);
    expect(inspected.checksum).toHaveLength(64);
    expect(parseBackupPayload(serialized).invoices).toHaveLength(1);
    expect(parseBackupPayload(serialized).studyDocuments).toHaveLength(1);
  });

  test("rejects tampered backup payloads", async () => {
    await createLocalInvoiceRecord({
      userId,
      payload: {
        issueDate: "2026-03-20",
        dueDate: "2026-03-30",
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
    const serialized = serializeBackupPayload(backup);
    const tampered = serialized.replace(
      "Empresa Norte S.L.",
      "Empresa Norte Manipulada S.L.",
    );

    expect(() => parseBackupPayload(tampered)).toThrow(
      /dañada|modificada/i,
    );
  });

  test("reports invoice state mismatches with semantic detail", async () => {
    await createLocalInvoiceRecord({
      userId,
      payload: {
        issueDate: "2026-03-20",
        dueDate: "2026-03-30",
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
    const changedInvoice = {
      ...backup,
      invoices: [
        {
          ...backup.invoices[0],
          payment_status: "paid" as const,
          amount_paid: 999,
          reminder_count: 3,
        },
      ],
    };

    const comparison = compareBackupContents(backup, changedInvoice);

    expect(comparison.matches).toBe(false);
    expect(comparison.mismatches.some((item) => item.field.endsWith(".payment_status"))).toBe(true);
    expect(comparison.mismatches.some((item) => item.field.endsWith(".amount_paid"))).toBe(true);
    expect(comparison.mismatches.some((item) => item.field.endsWith(".reminder_count"))).toBe(true);
  });

  test("exports commercial documents and signatures from sqlite when snapshot degrades", async () => {
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
        notes: "Documento local persistente",
        converted_invoice_id: null,
      },
    });

    await createLocalDocumentSignatureRequest({
      userId,
      documentId: document.id,
      documentType: "quote",
      requestKind: "quote_acceptance",
      publicToken: "backup-signature-token",
      requestNote: "Firma este presupuesto",
      requestedAt: "2026-03-20T10:00:00.000Z",
      expiresAt: "2026-04-19T23:59:59.000Z",
      evidence: {
        documentSnapshot: {
          hash: "backup-hash",
        },
      },
    });

    const staleSnapshot = await getLocalCoreSnapshot();
    staleSnapshot.commercialDocuments = [];
    staleSnapshot.documentSignatureRequests = [];

    await writeLocalStateText(
      JSON.stringify(staleSnapshot, null, 2),
      JSON.stringify(staleSnapshot, null, 2),
      { structuredMutation: {} },
    );

    const backup = await exportBackupForUser(userId, email);

    expect(backup.commercialDocuments).toHaveLength(1);
    expect(backup.commercialDocuments[0]?.id).toBe(document.id);
    expect(backup.documentSignatureRequests).toHaveLength(1);
    expect(backup.documentSignatureRequests[0]?.public_token).toBe(
      "backup-signature-token",
    );
  });

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
    await createStudyNoteForUser({
      userId,
      title: "Acta cliente Norte",
      text:
        "En la reunion con Empresa Norte se confirma que la aceptacion del presupuesto se hizo por correo y que el cobro debe revisarse antes del cierre trimestral.",
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
    await recordLocalAuditEvent({
      userId,
      actorType: "user",
      actorId: userId,
      source: "auth",
      action: "local_login_succeeded",
      entityType: "session",
      entityId: userId,
      afterJson: {
        email,
      },
      contextJson: {
        ipAddress: "127.0.0.1",
      },
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
    const envelope = inspectBackupPayload(serializeBackupPayload(backup));

    expect(backup.appUrl).toBe("http://127.0.0.1:3999");
    expect(envelope.manifest.counts.invoices).toBe(1);
    expect(envelope.manifest.counts.feedbackEntries).toBe(1);
    expect(envelope.manifest.counts.auditEvents).toBe(backup.auditEvents.length);
    expect(envelope.manifest.counts.auditEvents).toBeGreaterThanOrEqual(5);
    expect(envelope.manifest.modulesIncluded).toContain("crm");
    expect(envelope.manifest.modulesIncluded).toContain("commercial-documents");
    expect(envelope.manifest.modulesIncluded).toContain("document-study");
    expect(envelope.manifest.modulesIncluded).toContain("security");
    expect(backup.clients).toHaveLength(1);
    expect(backup.feedbackEntries).toHaveLength(1);
    expect(backup.expenses).toHaveLength(1);
    expect(backup.commercialDocuments).toHaveLength(1);
    expect(backup.documentSignatureRequests).toHaveLength(1);
    expect(backup.studyDocuments).toHaveLength(1);
    expect(backup.invoices).toHaveLength(1);

    const restoreDir = await mkdtemp(path.join(os.tmpdir(), "facturaia-backup-restore-"));

    try {
      process.env.FACTURAIA_DATA_DIR = restoreDir;
      await restoreBackupForUser(userId, email, backup);

      const restored = await getLocalCoreSnapshot();
      const restoredStudyDocuments = await listStudyDocumentsForUser(userId);
      const restoredUserAuditEvents = restored.auditEvents.filter((event) => event.user_id === userId);

      expect(restored.profiles).toHaveLength(1);
      expect(restored.clients).toHaveLength(1);
      expect(restored.feedbackEntries).toHaveLength(1);
      expect(restoredUserAuditEvents).toHaveLength(backup.auditEvents.length + 1);
      expect(
        restoredUserAuditEvents.some((event) => event.action === "backup_restore_completed"),
      ).toBe(true);
      expect(restored.expenses).toHaveLength(1);
      expect(restored.commercialDocuments).toHaveLength(1);
      expect(restored.documentSignatureRequests).toHaveLength(1);
      expect(restoredStudyDocuments).toHaveLength(1);
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

  test("supports disaster restore roundtrip with mass invoicing and banking continuity", async () => {
    await saveLocalProfile({
      userId,
      email,
      fullName: "Asesoria Martin Fiscal",
      nif: "B12345678",
      address: "Calle Alcala 100, Madrid",
      logoUrl: null,
    });

    for (let index = 1; index <= 3; index += 1) {
      await saveLocalClientRecord({
        userId,
        relationKind: "client",
        status: "active",
        priority: index === 1 ? "high" : "medium",
        displayName: `Empresa ${index} S.L.`,
        firstName: null,
        lastName: null,
        companyName: `Empresa ${index} S.L.`,
        email: `admin${index}@empresa.test`,
        phone: `+34 6000000${index}`,
        nif: `B76543${String(index).padStart(3, "0")}`,
        address: `Avenida Cliente ${index}, Madrid`,
        notes: "Cliente para prueba de desastre",
        tags: ["desastre", "local"],
      });
    }

    const invoices: InvoiceRecord[] = [];

    for (let index = 1; index <= 24; index += 1) {
      const { lineItems, totals } = buildMassLineItems(index);
      const created = await createLocalInvoiceRecord({
        userId,
        payload: {
          issueDate: `2026-04-${String(((index - 1) % 28) + 1).padStart(2, "0")}`,
          dueDate: `2026-05-${String(((index - 1) % 28) + 1).padStart(2, "0")}`,
          issuerName: "Asesoria Martin Fiscal",
          issuerNif: "B12345678",
          issuerAddress: "Calle Alcala 100, Madrid",
          clientName: `Empresa ${((index - 1) % 3) + 1} S.L.`,
          clientNif: `B76543${String(((index - 1) % 3) + 1).padStart(3, "0")}`,
          clientAddress: `Avenida Cliente ${((index - 1) % 3) + 1}, Madrid`,
          clientEmail: `admin${((index - 1) % 3) + 1}@empresa.test`,
        },
        lineItems,
        totals,
        issuerLogoUrl: null,
      });

      invoices.push(created);
    }

    await updateLocalInvoicePaymentState(userId, invoices[0]!.id, "mark_paid");
    await updateLocalInvoicePaymentState(userId, invoices[1]!.id, "mark_paid");
    await recordLocalInvoiceReminder({
      userId,
      invoiceId: invoices[2]!.id,
      recipientEmail: invoices[2]!.client_email,
      subject: "Recordatorio lote desastre",
      triggerMode: "batch",
      batchKey: "overdue_due",
    });

    const [movement] = await createLocalBankMovementRecords({
      userId,
      rows: [
        {
          accountLabel: "Cuenta principal",
          bookingDate: "2026-05-12",
          valueDate: "2026-05-12",
          description: "Transferencia cliente Empresa 3",
          counterpartyName: "Empresa 3 S.L.",
          amount: Number((buildMassLineItems(3).totals.grandTotal / 2).toFixed(2)),
          currency: "EUR",
          direction: "credit",
          balance: 8200,
          sourceFileName: "movimientos.csv",
          sourceHash: "desastre-mov-1",
          rawRow: {
            row: 1,
          },
        },
      ],
    });

    await reconcileLocalBankMovement({
      userId,
      movementId: movement!.id,
      actionKind: "match_invoice",
      targetId: invoices[2]!.id,
      notes: "Cobro parcial para prueba de desastre",
    });
    await syncLocalInvoicePaymentStatusFromBankMatches(userId, [invoices[2]!.id]);

    await createLocalExpenseRecord({
      userId,
      expenseKind: "supplier_invoice",
      reviewStatus: "reviewed",
      vendorName: "Proveedor Disaster S.L.",
      vendorNif: "B33445566",
      expenseDate: "2026-04-20",
      currency: "EUR",
      baseAmount: 180,
      vatAmount: 37.8,
      totalAmount: 217.8,
      notes: "Gasto para test de roundtrip",
      sourceFileName: "gasto-desastre.txt",
      sourceFilePath: "data:text/plain;base64,ZmFrZQ==",
      sourceFileMimeType: "text/plain",
      extractionMethod: "manual",
      rawText: "Factura proveedor disaster",
      extractedPayload: {
        confidence: 1,
      },
    });

    await createLocalFeedbackEntry({
      userId,
      sourceType: "pilot",
      moduleKey: "backups",
      severity: "high",
      title: "Prueba de desastre",
      message: "Se necesita garantizar roundtrip completo en local.",
      reporterName: "Asesoria Martin Fiscal",
      contactEmail: email,
    });

    const document = await createLocalCommercialDocumentRecord({
      userId,
      input: {
        document_type: "quote",
        status: "draft",
        issue_date: "2026-04-21",
        valid_until: "2026-05-21",
        issuer_name: "Asesoria Martin Fiscal",
        issuer_nif: "B12345678",
        issuer_address: "Calle Alcala 100, Madrid",
        issuer_logo_url: null,
        client_name: "Empresa 1 S.L.",
        client_nif: "B76543001",
        client_address: "Avenida Cliente 1, Madrid",
        client_email: "admin1@empresa.test",
        line_items: buildLineItems(),
        vat_breakdown: buildTotals().vatBreakdown,
        subtotal: 350,
        vat_total: 73.5,
        irpf_rate: 0,
        irpf_amount: 0,
        grand_total: 423.5,
        notes: "Documento de prueba de desastre",
        converted_invoice_id: null,
      },
    });

    const signatureRequest = await createLocalDocumentSignatureRequest({
      userId,
      documentId: document.id,
      documentType: "quote",
      requestKind: "quote_acceptance",
      publicToken: "token-disaster-restore",
      requestNote: null,
      requestedAt: "2026-04-21T10:00:00.000Z",
      expiresAt: "2026-05-21T23:59:59.000Z",
      evidence: {
        documentSnapshot: {
          hash: "hash-disaster-restore",
        },
      },
    });

    await respondToLocalDocumentSignatureRequest({
      token: signatureRequest.public_token,
      status: "signed",
      signerName: "Empresa 1 S.L.",
      signerEmail: "admin1@empresa.test",
      signerNif: "B76543001",
      signerMessage: "Aceptado para prueba",
      acceptedTerms: true,
      forwardedFor: "127.0.0.1",
      userAgent: "Vitest disaster",
    });

    const originalBackup = await exportBackupForUser(userId, email);
    const restoreDir = await mkdtemp(path.join(os.tmpdir(), "facturaia-backup-disaster-"));

    try {
      process.env.FACTURAIA_DATA_DIR = restoreDir;
      await restoreBackupForUser(userId, email, originalBackup);

      const restoredBackup = await exportBackupForUser(userId, email);
      const comparison = compareBackupContents(originalBackup, restoredBackup);

      expect(comparison.matches).toBe(true);
      expect(comparison.mismatches).toEqual([]);

      const { lineItems, totals } = buildMassLineItems(25);
      const nextInvoice = await createLocalInvoiceRecord({
        userId,
        payload: {
          issueDate: "2026-04-25",
          dueDate: "2026-05-25",
          issuerName: "Asesoria Martin Fiscal",
          issuerNif: "B12345678",
          issuerAddress: "Calle Alcala 100, Madrid",
          clientName: "Empresa 2 S.L.",
          clientNif: "B76543002",
          clientAddress: "Avenida Cliente 2, Madrid",
          clientEmail: "admin2@empresa.test",
        },
        lineItems,
        totals,
        issuerLogoUrl: null,
      });

      const restoredSnapshot = await getLocalCoreSnapshot();

      expect(nextInvoice.invoice_number).toBe(25);
      expect(restoredSnapshot.invoices).toHaveLength(25);
      expect(restoredSnapshot.invoiceReminders).toHaveLength(1);
      expect(restoredSnapshot.bankMovements).toHaveLength(1);
      expect(
        restoredSnapshot.invoices.find((invoice) => invoice.id === invoices[2]!.id)?.payment_status,
      ).toBe("partial");
    } finally {
      await rm(restoreDir, { recursive: true, force: true });
      process.env.FACTURAIA_DATA_DIR = localDataDir;
    }
  });
});
