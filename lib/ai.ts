import { z } from "zod";

import { getLocalAiEnv } from "@/lib/env";

export const AI_DOCUMENT_TYPES = [
  "proposal",
  "quote",
  "service_contract",
  "payment_reminder",
  "invoice_email",
] as const;

export type AiDocumentType = (typeof AI_DOCUMENT_TYPES)[number];

const aiExpenseDraftSchema = z.object({
  vendorName: z.string().nullable(),
  vendorNif: z.string().nullable(),
  expenseDate: z.string().nullable(),
  baseAmount: z.number().nullable(),
  vatAmount: z.number().nullable(),
  totalAmount: z.number().nullable(),
  notes: z.string().nullable().optional(),
  confidence: z.number().min(0).max(1).nullable().optional(),
});

const chatCompletionSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.union([
            z.string(),
            z.array(
              z.object({
                type: z.string().optional(),
                text: z.string().optional(),
              }),
            ),
          ]),
        }),
      }),
    )
    .min(1),
});

export function getAiDocumentLabel(documentType: AiDocumentType) {
  return {
    proposal: "Propuesta de servicios",
    quote: "Presupuesto de servicios",
    service_contract: "Contrato de prestación de servicios",
    payment_reminder: "Recordatorio de pago",
    invoice_email: "Email de envío de factura",
  }[documentType];
}

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

function extractMessageContent(
  content:
    | string
    | Array<{
        type?: string;
        text?: string;
      }>,
) {
  if (typeof content === "string") {
    return content.trim();
  }

  return content
    .map((item) => item.text?.trim() ?? "")
    .filter(Boolean)
    .join("\n")
    .trim();
}

