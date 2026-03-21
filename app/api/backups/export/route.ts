import { NextResponse } from "next/server";
import { isRedirectError } from "next/dist/client/components/redirect-error";

import {
  buildBackupFilename,
  exportBackupForUser,
  serializeBackupPayload,
} from "@/lib/backups";
import { requireUser } from "@/lib/auth";
import { isLocalFileMode } from "@/lib/demo";
import { getLocalSecurityReadiness } from "@/lib/local-core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (
      isLocalFileMode() &&
      process.env.NODE_ENV === "production" &&
      !getLocalSecurityReadiness().ready
    ) {
      return NextResponse.json(
        {
          error:
            getLocalSecurityReadiness().issues[0] ??
            "La instalación local no cumple los requisitos mínimos de seguridad.",
        },
        { status: 503 },
      );
    }

    const user = await requireUser();
    const backup = await exportBackupForUser(user.id, user.email ?? "");
    const payload = serializeBackupPayload(backup);

    return new NextResponse(payload, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${buildBackupFilename()}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (isRedirectError(error)) {
      return NextResponse.json(
        { error: "Necesitas iniciar sesión para exportar una copia de seguridad." },
        { status: 401 },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se ha podido generar la copia de seguridad.",
      },
      { status: 500 },
    );
  }
}
