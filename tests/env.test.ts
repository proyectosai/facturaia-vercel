import { afterEach, describe, expect, test } from "vitest";

import {
  getLocalRuntimeEnv,
  getOptionalPublicEnv,
  getPublicEnv,
  hasLocalAiEnv,
  hasSupabasePublicEnv,
} from "@/lib/env";

const ORIGINAL_ENV = { ...process.env };

function resetEnv() {
  for (const key of Object.keys(process.env)) {
    delete process.env[key];
  }

  Object.assign(process.env, ORIGINAL_ENV);
}

afterEach(() => {
  resetEnv();
});

describe("environment validation", () => {
  test("parses local runtime defaults and flags consistently", () => {
    delete process.env.FACTURAIA_DEMO_MODE;
    delete process.env.FACTURAIA_LOCAL_MODE;
    delete process.env.FACTURAIA_LOCAL_BOOTSTRAP;
    delete process.env.FACTURAIA_LOCAL_SESSION_MAX_AGE_HOURS;
    delete process.env.FACTURAIA_LOCAL_LOGIN_MAX_ATTEMPTS;
    delete process.env.FACTURAIA_LOCAL_LOGIN_LOCKOUT_MINUTES;
    delete process.env.FACTURAIA_DATA_DIR;
    delete process.env.FACTURAIA_ENCRYPT_LOCAL_DATA;
    delete process.env.FACTURAIA_ENCRYPT_BACKUPS;
    delete process.env.FACTURAIA_ENCRYPTION_PASSPHRASE;

    const env = getLocalRuntimeEnv();

    expect(env.FACTURAIA_DEMO_MODE).toBe(false);
    expect(env.FACTURAIA_LOCAL_MODE).toBe(false);
    expect(env.FACTURAIA_LOCAL_BOOTSTRAP).toBe(false);
    expect(env.FACTURAIA_LOCAL_SESSION_MAX_AGE_HOURS).toBe(168);
    expect(env.FACTURAIA_LOCAL_LOGIN_MAX_ATTEMPTS).toBe(5);
    expect(env.FACTURAIA_LOCAL_LOGIN_LOCKOUT_MINUTES).toBe(15);
    expect(env.FACTURAIA_DATA_DIR).toBeUndefined();
    expect(env.FACTURAIA_ENCRYPT_LOCAL_DATA).toBe(false);
    expect(env.FACTURAIA_ENCRYPT_BACKUPS).toBe(false);
    expect(env.FACTURAIA_ENCRYPTION_PASSPHRASE).toBeUndefined();
  });

  test("validates numeric local runtime env and rejects invalid values", () => {
    process.env.FACTURAIA_LOCAL_SESSION_MAX_AGE_HOURS = "0";
    process.env.FACTURAIA_LOCAL_LOGIN_MAX_ATTEMPTS = "-2";
    process.env.FACTURAIA_LOCAL_LOGIN_LOCKOUT_MINUTES = "abc";

    expect(() => getLocalRuntimeEnv()).toThrow();
  });

  test("distinguishes optional and required supabase public env", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const optionalEnv = getOptionalPublicEnv();

    expect(optionalEnv.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
    expect(optionalEnv.NEXT_PUBLIC_SUPABASE_URL).toBeUndefined();
    expect(optionalEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBeUndefined();
    expect(hasSupabasePublicEnv()).toBe(false);
    expect(() => getPublicEnv()).toThrow();
  });

  test("recognizes local ai env only when both endpoint and model are valid", () => {
    delete process.env.LM_STUDIO_BASE_URL;
    delete process.env.LM_STUDIO_MODEL;

    expect(hasLocalAiEnv()).toBe(true);

    process.env.LM_STUDIO_BASE_URL = "no-es-una-url";
    expect(hasLocalAiEnv()).toBe(false);
  });
});
