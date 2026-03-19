import { NextResponse } from "next/server";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { z } from "zod";

import { AI_DOCUMENT_TYPES, generateBusinessDocument } from "@/lib/ai";
import {
  getAiDailyLimit,
  getCurrentAiUsageSnapshot,
  incrementDailyAiUsage,
  requireFeatureAccess,
} from "@/lib/billing";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Rate limiting extra en Cloudflare: /api/ai/*  -> 10 req/min por IP
const requestSchema = z.object({
  documentType: z.enum(AI_DOCUMENT_TYPES),
  brief: z
    .string()
    .trim()
    .min(20, "Describe mejor el documento para que la IA local pueda redactarlo.")
    .max(2500, "El briefing es demasiado largo para esta generación."),
  issuerName: z.string().trim().max(120).optional(),
  clientName: z.string().trim().max(120).optional(),
});

export async function POST(request: Request) {
  try {
    await requireUser();
  } catch (error) {
    if (isRedirectError(error)) {
      return NextResponse.json(
        { error: "Necesitas iniciar sesión para generar documentos." },
        { status: 401 },
      );
    }

    throw error;
  }

  try {
    const payload = requestSchema.parse((await request.json()) as unknown);
    const { user: appUser } = await requireFeatureAccess("ai_contracts");
    const usage = await getCurrentAiUsageSnapshot(appUser);

    const completion = await generateBusinessDocument(payload);
    await incrementDailyAiUsage(
      appUser.id,
      getAiDailyLimit(),
      usage.date,
    );

    return NextResponse.json({
      documentTitle: completion.title,
      documentBody: completion.body,
      provider: completion.provider,
      model: completion.model,
    });
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? error.issues[0]?.message ?? "La petición no tiene el formato esperado."
        : error instanceof Error
          ? error.message
          : "No se ha podido generar el documento con la IA local.";
    const status =
      error instanceof z.ZodError
        ? 400
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
