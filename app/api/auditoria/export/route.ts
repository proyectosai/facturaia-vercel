import { NextResponse } from "next/server";
import { isRedirectError } from "next/dist/client/components/redirect-error";

import { requireUser } from "@/lib/auth";
import { isLocalFileMode } from "@/lib/demo";
import {
  getLocalSecurityPolicy,
  getLocalSecurityReadiness,
  listLocalAuditEventsForUser,
} from "@/lib/local-core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function buildAuditFilename() {
  return `facturaia-audit-${new Date().toISOString().slice(0, 10)}.json`;
}

export async function GET() {
  try {
    if (!isLocalFileMode()) {
      return NextResponse.json(
        {
          error: "La exportación operativa del log de auditoría está disponible en modo local.",
        },
        { status: 400 },
      );
    }

    const securityReadiness = getLocalSecurityReadiness();

    if (process.env.NODE_ENV === "production" && !securityReadiness.ready) {
      return NextResponse.json(
        {
          error:
            securityReadiness.issues[0] ??
            "La instalación local no cumple los requisitos mínimos de seguridad.",
        },
        { status: 503 },
      );
    }

    const user = await requireUser();
    const events = await listLocalAuditEventsForUser(user.id, 5000);
    const payload = JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        user: {
          id: user.id,
          email: user.email ?? "",
        },
        security: {
          readiness: securityReadiness,
          policy: getLocalSecurityPolicy(),
        },
        counts: {
          total: events.length,
        },
        events,
      },
      null,
      2,
    );

    return new NextResponse(payload, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${buildAuditFilename()}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (isRedirectError(error)) {
      return NextResponse.json(
        { error: "Necesitas iniciar sesión para exportar el log de auditoría." },
        { status: 401 },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se ha podido exportar el log de auditoría.",
      },
      { status: 500 },
    );
  }
}
