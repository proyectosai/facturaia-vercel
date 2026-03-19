import { NextResponse } from "next/server";
import { isRedirectError } from "next/dist/client/components/redirect-error";

import { exportBackupForUser } from "@/lib/backups";
import { isDemoMode } from "@/lib/demo";
import {
  buildRemoteBackupFilename,
  logRemoteBackupRun,
  pushBackupToRemoteWebdav,
} from "@/lib/remote-backups";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    if (isDemoMode()) {
      return NextResponse.json(
        {
          error:
            "El envío remoto está desactivado en modo demo. Activa la instalación real para probarlo.",
        },
        { status: 400 },
      );
    }

    const user = await requireUser();
    const backup = await exportBackupForUser(user.id, user.email ?? "");
    const fileName = buildRemoteBackupFilename(user.id);
    const body = JSON.stringify(backup, null, 2);

    try {
      const result = await pushBackupToRemoteWebdav({
        userId: user.id,
        fileName,
        body,
      });

      await logRemoteBackupRun(user.id, {
        provider: result.provider,
        status: "success",
        file_name: result.fileName,
        remote_path: result.remotePath,
        error_message: null,
      });

      return NextResponse.json({
        ok: true,
        provider: result.provider,
        remotePath: result.remotePath,
        fileName: result.fileName,
      });
    } catch (error) {
      await logRemoteBackupRun(user.id, {
        provider: "webdav",
        status: "error",
        file_name: fileName,
        remote_path: "",
        error_message:
          error instanceof Error
            ? error.message
            : "No se ha podido subir el backup remoto.",
      }).catch(() => null);

      throw error;
    }
  } catch (error) {
    if (isRedirectError(error)) {
      return NextResponse.json(
        { error: "Necesitas iniciar sesión para enviar un backup remoto." },
        { status: 401 },
      );
    }

    if (
      error instanceof Error &&
      (error.message.includes("no está configurado") ||
        error.message.includes("variables") ||
        error.message.includes("WebDAV"))
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se ha podido enviar el backup remoto.",
      },
      { status: 500 },
    );
  }
}
