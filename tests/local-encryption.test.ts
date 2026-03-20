import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import {
  exportBackupForUser,
  parseBackupPayload,
  restoreBackupForUser,
  serializeBackupPayload,
} from "@/lib/backups";
import {
  createLocalInvoiceRecord,
  getLocalCoreSnapshot,
  saveLocalClientRecord,
  saveLocalProfile,
} from "@/lib/local-core";
import { getLocalDatabaseFilePath } from "@/lib/local-db";

const userId = "user-local-encryption";
const email = "asesor@despacho.local";

let localDataDir = "";

function buildLineItems() {
  return [
    {
      description: "Servicio mensual de asesoria fiscal",
      quantity: 1,
      unitPrice: 200,
      vatRate: 21 as const,
      lineBase: 200,
      vatAmount: 42,
      lineTotal: 242,
    },
  ];
}

function buildTotals() {
  return {
    subtotal: 200,
    vatTotal: 42,
    irpfRate: 0,
    irpfAmount: 0,
    grandTotal: 242,
    vatBreakdown: [
      {
        rate: 21 as const,
        taxableBase: 200,
        vatAmount: 42,
      },
    ],
  };
}

beforeEach(async () => {
  localDataDir = await mkdtemp(path.join(os.tmpdir(), "facturaia-local-encryption-"));
  process.env.FACTURAIA_LOCAL_MODE = "1";
  process.env.FACTURAIA_DATA_DIR = localDataDir;
  process.env.FACTURAIA_LOCAL_SESSION_SECRET = "encryption-local-secret";
  process.env.FACTURAIA_ENCRYPTION_PASSPHRASE = "una-passphrase-larga-y-unica-para-pruebas";
  process.env.NEXT_PUBLIC_APP_URL = "http://127.0.0.1:4060";
  delete process.env.FACTURAIA_ENCRYPT_LOCAL_DATA;
  delete process.env.FACTURAIA_ENCRYPT_BACKUPS;
});

afterEach(async () => {
  await rm(localDataDir, { recursive: true, force: true });
  delete process.env.FACTURAIA_ENCRYPTION_PASSPHRASE;
  delete process.env.FACTURAIA_ENCRYPT_LOCAL_DATA;
  delete process.env.FACTURAIA_ENCRYPT_BACKUPS;
});

describe("optional local encryption", () => {
  test("encrypts the local core file when requested", async () => {
    process.env.FACTURAIA_ENCRYPT_LOCAL_DATA = "1";

    await saveLocalClientRecord({
      userId,
      relationKind: "client",
      status: "active",
      priority: "medium",
      displayName: "Empresa Cifrada S.L.",
      firstName: null,
      lastName: null,
      companyName: "Empresa Cifrada S.L.",
      email: "admin@cifrada.es",
      phone: "+34 600111222",
      nif: "B76543210",
      address: "Avenida cifrada 15, Madrid",
      notes: "Cliente sensible",
      tags: ["privado"],
    });

    const filePath = getLocalDatabaseFilePath();
    const raw = await readFile(filePath);
    const rawText = raw.toString("utf8");
    const snapshot = await getLocalCoreSnapshot();

    expect(rawText).toContain("SQLite format 3");
    expect(rawText).not.toContain("Empresa Cifrada S.L.");
    expect(snapshot.clients).toHaveLength(1);
    expect(snapshot.clients[0]?.display_name).toBe("Empresa Cifrada S.L.");
  });

  test("encrypts backups only when requested and restores them correctly", async () => {
    process.env.FACTURAIA_ENCRYPT_BACKUPS = "1";

    await saveLocalProfile({
      userId,
      email,
      fullName: "Asesoria Cifrada",
      nif: "B12345678",
      address: "Calle Segura 10, Madrid",
      logoUrl: null,
    });

    await saveLocalClientRecord({
      userId,
      relationKind: "client",
      status: "active",
      priority: "high",
      displayName: "Empresa Respaldo S.L.",
      firstName: null,
      lastName: null,
      companyName: "Empresa Respaldo S.L.",
      email: "admin@respaldo.es",
      phone: "+34 611223344",
      nif: "B70000001",
      address: "Paseo Seguro 22, Madrid",
      notes: "Cliente de backup",
      tags: ["backup"],
    });

    await createLocalInvoiceRecord({
      userId,
      payload: {
        issueDate: "2026-03-20",
        dueDate: "2026-03-27",
        issuerName: "Asesoria Cifrada",
        issuerNif: "B12345678",
        issuerAddress: "Calle Segura 10, Madrid",
        clientName: "Empresa Respaldo S.L.",
        clientNif: "B70000001",
        clientAddress: "Paseo Seguro 22, Madrid",
        clientEmail: "admin@respaldo.es",
      },
      lineItems: buildLineItems(),
      totals: buildTotals(),
      issuerLogoUrl: null,
    });

    const backup = await exportBackupForUser(userId, email);
    const serialized = serializeBackupPayload(backup);
    const parsed = parseBackupPayload(serialized);

    expect(serialized).toContain('"format": "facturaia-encrypted"');
    expect(serialized).not.toContain("Empresa Respaldo S.L.");
    expect(parsed.clients).toHaveLength(1);
    expect(parsed.invoices).toHaveLength(1);

    const restoreDir = await mkdtemp(path.join(os.tmpdir(), "facturaia-encryption-restore-"));

    try {
      process.env.FACTURAIA_DATA_DIR = restoreDir;
      await restoreBackupForUser(userId, email, parsed);

      const restored = await getLocalCoreSnapshot();

      expect(restored.clients).toHaveLength(1);
      expect(restored.invoices).toHaveLength(1);
      expect(restored.clients[0]?.display_name).toBe("Empresa Respaldo S.L.");
    } finally {
      await rm(restoreDir, { recursive: true, force: true });
      process.env.FACTURAIA_DATA_DIR = localDataDir;
    }
  });
});
