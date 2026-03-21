import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { exportBackupForUser, restoreBackupForUser } from "@/lib/backups";
import {
  getBankMatchSuggestionsForMovement,
  getBankMatchingDataForUser,
  getBankMovementsForUser,
  parseBankCsvFile,
} from "@/lib/banking";
import {
  createLocalBankMovementRecords,
  createLocalExpenseRecord,
  createLocalInvoiceRecord,
  getLocalCoreSnapshot,
  reconcileLocalBankMovement,
  syncLocalInvoicePaymentStatusFromBankMatches,
} from "@/lib/local-core";
import { writeLocalStateText } from "@/lib/local-db";

const userId = "user-local-banking";
const email = "asesor@despacho.local";

function buildLineItems(amount: number) {
  const base = Number((amount / 1.21).toFixed(2));
  const vat = Number((amount - base).toFixed(2));

  return [
    {
      description: "Servicio mensual",
      quantity: 1,
      unitPrice: base,
      vatRate: 21 as const,
      lineBase: base,
      vatAmount: vat,
      lineTotal: amount,
    },
  ];
}

function buildTotals(amount: number) {
  const base = Number((amount / 1.21).toFixed(2));
  const vat = Number((amount - base).toFixed(2));

  return {
    subtotal: base,
    vatTotal: vat,
    irpfRate: 0,
    irpfAmount: 0,
    grandTotal: amount,
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
  localDataDir = await mkdtemp(path.join(os.tmpdir(), "facturaia-local-banking-"));
  process.env.FACTURAIA_LOCAL_MODE = "1";
  process.env.FACTURAIA_DATA_DIR = localDataDir;
  process.env.FACTURAIA_LOCAL_SESSION_SECRET = "banking-local-secret";
  process.env.NEXT_PUBLIC_APP_URL = "http://127.0.0.1:4020";
});

afterEach(async () => {
  await rm(localDataDir, { recursive: true, force: true });
});

