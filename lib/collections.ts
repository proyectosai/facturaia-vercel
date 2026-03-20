import type { InvoicePaymentStatus, InvoiceRecord } from "@/lib/types";
import { roundCurrency, toNumber } from "@/lib/utils";

export type InvoiceCollectionState = InvoicePaymentStatus | "overdue";

export type InvoiceCollectionSummary = {
  total: number;
  pending: number;
  partial: number;
  paid: number;
  overdue: number;
  amountBilled: number;
  amountCollected: number;
  amountPending: number;
};

export const invoicePaymentStatusLabels: Record<InvoicePaymentStatus, string> = {
  pending: "Pendiente",
  partial: "Parcial",
  paid: "Cobrada",
};

export const invoiceCollectionStateLabels: Record<InvoiceCollectionState, string> = {
  pending: "Pendiente",
  partial: "Parcial",
  paid: "Cobrada",
  overdue: "Vencida",
};

function getTodayUtcTimestamp(referenceDate = new Date()) {
  return Date.UTC(
    referenceDate.getUTCFullYear(),
    referenceDate.getUTCMonth(),
    referenceDate.getUTCDate(),
    0,
    0,
    0,
    0,
  );
}

function getDateUtcTimestamp(dateValue: string | null | undefined) {
  if (!dateValue) {
    return null;
  }

  const date = new Date(`${dateValue}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.getTime();
}

export function coerceInvoicePaymentStatus(
  value: string | null | undefined,
): InvoicePaymentStatus {
  if (value === "paid" || value === "partial" || value === "pending") {
    return value;
  }

  return "pending";
}

export function getInvoiceAmountPaid(
  invoice: Pick<InvoiceRecord, "amount_paid">,
) {
  return Math.max(0, roundCurrency(toNumber(invoice.amount_paid)));
}

export function getInvoiceAmountOutstanding(
  invoice: Pick<InvoiceRecord, "grand_total" | "amount_paid">,
) {
  return Math.max(
    0,
    roundCurrency(toNumber(invoice.grand_total) - getInvoiceAmountPaid(invoice)),
  );
}

export function isInvoiceOverdue(
  invoice: Pick<InvoiceRecord, "payment_status" | "due_date" | "grand_total" | "amount_paid">,
  referenceDate = new Date(),
) {
  if (coerceInvoicePaymentStatus(invoice.payment_status) === "paid") {
    return false;
  }

  if (getInvoiceAmountOutstanding(invoice) <= 0) {
    return false;
  }

  const dueTimestamp = getDateUtcTimestamp(invoice.due_date);

  if (dueTimestamp === null) {
    return false;
  }

  return dueTimestamp < getTodayUtcTimestamp(referenceDate);
}

export function getInvoiceCollectionState(
  invoice: Pick<
    InvoiceRecord,
    "payment_status" | "due_date" | "grand_total" | "amount_paid"
  >,
  referenceDate = new Date(),
): InvoiceCollectionState {
  const status = coerceInvoicePaymentStatus(invoice.payment_status);

  if (status !== "paid" && isInvoiceOverdue(invoice, referenceDate)) {
    return "overdue";
  }

  return status;
}

export function getInvoiceCollectionSummary(
  invoices: Array<
    Pick<
      InvoiceRecord,
      "grand_total" | "amount_paid" | "payment_status" | "due_date"
    >
  >,
  referenceDate = new Date(),
): InvoiceCollectionSummary {
  return invoices.reduce<InvoiceCollectionSummary>(
    (summary, invoice) => {
      const paid = getInvoiceAmountPaid(invoice);
      const outstanding = getInvoiceAmountOutstanding(invoice);
      const state = getInvoiceCollectionState(invoice, referenceDate);

      summary.total += 1;
      summary.amountBilled = roundCurrency(
        summary.amountBilled + toNumber(invoice.grand_total),
      );
      summary.amountCollected = roundCurrency(summary.amountCollected + paid);
      summary.amountPending = roundCurrency(summary.amountPending + outstanding);

      if (state === "overdue") {
        summary.overdue += 1;
      } else if (state === "pending") {
        summary.pending += 1;
      } else if (state === "partial") {
        summary.partial += 1;
      } else {
        summary.paid += 1;
      }

      return summary;
    },
    {
      total: 0,
      pending: 0,
      partial: 0,
      paid: 0,
      overdue: 0,
      amountBilled: 0,
      amountCollected: 0,
      amountPending: 0,
    },
  );
}
