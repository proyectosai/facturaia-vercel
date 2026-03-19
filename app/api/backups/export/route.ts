import { NextResponse } from "next/server";
import { isRedirectError } from "next/dist/client/components/redirect-error";

import { exportBackupForUser, buildBackupFilename } from "@/lib/backups";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    const backup = await exportBackupForUser(user.id, user.email ?? "");

    return new NextResponse(JSON.stringify(backup, null, 2), {
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