describe("local banking", () => {
  test("imports csv rows, reconciles movements and survives backup restore", async () => {
    const invoiceA = await createLocalInvoiceRecord({
      userId,
      payload: {
        issueDate: "2026-03-10",
        dueDate: "2026-03-20",
        issuerName: "Asesoria Sierra Fiscal",
        issuerNif: "B12345678",
        issuerAddress: "Gran Via 10, Madrid",
        clientName: "Cliente Uno S.L.",
        clientNif: "B70000001",
        clientAddress: "Calle Uno, Madrid",
        clientEmail: "cliente1@despacho.test",
      },
      lineItems: buildLineItems(242),
      totals: buildTotals(242),
      issuerLogoUrl: null,
    });
    const invoiceB = await createLocalInvoiceRecord({
      userId,
      payload: {
        issueDate: "2026-03-12",
        dueDate: "2026-03-22",
        issuerName: "Asesoria Sierra Fiscal",
        issuerNif: "B12345678",
        issuerAddress: "Gran Via 10, Madrid",
        clientName: "Cliente Dos S.L.",
        clientNif: "B70000002",
        clientAddress: "Calle Dos, Madrid",
        clientEmail: "cliente2@despacho.test",
      },
      lineItems: buildLineItems(363),
      totals: buildTotals(363),
      issuerLogoUrl: null,
    });
    const expense = await createLocalExpenseRecord({
      userId,
      expenseKind: "supplier_invoice",
      reviewStatus: "reviewed",
      vendorName: "Proveedor Uno SL",
      vendorNif: "B80000001",
      expenseDate: "2026-03-14",
      currency: "EUR",
      baseAmount: 100,
      vatAmount: 21,
      totalAmount: 121,
      notes: "Factura proveedor",
      sourceFileName: "proveedor-uno.txt",
      sourceFilePath: "data:text/plain;base64,ZmFrZQ==",
      sourceFileMimeType: "text/plain",
      extractionMethod: "manual",
      rawText: "Proveedor Uno SL",
      extractedPayload: { confidence: 1 },
    });

    const csv = [
      "fecha;concepto;contraparte;importe;saldo",
      "15/03/2026;TRANSFERENCIA RECIBIDA FRA 0001;Cliente Uno S.L.;242,00;5000,00",
      "16/03/2026;PAGO PROVEEDOR;Proveedor Uno SL;-121,00;4879,00",
      "17/03/2026;TRANSFERENCIA RECIBIDA CLIENTE DOS;Cliente Dos S.L.;100,00;4979,00",
      "18/03/2026;TRASPASO INTERNO;Cuenta interna;-30,00;4949,00",
    ].join("\n");

    const parsed = parseBankCsvFile({
      fileText: csv,
      fileName: "extracto-marzo.csv",
      accountLabel: "Cuenta despacho",
    });

    const imported = await createLocalBankMovementRecords({
      userId,
      rows: parsed,
    });
    const importedAgain = await createLocalBankMovementRecords({
      userId,
      rows: parsed,
    });

    expect(imported).toHaveLength(4);
    expect(importedAgain).toHaveLength(0);

    const matchingData = await getBankMatchingDataForUser(userId);
    const movements = await getBankMovementsForUser(userId);

    expect(matchingData.invoices).toHaveLength(2);
    expect(matchingData.expenses).toHaveLength(1);
    expect(movements).toHaveLength(4);

    const invoiceSuggestion = getBankMatchSuggestionsForMovement(imported[0]!, matchingData);
    const expenseSuggestion = getBankMatchSuggestionsForMovement(imported[1]!, matchingData);

    expect(invoiceSuggestion[0]?.id).toBe(invoiceA.id);
    expect(expenseSuggestion[0]?.id).toBe(expense.id);

    await reconcileLocalBankMovement({
      userId,
      movementId: imported[0]!.id,
      actionKind: "match_invoice",
      targetId: invoiceA.id,
    });
    await reconcileLocalBankMovement({
      userId,
      movementId: imported[1]!.id,
      actionKind: "match_expense",
      targetId: expense.id,
    });
    await reconcileLocalBankMovement({
      userId,
      movementId: imported[2]!.id,
      actionKind: "match_invoice",
      targetId: invoiceB.id,
    });
    await reconcileLocalBankMovement({
      userId,
      movementId: imported[3]!.id,
      actionKind: "ignore",
    });
    await syncLocalInvoicePaymentStatusFromBankMatches(userId, [invoiceA.id, invoiceB.id]);

    const snapshot = await getLocalCoreSnapshot();
    const refreshedInvoiceA = snapshot.invoices.find((item) => item.id === invoiceA.id);
    const refreshedInvoiceB = snapshot.invoices.find((item) => item.id === invoiceB.id);

    expect(snapshot.bankMovements).toHaveLength(4);
    expect(snapshot.bankMovements.filter((item) => item.status === "reconciled")).toHaveLength(3);
    expect(snapshot.bankMovements.filter((item) => item.status === "ignored")).toHaveLength(1);
    expect(refreshedInvoiceA?.payment_status).toBe("paid");
    expect(refreshedInvoiceA?.amount_paid).toBe(242);
    expect(refreshedInvoiceB?.payment_status).toBe("partial");
    expect(refreshedInvoiceB?.amount_paid).toBe(100);

    snapshot.bankMovements = [];
    await writeLocalStateText(
      JSON.stringify(snapshot, null, 2),
      JSON.stringify(snapshot, null, 2),
      { structuredMutation: {} },
    );

    const recoveredSnapshot = await getLocalCoreSnapshot();
    expect(recoveredSnapshot.bankMovements).toHaveLength(4);
    expect(recoveredSnapshot.bankMovements.filter((item) => item.status === "reconciled")).toHaveLength(3);

    const backup = await exportBackupForUser(userId, email);
    expect(backup.bankMovements).toHaveLength(4);

    const restoreDir = await mkdtemp(path.join(os.tmpdir(), "facturaia-local-banking-restore-"));

    try {
      process.env.FACTURAIA_DATA_DIR = restoreDir;
      await restoreBackupForUser(userId, email, backup);

      const restored = await getLocalCoreSnapshot();
      const restoredInvoiceA = restored.invoices.find((item) => item.id === invoiceA.id);
      const restoredInvoiceB = restored.invoices.find((item) => item.id === invoiceB.id);

      expect(restored.bankMovements).toHaveLength(4);
      expect(restored.bankMovements.filter((item) => item.status === "reconciled")).toHaveLength(3);
      expect(restoredInvoiceA?.payment_status).toBe("paid");
      expect(restoredInvoiceB?.payment_status).toBe("partial");
      expect(restoredInvoiceB?.amount_paid).toBe(100);
    } finally {
      await rm(restoreDir, { recursive: true, force: true });
      process.env.FACTURAIA_DATA_DIR = localDataDir;
    }
  });
});
