import { NextResponse } from "next/server";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import {
  getAiDailyLimit,
  getCurrentAiUsageSnapshot,
  incrementDailyAiUsage,
  requireFeatureAccess,
} from "@/lib/billing";
import { generateSpanishTaxAssistantReply } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Rate limiting extra en Cloudflare: /api/ai/*  -> 10 req/min por IP

const requestSchema = z.object({
  message: z
    .string()
    .trim()
    .min(12, "Describe mejor el caso o la duda fiscal que quieres preparar.")
    .max(4000, "La consulta es demasiado larga para una sola interacción."),
  clientName: z.string().trim().max(180).optional(),
  taxYear: z.string().trim().max(20).optional(),
  clientSummary: z.string().trim().max(2000).optional(),
  providedDocuments: z.string().trim().max(3000).optional(),
});

class ApiRouteError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function parseRequestBody(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    return requestSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ApiRouteError(
        error.issues[0]?.message ??
          "La petición del asistente fiscal no tiene el formato esperado.",
        400,
      );
    }

    throw new ApiRouteError(
      "No se ha podido leer la petición del asistente fiscal.",
      400,
    );
  }
}

export async function POST(request: Request) {
  try {
    await requireUser();
  } catch (error) {
    if (isRedirectError(error)) {
      return NextResponse.json(
        {
          error:
            "Necesitas iniciar sesión para usar el asistente fiscal de FacturaIA.",
        },
        { status: 401 },
      );
    }

    throw error;
  }

  try {
    const payload = await parseRequestBody(request);
    const { user: appUser } = await requireFeatureAccess("ai_descriptions");
    const usage = await getCurrentAiUsageSnapshot(appUser);
    const completion = await generateSpanishTaxAssistantReply(payload);

    await incrementDailyAiUsage(appUser.id, getAiDailyLimit(), usage.date);

    return NextResponse.json({
      replyText: completion.text,
      provider: completion.provider,
      model: completion.model,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se ha podido generar la respuesta del asistente fiscal.";
    const status = error instanceof ApiRouteError ? error.status : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
