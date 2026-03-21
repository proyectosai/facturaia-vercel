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
import { isLocalFileMode } from "@/lib/demo";
import { answerStudyQuestionForUser } from "@/lib/document-study";
import { recordLocalAuditEvent } from "@/lib/local-core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  question: z
    .string()
    .trim()
    .min(10, "Describe mejor lo que quieres preguntar sobre tus documentos.")
    .max(2500, "La consulta es demasiado larga para una sola interacción."),
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
    return requestSchema.parse((await request.json()) as unknown);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ApiRouteError(
        error.issues[0]?.message ??
          "La petición del estudio documental no tiene el formato esperado.",
        400,
      );
    }

    throw new ApiRouteError(
      "No se ha podido leer la consulta del estudio documental.",
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
            "Necesitas iniciar sesión para consultar la documentación del despacho.",
        },
        { status: 401 },
      );
    }

    throw error;
  }

  try {
    const payload = await parseRequestBody(request);
    const { user: appUser } = await requireFeatureAccess("ai_contracts");
    const usage = await getCurrentAiUsageSnapshot(appUser);
    const answer = await answerStudyQuestionForUser({
      userId: appUser.id,
      question: payload.question,
    });

    if (answer.usedLocalAi) {
      await incrementDailyAiUsage(appUser.id, getAiDailyLimit(), usage.date);
    }

    if (isLocalFileMode()) {
      await recordLocalAuditEvent({
        userId: appUser.id,
        actorType: "user",
        actorId: appUser.id,
        source: "ai",
        action: "study_query_run",
        entityType: "study_session",
        entityId: null,
        afterJson: {
          provider: answer.provider,
          model: answer.model,
          citations: answer.citations.length,
          usedLocalAi: answer.usedLocalAi,
        },
        contextJson: {
          questionLength: payload.question.length,
        },
      });
    }

    return NextResponse.json({
      answerText: answer.answerText,
      provider: answer.provider,
      model: answer.model,
      citations: answer.citations,
    });
  } catch (error) {
    const message =
      error instanceof ApiRouteError
        ? error.message
        : error instanceof Error
          ? error.message
          : "No se ha podido resolver la consulta documental.";
    const status = error instanceof ApiRouteError ? error.status : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
