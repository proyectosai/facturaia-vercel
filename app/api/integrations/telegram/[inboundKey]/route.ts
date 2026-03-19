import { NextResponse } from "next/server";

import { ingestTelegramWebhook } from "@/lib/messages";

export async function POST(
  request: Request,
  context: { params: Promise<{ inboundKey: string }> },
) {
  const { inboundKey } = await context.params;
  const payload = (await request.json()) as Record<string, unknown>;
  const result = await ingestTelegramWebhook(inboundKey, payload);

  if (!result.ok) {
    return NextResponse.json(
      { error: "Conexión de Telegram no encontrada." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, stored: result.stored });
}
