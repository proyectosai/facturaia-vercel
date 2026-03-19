import { NextResponse } from "next/server";
import { isRedirectError } from "next/dist/client/components/redirect-error";

import { requireUser } from "@/lib/auth";
import {
  documentExportSchema,
  getAiDocumentFileName,
  renderAiDocumentDocxBuffer,
} from "@/lib/ai-document-export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await requireUser();
  } catch (error) {
    if (isRedirectError(error)) {
      return NextResponse.json(
        { error: "Necesitas iniciar sesión para exportar documentos." },
        { status: 401 },
      );
    }

    throw error;
  }

  try {
    const payload = documentExportSchema.parse((await request.json()) as unknown);
    const docxBuffer = await renderAiDocumentDocxBuffer(payload);

    return new NextResponse(new Uint8Array(docxBuffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${getAiDocumentFileName(payload.title, "docx")}"`,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se ha podido exportar el Word del documento.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
