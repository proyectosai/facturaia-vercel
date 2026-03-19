import type {
  InvoiceLineItemInput,
  InvoiceLineItemStored,
  InvoiceTotals,
  InvoiceVatBreakdown,
  VatRate,
} from "@/lib/types";
import { roundCurrency } from "@/lib/utils";

export function calculateInvoicePreview(
  lines: InvoiceLineItemInput[],
  irpfRate: number,
) {
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
