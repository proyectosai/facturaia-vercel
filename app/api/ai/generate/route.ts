import { NextResponse } from "next/server";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { z } from "zod";

import { improveInvoiceDescription } from "@/lib/ai";
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
  description: z
    .string()
    .trim()
    .min(4, "Escribe una descripción base un poco más detallada.")
    .max(600, "La descripción base es demasiado larga para mejorarla."),
  context: z
    .string()
    .trim()
    .max(1200, "El contexto adicional es demasiado largo.")
    .optional(),
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
          "La petición de IA no tiene el formato esperado.",
        400,
      );
    }

    throw new ApiRouteError("No se ha podido leer la petición de IA.", 400);
  }
}

export async function POST(request: Request) {
  try {
    await requireUser();
  } catch (error) {
    if (isRedirectError(error)) {
      return NextResponse.json(
        { error: "Necesitas iniciar sesión para usar la IA de FacturaIA." },
        { status: 401 },
      );
    }

    throw error;
  }

  try {
    const payload = await parseRequestBody(request);
    const { user: appUser } = await requireFeatureAccess("ai_descriptions");
    const usage = await getCurrentAiUsageSnapshot(appUser);

    const completion = await improveInvoiceDescription({
      description: payload.description,
      context: payload.context,
    });
    await incrementDailyAiUsage(
      appUser.id,
      getAiDailyLimit(),
      usage.date,
    );

    return NextResponse.json({
      improvedText: completion.text,
      provider: completion.provider,
      model: completion.model,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se ha podido generar la descripción con la IA local.";
    const status = error instanceof ApiRouteError ? error.status : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
