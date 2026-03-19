import { NextResponse } from "next/server";

import {
  ingestWhatsAppWebhook,
  verifyWhatsAppConnection,
} from "@/lib/messages";

export async function GET(
  request: Request,
  context: { params: Promise<{ inboundKey: string }> },
) {
  const { inboundKey } = await context.params;
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const verifyToken = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode !== "subscribe" || !challenge) {
    return new Response("Solicitud de verificación inválida.", { status: 400 });
  }

  const isValid = await verifyWhatsAppConnection(inboundKey, verifyToken);

  if (!isValid) {
    return new Response("Verify token inválido.", { status: 403 });
  }

  return new Response(challenge, { status: 200 });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ inboundKey: string }> },
) {
  const { inboundKey } = await context.params;
  const payload = (await request.json()) as Record<string, unknown>;
  const result = await ingestWhatsAppWebhook(inboundKey, payload);

  if (!result.ok) {
    return NextResponse.json(
      { error: "Conexión de WhatsApp no encontrada." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, stored: result.stored });
}
