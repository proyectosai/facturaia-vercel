/* eslint-disable jsx-a11y/alt-text */

import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import QRCode from "qrcode";
import { z } from "zod";

import type {
  InvoiceLineItemInput,
  InvoiceLineItemStored,
  InvoiceRecord,
  InvoiceTotals,
  InvoiceVatBreakdown,
  VatRate,
} from "@/lib/types";
import { buildPublicInvoiceUrl } from "@/lib/invoice-files";
import {
  createSlug,
  formatCurrency,
  formatDateLong,
  formatInvoiceNumber,
  roundCurrency,
  toNumber,
} from "@/lib/utils";

const invoiceLineSchema = z.object({
  description: z.string().trim().min(3, "Cada línea debe tener una descripción."),
  quantity: z.number().positive("La cantidad debe ser mayor que cero."),
  unitPrice: z.number().nonnegative("El precio unitario no puede ser negativo."),
  vatRate: z.union([z.literal(21), z.literal(10), z.literal(4)]),
});

export const invoiceFormSchema = z.object({
  issuerName: z.string().trim().min(2, "Indica el nombre del emisor."),
  issuerNif: z.string().trim().min(5, "Indica el NIF del emisor."),
  issuerAddress: z.string().trim().min(8, "Indica la dirección del emisor."),
  clientName: z.string().trim().min(2, "Indica el nombre del cliente."),
  clientNif: z.string().trim().min(5, "Indica el NIF del cliente."),
  clientAddress: z.string().trim().min(8, "Indica la dirección del cliente."),
  clientEmail: z.email("Indica un email válido para el cliente."),
  issueDate: z.string().min(1, "Selecciona la fecha de emisión."),
  irpfRate: z.number().min(0).max(100),
});

type NormalizedInvoiceRecord = Omit<
  InvoiceRecord,
  "subtotal" | "vat_total" | "irpf_rate" | "irpf_amount" | "grand_total"
> & {
  subtotal: number;
  vat_total: number;
  irpf_rate: number;
  irpf_amount: number;
  grand_total: number;
};

const pdfStyles = StyleSheet.create({
  page: {
    paddingTop: 34,
    paddingHorizontal: 34,
    paddingBottom: 28,
    fontFamily: "Helvetica",
    fontSize: 10.5,
    color: "#12292f",
    backgroundColor: "#fffdf8",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 24,
  },
  brandBlock: {
    flexDirection: "row",
    gap: 14,
    flex: 1,
  },
  logo: {
    width: 62,
    height: 62,
    borderRadius: 16,
    objectFit: "cover",
  },
  logoFallback: {
    width: 62,
    height: 62,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1d4850",
  },
  logoFallbackText: {
    color: "#f3ede4",
    fontSize: 13,
    fontWeight: "bold",
  },
  headerText: {
    gap: 4,
  },
  eyebrow: {
    fontSize: 9.5,
    color: "#5f6d71",
    textTransform: "uppercase",
    letterSpacing: 0.9,
  },
  title: {
    fontSize: 24,
    color: "#102d35",
    fontWeight: "bold",
  },
  subtitle: {
    color: "#54666b",
    lineHeight: 1.45,
  },
  qrBlock: {
    width: 118,
    padding: 10,
    borderRadius: 18,
    backgroundColor: "#f2eadf",
    alignItems: "center",
    gap: 6,
  },
  qr: {
    width: 88,
    height: 88,
  },
  qrCaption: {
    fontSize: 8.2,
    textAlign: "center",
    color: "#4c6064",
  },
  metaGrid: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 20,
  },
  metaCard: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#f7f1e8",
    gap: 5,
  },
  metaTitle: {
    fontSize: 8.8,
    color: "#68777b",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  metaValue: {
    fontSize: 11,
    lineHeight: 1.45,
  },
  sectionTitle: {
    marginBottom: 10,
    fontSize: 10,
    color: "#5d6a6e",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  table: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e3d9cb",
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#163942",
    color: "#fffdf8",
    fontWeight: "bold",
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  row: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#ece4d8",
  },
  rowAlt: {
    backgroundColor: "#fcfaf6",
  },
  cellDescription: {
    flex: 2.5,
    paddingRight: 8,
  },
  cell: {
    flex: 1,
    textAlign: "right",
  },
  summaryWrap: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 18,
    marginTop: 10,
  },
  summaryNote: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#eef5f2",
    gap: 6,
  },
  summaryBox: {
    width: 220,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#102d35",
    color: "#fffdf8",
    gap: 8,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
  },
  summaryLabel: {
    color: "#d6e4df",
  },
  summaryValue: {
    color: "#fffdf8",
  },
  totalRow: {
    paddingTop: 8,
    marginTop: 2,
    borderTopWidth: 1,
    borderTopColor: "#38535a",
  },
  totalLabel: {
    fontSize: 11.5,
    fontWeight: "bold",
    color: "#fffdf8",
  },
  totalValue: {
    fontSize: 11.5,
    fontWeight: "bold",
    color: "#fffdf8",
  },
  footer: {
    marginTop: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e9dfd3",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: {
    color: "#5b696d",
    fontSize: 8.8,
  },
  footerBadge: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#eef5f2",
    color: "#214c46",
    fontSize: 8.5,
    fontWeight: "bold",
  },
});

