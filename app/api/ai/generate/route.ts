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
import { getPlanLabel } from "@/lib/plans";

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

    if (usage.blocked) {
      return NextResponse.json(
        {
          error:
            usage.limit === null
              ? "Tu plan no tiene límite diario de IA."
              : `Has alcanzado el límite diario de ${usage.limit} mejoras con IA de tu plan ${getPlanLabel(usage.effectivePlan)}. Vuelve mañana o actualiza tu suscripción.`,
        },
        { status: 429 },
      );
    }

    const completion = await improveInvoiceDescription({
      description: payload.description,
      context: payload.context,
    });
    const consumed = await incrementDailyAiUsage(
      appUser.id,
      getAiDailyLimit(appUser),
      usage.date,
    );

    if (consumed === null) {
      return NextResponse.json(
        {
          error:
            "Acabas de alcanzar tu límite diario de IA. Vuelve mañana o mejora tu plan para seguir generando descripciones.",
        },
        { status: 429 },
      );
    }

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
    const status =
      error instanceof ApiRouteError
        ? error.status
        : message.includes("Activa al menos el plan Básico")
          ? 403
          : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
