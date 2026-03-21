import { z } from "zod";

function trimString(value: unknown) {
  return typeof value === "string" ? value.trim() : value;
}

function emptyToUndefined(value: unknown) {
  const trimmed = trimString(value);
  return trimmed === "" ? undefined : trimmed;
}

const optionalStringSchema = z.preprocess(
  emptyToUndefined,
  z.string().min(1).optional(),
);

const optionalUrlSchema = z.preprocess(emptyToUndefined, z.string().url().optional());

function numberWithDefault(defaultValue: number) {
  return z.preprocess(
    (value) => {
      const trimmed = emptyToUndefined(value);
      return trimmed === undefined ? defaultValue : Number(trimmed);
    },
    z.number().int().positive(),
  );
}

const envFlagSchema = z.preprocess(
  (value) => {
    const trimmed = trimString(value);
    return trimmed === undefined || trimmed === null || trimmed === "" ? "0" : trimmed;
  },
  z.enum(["0", "1"]),
).transform((value) => value === "1");

const optionalPublicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.preprocess(
    emptyToUndefined,
    z.string().url().default("http://localhost:3000"),
  ),
  NEXT_PUBLIC_SUPABASE_URL: optionalUrlSchema,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalStringSchema,
});

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.preprocess(
    emptyToUndefined,
    z.string().url().default("http://localhost:3000"),
  ),
  NEXT_PUBLIC_SUPABASE_URL: z.preprocess(emptyToUndefined, z.string().url()),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.preprocess(emptyToUndefined, z.string().min(1)),
});

const serviceEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.preprocess(emptyToUndefined, z.string().min(1)),
});

const resendEnvSchema = z.object({
  RESEND_API_KEY: z.preprocess(emptyToUndefined, z.string().min(1)),
  RESEND_FROM_EMAIL: z.preprocess(emptyToUndefined, z.string().min(1)),
});

const localAiEnvSchema = z.object({
  LM_STUDIO_BASE_URL: z.preprocess(
    emptyToUndefined,
    z.string().url().default("http://10.149.71.240:1234/v1"),
  ),
  LM_STUDIO_MODEL: z.preprocess(
    emptyToUndefined,
    z.string().min(1).default("openai/gpt-oss-20b"),
  ),
  LM_STUDIO_API_KEY: optionalStringSchema,
});

const ollamaOcrEnvSchema = z.object({
  OLLAMA_BASE_URL: z.preprocess(emptyToUndefined, z.string().url()),
  OLLAMA_OCR_MODEL: z.preprocess(emptyToUndefined, z.string().min(1)),
  OLLAMA_API_KEY: optionalStringSchema,
});

const localRuntimeEnvSchema = z.object({
  FACTURAIA_DEMO_MODE: envFlagSchema,
  FACTURAIA_LOCAL_MODE: envFlagSchema,
  FACTURAIA_LOCAL_BOOTSTRAP: envFlagSchema,
  FACTURAIA_LOCAL_SESSION_SECRET: optionalStringSchema,
  FACTURAIA_LOCAL_SESSION_MAX_AGE_HOURS: numberWithDefault(168),
  FACTURAIA_LOCAL_LOGIN_MAX_ATTEMPTS: numberWithDefault(5),
  FACTURAIA_LOCAL_LOGIN_LOCKOUT_MINUTES: numberWithDefault(15),
  FACTURAIA_DATA_DIR: optionalStringSchema,
  FACTURAIA_ENCRYPT_LOCAL_DATA: envFlagSchema,
  FACTURAIA_ENCRYPT_BACKUPS: envFlagSchema,
  FACTURAIA_ENCRYPTION_PASSPHRASE: optionalStringSchema,
});

function pickEnv<T extends readonly string[]>(keys: T) {
  const entries = keys.map((key) => [key, process.env[key]]);
  return Object.fromEntries(entries) as Record<T[number], string | undefined>;
}

export function getOptionalPublicEnv() {
  return optionalPublicEnvSchema.parse(
    pickEnv([
      "NEXT_PUBLIC_APP_URL",
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ] as const),
  );
}

export function getPublicEnv() {
  return publicEnvSchema.parse(
    pickEnv([
      "NEXT_PUBLIC_APP_URL",
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ] as const),
  );
}

export function hasSupabasePublicEnv() {
  const env = getOptionalPublicEnv();
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function getServiceEnv() {
  return serviceEnvSchema.parse(pickEnv(["SUPABASE_SERVICE_ROLE_KEY"] as const));
}

export function getResendEnv() {
  return resendEnvSchema.parse(pickEnv(["RESEND_API_KEY", "RESEND_FROM_EMAIL"] as const));
}

export function getLocalAiEnv() {
  return localAiEnvSchema.parse(
    pickEnv(["LM_STUDIO_BASE_URL", "LM_STUDIO_MODEL", "LM_STUDIO_API_KEY"] as const),
  );
}

export function hasLocalAiEnv() {
  const env = localAiEnvSchema.safeParse(
    pickEnv(["LM_STUDIO_BASE_URL", "LM_STUDIO_MODEL", "LM_STUDIO_API_KEY"] as const),
  );

  return env.success && Boolean(env.data.LM_STUDIO_BASE_URL) && Boolean(env.data.LM_STUDIO_MODEL);
}

export function getOllamaOcrEnv() {
  return ollamaOcrEnvSchema.parse(
    pickEnv(["OLLAMA_BASE_URL", "OLLAMA_OCR_MODEL", "OLLAMA_API_KEY"] as const),
  );
}

export function hasOllamaOcrEnv() {
  const env = ollamaOcrEnvSchema.safeParse(
    pickEnv(["OLLAMA_BASE_URL", "OLLAMA_OCR_MODEL", "OLLAMA_API_KEY"] as const),
  );

  return env.success && Boolean(env.data.OLLAMA_BASE_URL) && Boolean(env.data.OLLAMA_OCR_MODEL);
}

export function getLocalRuntimeEnv() {
  return localRuntimeEnvSchema.parse(
    pickEnv([
      "FACTURAIA_DEMO_MODE",
      "FACTURAIA_LOCAL_MODE",
      "FACTURAIA_LOCAL_BOOTSTRAP",
      "FACTURAIA_LOCAL_SESSION_SECRET",
      "FACTURAIA_LOCAL_SESSION_MAX_AGE_HOURS",
      "FACTURAIA_LOCAL_LOGIN_MAX_ATTEMPTS",
      "FACTURAIA_LOCAL_LOGIN_LOCKOUT_MINUTES",
      "FACTURAIA_DATA_DIR",
      "FACTURAIA_ENCRYPT_LOCAL_DATA",
      "FACTURAIA_ENCRYPT_BACKUPS",
      "FACTURAIA_ENCRYPTION_PASSPHRASE",
    ] as const),
  );
}
