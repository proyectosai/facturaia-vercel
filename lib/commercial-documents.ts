import { z } from "zod";

import {
  demoCommercialDocuments,
  getDemoCommercialDocumentById,
  isDemoMode,
} from "@/lib/demo";
import { calculateInvoice, invoiceFormSchema, parseInvoiceLines } from "@/lib/invoices";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  CommercialDocumentRecord,
  CommercialDocumentStatus,
  CommercialDocumentType,
  InvoiceLineItemInput,
} from "@/lib/types";
import {
  formatCurrency,
  formatDateLong,
  roundCurrency,
  toNumber,
} from "@/lib/utils";

export const commercialDocumentFormSchema = invoiceFormSchema.extend({
  documentType: z.enum(["quote", "delivery_note"]),
  validUntil: z.string().optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const commercialDocumentTypeLabels: Record<CommercialDocumentType, string> = {
  quote: "Presupuesto",
  delivery_note: "Albarán",
};

export const commercialDocumentStatusLabels: Record<CommercialDocumentStatus, string> = {
  draft: "Borrador",
  sent: "Enviado",
  accepted: "Aceptado",
  rejected: "Rechazado",
  delivered: "Entregado",
  signed: "Firmado",
  converted: "Convertido en factura",
};

export function formatCommercialDocumentNumber(
  type: CommercialDocumentType,
  number: number,
) {
  const prefix = type === "quote" ? "PRE" : "ALB";
  return `${prefix}-${String(number).padStart(6, "0")}`;
}

export function normaliseCommercialDocument(
  document: CommercialDocumentRecord,
): CommercialDocumentRecord {
  return {
    ...document,
    document_number: Number(document.document_number),
    subtotal: toNumber(document.subtotal),
    vat_total: toNumber(document.vat_total),
    irpf_rate: toNumber(document.irpf_rate),
    irpf_amount: toNumber(document.irpf_amount),
    grand_total: toNumber(document.grand_total),
    line_items: (document.line_items ?? []).map((line) => ({
      ...line,
      quantity: toNumber(line.quantity),
      unitPrice: toNumber(line.unitPrice),
      lineBase: toNumber(line.lineBase),
      vatAmount: toNumber(line.vatAmount),
      lineTotal: toNumber(line.lineTotal),
    })),
    vat_breakdown: (document.vat_breakdown ?? []).map((entry) => ({
      ...entry,
      taxableBase: toNumber(entry.taxableBase),
      vatAmount: toNumber(entry.vatAmount),
    })),
  };
}

export function getCommercialDocumentDefaultValidUntil(
  type: CommercialDocumentType,
  issueDate: string,
) {
  if (type !== "quote") {
    return "";
  }

  const date = new Date(`${issueDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 30);

  return date.toISOString().slice(0, 10);
}

export function getCommercialDocumentStatusActions(
  document: CommercialDocumentRecord,
) {
  if (document.status === "converted" || document.converted_invoice_id) {
    return [];
  }

  if (document.document_type === "quote") {
    return [
      { status: "sent", label: "Marcar como enviado" },
      { status: "accepted", label: "Marcar como aceptado" },
      { status: "rejected", label: "Marcar como rechazado" },
    ].filter((action) => action.status !== document.status) as Array<{
      status: CommercialDocumentStatus;
      label: string;
    }>;
  }

  return [
    { status: "delivered", label: "Marcar como entregado" },
    { status: "signed", label: "Marcar como firmado" },
  ].filter((action) => action.status !== document.status) as Array<{
    status: CommercialDocumentStatus;
    label: string;
  }>;
}

export function canConvertCommercialDocument(document: CommercialDocumentRecord) {
  if (document.converted_invoice_id) {
    return false;
  }

  if (document.document_type === "quote") {
    return document.status === "accepted" || document.status === "sent";
  }

  return document.status === "delivered" || document.status === "signed";
}

export function getCommercialDocumentSummary(
  documents: CommercialDocumentRecord[],
) {
  const quotes = documents.filter((document) => document.document_type === "quote");
  const deliveryNotes = documents.filter(
    (document) => document.document_type === "delivery_note",
  );

  return {
    total: documents.length,
    quotes: quotes.length,
    deliveryNotes: deliveryNotes.length,
    quotePipelineAmount: roundCurrency(
      quotes
        .filter((document) => document.status !== "rejected" && !document.converted_invoice_id)
        .reduce((sum, document) => sum + toNumber(document.grand_total), 0),
    ),
    pendingDeliveryNotes: deliveryNotes.filter((document) => !document.converted_invoice_id)
      .length,
  };
}

export function buildCommercialDocumentClientLabel(
  document: CommercialDocumentRecord,
) {
  return [
    document.client_name,
    document.client_email,
    formatCommercialDocumentNumber(document.document_type, document.document_number),
  ]
    .filter(Boolean)
    .join(" · ");
}

export function buildCommercialDocumentStatusDescription(
  document: CommercialDocumentRecord,
) {
  if (document.converted_invoice_id) {
    return "Ya existe una factura vinculada a este documento.";
  }

  if (document.document_type === "quote") {
    if (document.status === "draft") {
      return "Todavía no consta como enviado al cliente.";
    }

    if (document.status === "sent") {
      return "A la espera de aprobación o rechazo del cliente.";
    }

    if (document.status === "accepted") {
      return "Listo para convertirse en factura cuando quieras emitir.";
    }

    return "Este presupuesto queda cerrado y no generará factura desde este flujo.";
  }

  if (document.status === "draft") {
    return "Úsalo como comprobante interno antes de la entrega.";
  }

  if (document.status === "delivered") {
    return "Entregado al cliente, pendiente de firma o de facturación.";
  }

  return "Firmado o validado, listo para facturar si lo necesitas.";
}

export function buildCommercialDocumentMeta(document: CommercialDocumentRecord) {
  return {
    number: formatCommercialDocumentNumber(
      document.document_type,
      document.document_number,
    ),
    total: formatCurrency(toNumber(document.grand_total)),
    issueDate: formatDateLong(document.issue_date),
    validUntil: document.valid_until ? formatDateLong(document.valid_until) : null,
    lines: document.line_items.length,
  };
}

export function buildCommercialDocumentInsertPayload(input: {
  userId: string;
  documentType: CommercialDocumentType;
  payload: z.infer<typeof commercialDocumentFormSchema>;
  lineItems: ReturnType<typeof calculateInvoice>["lineItems"];
  totals: ReturnType<typeof calculateInvoice>["totals"];
  issuerLogoUrl: string | null;
  notes: string | null;
}) {
  return {
    user_id: input.userId,
    document_type: input.documentType,
    status: "draft" satisfies CommercialDocumentStatus,
    issue_date: input.payload.issueDate,
    valid_until:
      input.documentType === "quote" && input.payload.validUntil
        ? input.payload.validUntil
        : null,
    issuer_name: input.payload.issuerName,
    issuer_nif: input.payload.issuerNif,
    issuer_address: input.payload.issuerAddress,
    issuer_logo_url: input.issuerLogoUrl,
    client_name: input.payload.clientName,
    client_nif: input.payload.clientNif,
    client_address: input.payload.clientAddress,
    client_email: input.payload.clientEmail,
    line_items: input.lineItems,
    vat_breakdown: input.totals.vatBreakdown,
    subtotal: input.totals.subtotal,
    vat_total: input.totals.vatTotal,
    irpf_rate: input.totals.irpfRate,
    irpf_amount: input.totals.irpfAmount,
    grand_total: input.totals.grandTotal,
    notes: input.notes,
  };
}

export function parseCommercialDocumentLines(rawValue: string) {
  return parseInvoiceLines(rawValue) satisfies InvoiceLineItemInput[];
}

export async function getCommercialDocumentsForUser(
  userId: string,
  filters: {
    query?: string;
    type?: CommercialDocumentType | "all";
  } = {},
) {
  const query = filters.query?.trim().toLowerCase() ?? "";
  const type = filters.type ?? "all";

  if (isDemoMode()) {
    return demoCommercialDocuments
      .map(normaliseCommercialDocument)
      .filter((document) => document.user_id === userId)
      .filter((document) => (type === "all" ? true : document.document_type === type))
      .filter((document) => {
        if (!query) {
          return true;
        }

        const haystack = [
          document.client_name,
          document.client_email,
          document.client_nif,
        ];

        return haystack.some((value) => String(value ?? "").toLowerCase().includes(query));
      })
      .sort((left, right) =>
        new Date(right.issue_date).getTime() - new Date(left.issue_date).getTime(),
      );
  }

  const supabase = await createServerSupabaseClient();
  let dbQuery = supabase
    .from("commercial_documents")
    .select("*")
    .eq("user_id", userId)
    .order("issue_date", { ascending: false });

  if (type !== "all") {
    dbQuery = dbQuery.eq("document_type", type);
  }

  if (query) {
    dbQuery = dbQuery.or(
      `client_name.ilike.%${query}%,client_email.ilike.%${query}%,client_nif.ilike.%${query}%`,
    );
  }

  const { data, error } = await dbQuery;

  if (error) {
    throw new Error("No se han podido cargar los presupuestos y albaranes.");
  }

  return ((data as CommercialDocumentRecord[] | null) ?? []).map(
    normaliseCommercialDocument,
  );
}

export async function getCommercialDocumentByIdForUser(
  userId: string,
  documentId: string,
) {
  if (isDemoMode()) {
    const document = getDemoCommercialDocumentById(documentId);
    return document && document.user_id === userId
      ? normaliseCommercialDocument(document)
      : null;
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("commercial_documents")
    .select("*")
    .eq("id", documentId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error("No se ha podido cargar el documento comercial.");
  }

  if (!data) {
    return null;
  }

  return normaliseCommercialDocument(data as CommercialDocumentRecord);
}