function sanitizeAiText(value: string) {
  return value
    .replace(/^```[a-z]*\n?/i, "")
    .replace(/\n?```$/i, "")
    .replace(/^[•·]\s+/gm, "- ")
    .replace(/[‐‑‒–—―]/g, "-")
    .replace(/[“”«»]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\u2026/g, "...")
    .replace(/[\u00A0\u202F]/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractJsonObject(value: string) {
  const sanitized = sanitizeAiText(value);
  const firstBrace = sanitized.indexOf("{");
  const lastBrace = sanitized.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("La IA local no ha devuelto un bloque JSON válido.");
  }

  return sanitized.slice(firstBrace, lastBrace + 1);
}

async function callLocalChatModel({
  systemPrompt,
  userPrompt,
  temperature = 0.2,
  maxTokens = 1200,
}: {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}) {
  const env = getLocalAiEnv();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);

  try {
    const response = await fetch(
      `${normalizeBaseUrl(env.LM_STUDIO_BASE_URL)}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(env.LM_STUDIO_API_KEY
            ? {
                Authorization: `Bearer ${env.LM_STUDIO_API_KEY}`,
              }
            : {}),
        },
        body: JSON.stringify({
          model: env.LM_STUDIO_MODEL,
          temperature,
          max_tokens: maxTokens,
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: userPrompt,
            },
          ],
        }),
        signal: controller.signal,
      },
    );

    const payload = chatCompletionSchema.parse(
      (await response.json()) as unknown,
    );

    if (!response.ok) {
      throw new Error("La IA local no ha devuelto una respuesta válida.");
    }

    const content = extractMessageContent(payload.choices[0].message.content);

    if (!content) {
      throw new Error("La IA local no ha generado contenido útil.");
    }

    return {
      text: sanitizeAiText(content),
      model: env.LM_STUDIO_MODEL,
      provider: "LM Studio",
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("La IA local ha tardado demasiado en responder.");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function improveInvoiceDescription({
  description,
  context,
}: {
  description: string;
  context?: string;
}) {
  const systemPrompt =
    "Eres un experto en facturación española. Mejora esta descripción para que suene profesional, clara y lista para factura de autónomo. Mantén el tono neutral y español correcto. Devuelve una única frase útil para factura, sin listas ni encabezados. Usa comillas rectas, guion simple y espacios normales.";
  const userPrompt = [
    context?.trim() ? `Contexto adicional:\n${context.trim()}` : null,
    `Descripción base:\n${description.trim()}`,
    "Devuelve solo la descripción mejorada, en una sola línea, sin comillas y sin explicación adicional.",
  ]
    .filter(Boolean)
    .join("\n\n");

  return callLocalChatModel({
    systemPrompt,
    userPrompt,
    temperature: 0.2,
    maxTokens: 220,
  });
}

export async function generateBusinessDocument({
  documentType,
  brief,
  issuerName,
  clientName,
}: {
  documentType: AiDocumentType;
  brief: string;
  issuerName?: string;
  clientName?: string;
}) {
  const systemPrompt =
    "Eres un asistente experto para autónomos españoles. Redactas documentos útiles, profesionales y listos para adaptar. Usa español de España, texto plano claro, título y secciones breves. No uses caracteres tipográficos raros: usa comillas rectas, guion simple y espacios normales. No uses tablas markdown, no uses separadores tipo --- y no inventes direcciones, teléfonos, DNI, cuentas bancarias, fechas exactas ni datos sensibles. Cuando falte un dato, escribe [COMPLETAR]. Si el documento tiene implicaciones legales, añade al final una nota breve recomendando revisión profesional antes de firmar.";
  const intentPrompt = {
    proposal:
      "Redacta una propuesta de servicios orientada a cierre comercial, con alcance, entregables, plazos, precio orientativo y siguiente paso.",
    quote:
      "Redacta un presupuesto profesional para un autónomo español, con objeto del trabajo, alcance incluido, inversión, hitos de pago, validez de la oferta y siguiente paso.",
    service_contract:
      "Redacta un contrato base de prestación de servicios para un autónomo español, con objeto, alcance, honorarios, plazos, propiedad intelectual, confidencialidad, resolución y ley aplicable.",
    payment_reminder:
      "Redacta un recordatorio de pago cordial pero firme, orientado a cobrar una factura vencida sin deteriorar la relación comercial.",
    invoice_email:
      "Redacta un email profesional para acompañar el envío de una factura, con tono claro, amable y orientado a facilitar el pago.",
  }[documentType];

  const userPrompt = [
    `Tipo de documento: ${getAiDocumentLabel(documentType)}`,
    issuerName?.trim() ? `Emisor: ${issuerName.trim()}` : null,
    clientName?.trim() ? `Cliente: ${clientName.trim()}` : null,
    `Brief:\n${brief.trim()}`,
    intentPrompt,
    "Devuelve el documento completo en texto plano bien formateado, con un título claro y apartados útiles. Si faltan importes, fechas o datos de identificación, usa [COMPLETAR]. No uses tablas markdown ni inventes datos.",
  ]
    .filter(Boolean)
    .join("\n\n");

  const completion = await callLocalChatModel({
    systemPrompt,
    userPrompt,
    temperature: 0.35,
    maxTokens: 1400,
  });

  return {
    ...completion,
    title: getAiDocumentLabel(documentType),
    body: completion.text,
  };
}

export async function extractExpenseDataFromText({
  rawText,
  expenseKind,
  fileName,
}: {
  rawText: string;
  expenseKind: "ticket" | "supplier_invoice";
  fileName?: string;
}) {
  const systemPrompt =
    "Eres un asistente experto en revisar justificantes de gasto españoles. Extraes datos útiles de tickets y facturas de proveedor. Devuelve solo JSON válido, sin markdown, sin comentarios y sin texto adicional.";
  const userPrompt = [
    `Tipo de gasto: ${expenseKind === "ticket" ? "ticket" : "factura de proveedor"}`,
    fileName?.trim() ? `Archivo: ${fileName.trim()}` : null,
    "Devuelve un JSON con estas claves exactas:",
    '{"vendorName":string|null,"vendorNif":string|null,"expenseDate":string|null,"baseAmount":number|null,"vatAmount":number|null,"totalAmount":number|null,"notes":string|null,"confidence":number|null}',
    "Reglas:",
    "- usa formato de fecha YYYY-MM-DD si puedes inferirlo",
    "- usa decimales con punto",
    "- si un dato no está claro, devuelve null",
    "- no inventes importes",
    `Texto OCR o extraído:\n${rawText.trim()}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const completion = await callLocalChatModel({
    systemPrompt,
    userPrompt,
    temperature: 0.1,
    maxTokens: 500,
  });

  return aiExpenseDraftSchema.parse(
    JSON.parse(extractJsonObject(completion.text)) as unknown,
  );
}