export function parseInvoiceLines(rawValue: string) {
  const unknownValue = JSON.parse(rawValue) as unknown;
  const parsed = z.array(invoiceLineSchema).min(1).parse(unknownValue);

  return parsed.map((line) => ({
    description: line.description,
    quantity: roundCurrency(line.quantity),
    unitPrice: roundCurrency(line.unitPrice),
    vatRate: line.vatRate,
  })) satisfies InvoiceLineItemInput[];
}

export function calculateInvoice(lines: InvoiceLineItemInput[], irpfRate: number) {
  const breakdownMap = new Map<VatRate, InvoiceVatBreakdown>();

  const lineItems = lines.map((line) => {
    const lineBase = roundCurrency(line.quantity * line.unitPrice);
    const vatAmount = roundCurrency(lineBase * (line.vatRate / 100));
    const lineTotal = roundCurrency(lineBase + vatAmount);
    const current = breakdownMap.get(line.vatRate) ?? {
      rate: line.vatRate,
      taxableBase: 0,
      vatAmount: 0,
    };

    current.taxableBase = roundCurrency(current.taxableBase + lineBase);
    current.vatAmount = roundCurrency(current.vatAmount + vatAmount);

    breakdownMap.set(line.vatRate, current);

    return {
      ...line,
      lineBase,
      vatAmount,
      lineTotal,
    } satisfies InvoiceLineItemStored;
  });

  const subtotal = roundCurrency(
    lineItems.reduce((sum, line) => sum + line.lineBase, 0),
  );
  const vatTotal = roundCurrency(
    lineItems.reduce((sum, line) => sum + line.vatAmount, 0),
  );
  const cleanIrpfRate = roundCurrency(irpfRate);
  const irpfAmount = roundCurrency(subtotal * (cleanIrpfRate / 100));
  const grandTotal = roundCurrency(subtotal + vatTotal - irpfAmount);
  const vatBreakdown = Array.from(breakdownMap.values()).sort(
    (left, right) => right.rate - left.rate,
  );

  return {
    lineItems,
    totals: {
      subtotal,
      vatTotal,
      irpfRate: cleanIrpfRate,
      irpfAmount,
      grandTotal,
      vatBreakdown,
    } satisfies InvoiceTotals,
  };
}

export function normaliseInvoiceRecord(
  invoice: InvoiceRecord,
): NormalizedInvoiceRecord {
  return {
    ...invoice,
    invoice_number: Number(invoice.invoice_number),
    subtotal: toNumber(invoice.subtotal),
    vat_total: toNumber(invoice.vat_total),
    irpf_rate: toNumber(invoice.irpf_rate),
    irpf_amount: toNumber(invoice.irpf_amount),
    grand_total: toNumber(invoice.grand_total),
    line_items: (invoice.line_items ?? []).map((line) => ({
      ...line,
      quantity: toNumber(line.quantity),
      unitPrice: toNumber(line.unitPrice),
      lineBase: toNumber(line.lineBase),
      vatAmount: toNumber(line.vatAmount),
      lineTotal: toNumber(line.lineTotal),
    })),
    vat_breakdown: (invoice.vat_breakdown ?? []).map((entry) => ({
      ...entry,
      taxableBase: toNumber(entry.taxableBase),
      vatAmount: toNumber(entry.vatAmount),
    })),
  };
}

