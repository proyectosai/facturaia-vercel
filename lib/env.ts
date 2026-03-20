import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

const serviceEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

const resendEnvSchema = z.object({
  RESEND_API_KEY: z.string().min(1),
  RESEND_FROM_EMAIL: z.string().min(1),
});

const localAiEnvSchema = z.object({
  LM_STUDIO_BASE_URL: z.string().url().default("http://10.149.71.240:1234/v1"),
  LM_STUDIO_MODEL: z.string().min(1).default("openai/gpt-oss-20b"),
  LM_STUDIO_API_KEY: z.string().optional(),
});

export function getPublicEnv() {
  return publicEnvSchema.parse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}

export function getServiceEnv() {
  return serviceEnvSchema.parse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}

export function getResendEnv() {
  return resendEnvSchema.parse({
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
  });
}

export function getLocalAiEnv() {
  return localAiEnvSchema.parse({
    LM_STUDIO_BASE_URL: process.env.LM_STUDIO_BASE_URL,
    LM_STUDIO_MODEL: process.env.LM_STUDIO_MODEL,
    LM_STUDIO_API_KEY: process.env.LM_STUDIO_API_KEY,
  });
}

export function hasLocalAiEnv() {
  return Boolean(process.env.LM_STUDIO_BASE_URL) && Boolean(process.env.LM_STUDIO_MODEL);
}
