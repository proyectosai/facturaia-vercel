import { NextResponse } from "next/server";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { z } from "zod";

import { getCurrentAppUser, requireUser } from "@/lib/auth";
import { isLocalFileMode } from "@/lib/demo";
import {
  createStudyDocumentFromFile,
  createStudyNoteForUser,
  deleteStudyDocumentForUser,
  listStudyDocumentsForUser,
} from "@/lib/document-study";
import { recordLocalAuditEvent } from "@/lib/local-core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const deletePayloadSchema = z.object({
  documentId: z.string().trim().min(1, "Falta el identificador del documento."),
});

class ApiRouteError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function requireAuthenticatedAppUser() {
  try {
    await requireUser();
    return getCurrentAppUser();
  } catch (error) {
    if (isRedirectError(error)) {
      throw new ApiRouteError(
        "Necesitas iniciar sesión para trabajar con el estudio documental.",
        401,
      );
    }

    throw error;
  }
}

export async function GET() {
  try {
    const appUser = await requireAuthenticatedAppUser();
    const documents = await listStudyDocumentsForUser(appUser.id);

    return NextResponse.json({ documents });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof ApiRouteError
            ? error.message
            : error instanceof Error
              ? error.message
              : "No se ha podido cargar la biblioteca documental.",
      },
      { status: error instanceof ApiRouteError ? error.status : 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const appUser = await requireAuthenticatedAppUser();
    const formData = await request.formData();
    const title = String(formData.get("title") ?? "").trim();
    const rawText = String(formData.get("text") ?? "").trim();
    const file = formData.get("file");

    let document;

    if (rawText) {
      document = await createStudyNoteForUser({
        userId: appUser.id,
        title,
        text: rawText,
      });
    } else if (file instanceof File) {
      document = await createStudyDocumentFromFile({
        userId: appUser.id,
        title,
        file,
      });
    } else {
      throw new ApiRouteError(
        "Aporta una nota o un archivo TXT, MD o PDF para poder estudiarlo.",
        400,
      );
    }

    if (isLocalFileMode()) {
      await recordLocalAuditEvent({
        userId: appUser.id,
        actorType: "user",
        actorId: appUser.id,
        source: "ai",
        action: "study_document_saved",
        entityType: "study_document",
        entityId: document.id,
        afterJson: {
          title: document.title,
          sourceKind: document.source_kind,
          textLength: document.text_length,
          chunkCount: document.chunk_count,
        },
      });
    }

    const documents = await listStudyDocumentsForUser(appUser.id);

    return NextResponse.json({
      document,
      documents,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof ApiRouteError
            ? error.message
            : error instanceof Error
              ? error.message
              : "No se ha podido guardar el documento de estudio.",
      },
      { status: error instanceof ApiRouteError ? error.status : 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const appUser = await requireAuthenticatedAppUser();
    const payload = deletePayloadSchema.parse((await request.json()) as unknown);
    const deleted = await deleteStudyDocumentForUser(appUser.id, payload.documentId);

    if (!deleted) {
      throw new ApiRouteError("El documento ya no existe o no pertenece a esta sesión.", 404);
    }

    if (isLocalFileMode()) {
      await recordLocalAuditEvent({
        userId: appUser.id,
        actorType: "user",
        actorId: appUser.id,
        source: "ai",
        action: "study_document_deleted",
        entityType: "study_document",
        entityId: deleted.id,
        beforeJson: {
          title: deleted.title,
          sourceKind: deleted.source_kind,
          textLength: deleted.text_length,
        },
      });
    }

    const documents = await listStudyDocumentsForUser(appUser.id);

    return NextResponse.json({
      deletedId: deleted.id,
      documents,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof z.ZodError
            ? error.issues[0]?.message ?? "La petición no tiene el formato esperado."
            : error instanceof ApiRouteError
              ? error.message
              : error instanceof Error
                ? error.message
                : "No se ha podido eliminar el documento de estudio.",
      },
      {
        status:
          error instanceof z.ZodError
            ? 400
            : error instanceof ApiRouteError
              ? error.status
              : 500,
      },
    );
  }
}
