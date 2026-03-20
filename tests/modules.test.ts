import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { getModuleCatalog, getModuleLocalSupportMeta } from "@/lib/modules";

const ORIGINAL_ENV = { ...process.env };

function getModuleById(id: string) {
  const moduleEntry = getModuleCatalog().find((entry) => entry.id === id);

  if (!moduleEntry) {
    throw new Error(`Module ${id} not found.`);
  }

  return moduleEntry;
}

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  delete process.env.FACTURAIA_DEMO_MODE;
  delete process.env.FACTURAIA_LOCAL_MODE;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.MAIL_PROVIDER;
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_PORT;
  delete process.env.SMTP_SECURE;
  delete process.env.SMTP_USERNAME;
  delete process.env.SMTP_PASSWORD;
  delete process.env.SMTP_FROM_EMAIL;
  delete process.env.IMAP_HOST;
  delete process.env.IMAP_PORT;
  delete process.env.IMAP_SECURE;
  delete process.env.IMAP_USERNAME;
  delete process.env.IMAP_PASSWORD;
  delete process.env.LM_STUDIO_BASE_URL;
  delete process.env.LM_STUDIO_MODEL;
  delete process.env.NEXT_PUBLIC_APP_URL;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("module catalog", () => {
  test("describes local private mode without pretending Supabase is required", () => {
    process.env.FACTURAIA_LOCAL_MODE = "1";
    process.env.NEXT_PUBLIC_APP_URL = "http://127.0.0.1:3173";
    process.env.SMTP_HOST = "smtp.local";
    process.env.SMTP_PORT = "587";
    process.env.SMTP_USERNAME = "asesor";
    process.env.SMTP_PASSWORD = "supersecreto";
    process.env.SMTP_FROM_EMAIL = "asesor@despacho.local";
    process.env.LM_STUDIO_BASE_URL = "http://127.0.0.1:1234/v1";
    process.env.LM_STUDIO_MODEL = "openai/gpt-oss-20b";

    expect(getModuleById("local-backups").configuredLabel).toContain("en local");
    expect(getModuleById("quotes-delivery-notes").configured).toBe(true);
    expect(getModuleById("expenses-ocr").configured).toBe(true);
    expect(getModuleById("crm-light").configured).toBe(true);
    expect(getModuleById("document-signature").configured).toBe(true);
    expect(getModuleById("facturae-verifactu").configured).toBe(true);
    expect(getModuleById("email-outbound").configured).toBe(true);
    expect(getModuleById("tax-assistant").configuredLabel).toBe("LM Studio listo");

    expect(getModuleById("bank-reconciliation").configured).toBe(true);
    expect(getModuleById("bank-reconciliation").configuredLabel).toContain("en local");

    expect(getModuleById("local-backups").localSupport).toBe("native");
    expect(getModuleById("email-outbound").localSupport).toBe("assisted");
    expect(getModuleById("bank-reconciliation").localSupport).toBe("native");
  });

  test("describes hosted mode modules when Supabase and public URL exist", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
    process.env.NEXT_PUBLIC_APP_URL = "https://facturaia.example.com";

    expect(getModuleById("messaging-inbox").configured).toBe(true);
    expect(getModuleById("local-backups").configured).toBe(true);
    expect(getModuleById("bank-reconciliation").configured).toBe(true);
    expect(getModuleById("document-signature").configured).toBe(true);
    expect(getModuleById("facturae-verifactu").configured).toBe(true);
  });

  test("provides explicit labels for local compatibility", () => {
    expect(getModuleLocalSupportMeta("native").label).toBe("Local nativo");
    expect(getModuleLocalSupportMeta("assisted").label).toBe("Local asistido");
    expect(getModuleLocalSupportMeta("blocked").label).toBe("Local pendiente");
  });
});