export function getLogoStoragePath(userId: string, fileName: string) {
  const safeFileName = createSlug(fileName.replace(/\.[^.]+$/, "")) || "logo";
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "png";

  return `${userId}/${safeFileName}-${Date.now()}.${extension}`;
}

function InvoicePdfDocument({
  invoice,
  publicUrl,
  qrCodeDataUrl,
}: {
  invoice: NormalizedInvoiceRecord;
  publicUrl: string;
  qrCodeDataUrl: string;
}) {
  return (
    <Document title={`Factura ${formatInvoiceNumber(invoice.invoice_number)}`}>
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.header}>
          <View style={pdfStyles.brandBlock}>
            {invoice.issuer_logo_url ? (
              <Image src={invoice.issuer_logo_url} style={pdfStyles.logo} />
            ) : (
              <View style={pdfStyles.logoFallback}>
                <Text style={pdfStyles.logoFallbackText}>FIA</Text>
              </View>
            )}

            <View style={pdfStyles.headerText}>
              <Text style={pdfStyles.eyebrow}>FacturaIA</Text>
              <Text style={pdfStyles.title}>
                {formatInvoiceNumber(invoice.invoice_number)}
              </Text>
              <Text style={pdfStyles.subtitle}>
                Factura emitida el {formatDateLong(invoice.issue_date)}
              </Text>
              <Text style={pdfStyles.subtitle}>{publicUrl}</Text>
            </View>
          </View>

          <View style={pdfStyles.qrBlock}>
            <Image src={qrCodeDataUrl} style={pdfStyles.qr} />
            <Text style={pdfStyles.qrCaption}>
              Escanea para abrir la versión pública de la factura.
            </Text>
          </View>
        </View>

        <View style={pdfStyles.metaGrid}>
          <View style={pdfStyles.metaCard}>
            <Text style={pdfStyles.metaTitle}>Emisor</Text>
            <Text style={pdfStyles.metaValue}>{invoice.issuer_name}</Text>
            <Text style={pdfStyles.metaValue}>NIF: {invoice.issuer_nif}</Text>
            <Text style={pdfStyles.metaValue}>{invoice.issuer_address}</Text>
          </View>

          <View style={pdfStyles.metaCard}>
            <Text style={pdfStyles.metaTitle}>Cliente</Text>
            <Text style={pdfStyles.metaValue}>{invoice.client_name}</Text>
            <Text style={pdfStyles.metaValue}>NIF: {invoice.client_nif}</Text>
            <Text style={pdfStyles.metaValue}>{invoice.client_address}</Text>
            <Text style={pdfStyles.metaValue}>{invoice.client_email}</Text>
          </View>
        </View>

        <Text style={pdfStyles.sectionTitle}>Detalle de conceptos</Text>
        <View style={pdfStyles.table}>
          <View style={pdfStyles.tableHeader}>
            <Text style={pdfStyles.cellDescription}>Descripción</Text>
            <Text style={pdfStyles.cell}>Cantidad</Text>
            <Text style={pdfStyles.cell}>Precio</Text>
            <Text style={pdfStyles.cell}>IVA</Text>
            <Text style={pdfStyles.cell}>Total</Text>
          </View>

          {invoice.line_items.map((line, index) => (
            <View
              key={`${line.description}-${index}`}
              style={index % 2 === 1 ? [pdfStyles.row, pdfStyles.rowAlt] : pdfStyles.row}
            >
              <Text style={pdfStyles.cellDescription}>{line.description}</Text>
              <Text style={pdfStyles.cell}>{line.quantity}</Text>
              <Text style={pdfStyles.cell}>{formatCurrency(line.unitPrice)}</Text>
              <Text style={pdfStyles.cell}>{line.vatRate}%</Text>
              <Text style={pdfStyles.cell}>{formatCurrency(line.lineTotal)}</Text>
            </View>
          ))}
        </View>

        <View style={pdfStyles.summaryWrap}>
          <View style={pdfStyles.summaryNote}>
            <Text style={pdfStyles.metaTitle}>Desglose de IVA</Text>
            {invoice.vat_breakdown.map((entry) => (
              <Text key={entry.rate} style={pdfStyles.metaValue}>
                IVA {entry.rate}% sobre {formatCurrency(entry.taxableBase)}:{" "}
                {formatCurrency(entry.vatAmount)}
              </Text>
            ))}
            <Text style={pdfStyles.metaValue}>
              Documento preparado para circuitos de facturación españoles y
              seguimiento posterior con VeriFactu.
            </Text>
          </View>

          <View style={pdfStyles.summaryBox}>
            <View style={pdfStyles.summaryRow}>
              <Text style={pdfStyles.summaryLabel}>Base imponible</Text>
              <Text style={pdfStyles.summaryValue}>
                {formatCurrency(invoice.subtotal)}
              </Text>
            </View>
            <View style={pdfStyles.summaryRow}>
              <Text style={pdfStyles.summaryLabel}>IVA total</Text>
              <Text style={pdfStyles.summaryValue}>
                {formatCurrency(invoice.vat_total)}
              </Text>
            </View>

            {invoice.irpf_rate > 0 ? (
              <View style={pdfStyles.summaryRow}>
                <Text style={pdfStyles.summaryLabel}>
                  Retención IRPF ({invoice.irpf_rate}%)
                </Text>
                <Text style={pdfStyles.summaryValue}>
                  -{formatCurrency(invoice.irpf_amount)}
                </Text>
              </View>
            ) : null}

            <View style={[pdfStyles.summaryRow, pdfStyles.totalRow]}>
              <Text style={pdfStyles.totalLabel}>Total factura</Text>
              <Text style={pdfStyles.totalValue}>
                {formatCurrency(invoice.grand_total)}
              </Text>
            </View>
          </View>
        </View>

        <View style={pdfStyles.footer}>
          <Text style={pdfStyles.footerText}>
            Emitida mediante FacturaIA. Conserva esta factura junto con su
            justificante de cobro.
          </Text>
          <Text style={pdfStyles.footerBadge}>
            Factura preparada para VeriFactu
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export async function renderInvoicePdfBuffer(invoiceRecord: InvoiceRecord) {
  const invoice = normaliseInvoiceRecord(invoiceRecord);
  const publicUrl = buildPublicInvoiceUrl(invoice.public_id);
  const qrCodeDataUrl = await QRCode.toDataURL(publicUrl, {
    margin: 0,
    width: 180,
    color: {
      dark: "#12323b",
      light: "#0000",
    },
  });

  return renderToBuffer(
    <InvoicePdfDocument
      invoice={invoice}
      publicUrl={publicUrl}
      qrCodeDataUrl={qrCodeDataUrl}
    />,
  );
}

export function buildInvoiceEmailHtml(invoiceRecord: InvoiceRecord) {
  const invoice = normaliseInvoiceRecord(invoiceRecord);

  return `
    <div style="font-family: Arial, sans-serif; background: #f6f1e8; padding: 24px; color: #17323a;">
      <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 20px; padding: 32px;">
        <p style="margin: 0 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.12em; color: #6c7b80;">
          FacturaIA
        </p>
        <h1 style="margin: 0 0 12px; font-size: 28px;">
          ${formatInvoiceNumber(invoice.invoice_number)}
        </h1>
        <p style="margin: 0 0 20px; line-height: 1.6;">
          Hola ${invoice.client_name}, adjuntamos tu factura emitida el
          ${formatDateLong(invoice.issue_date)} por importe de
          <strong> ${formatCurrency(invoice.grand_total)}</strong>.
        </p>
        <p style="margin: 0 0 20px; line-height: 1.6;">
          También puedes consultarla online aquí:
          <a href="${buildPublicInvoiceUrl(invoice.public_id)}">
            ${buildPublicInvoiceUrl(invoice.public_id)}
          </a>
        </p>
        <p style="margin: 0; line-height: 1.6;">
          Este documento ha sido preparado para flujos compatibles con VeriFactu.
        </p>
      </div>
    </div>
  `;
}
