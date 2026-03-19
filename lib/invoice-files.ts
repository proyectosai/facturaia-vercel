import { createSlug, formatInvoiceNumber, getBaseUrl } from "@/lib/utils";

export function buildPublicInvoiceUrl(publicId: string) {
  return new URL(`/factura/${publicId}`, getBaseUrl()).toString();
}

export function getInvoicePdfFileName(invoiceNumber: number | string) {
  return `${formatInvoiceNumber(invoiceNumber)}-${createSlug("FacturaIA")}.pdf`;
}
