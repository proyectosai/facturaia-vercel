import type { InvoicePaymentStatus, InvoiceRecord } from "@/lib/types";
import { roundCurrency, toNumber } from "@/lib/utils";

export type InvoiceCollectionState = InvoicePaymentStatus | "overdue";

export type InvoiceReminderBatchKey =
  | "overdue_due"
  | "partial_due"
  | "due_soon";

export type InvoiceReminderQueue = {
  key: InvoiceReminderBatchKey;
  label: string;
  description: string;
  count: number;
  amountPending: number;
};

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

export const invoiceReminderBatchLabels: Record<InvoiceReminderBatchKey, string> = {
  overdue_due: "Vencidas sin aviso reciente",
  partial_due: "Parciales sin seguimiento",
  due_soon: "Próximas a vencer",
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

function differenceInCalendarDays(
  leftTimestamp: number,
  rightTimestamp: number,
) {
  return Math.round((leftTimestamp - rightTimestamp) / (1000 * 60 * 60 * 24));
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

export function getDaysSinceInvoiceReminder(
  invoice: Pick<InvoiceRecord, "last_reminder_at">,
  referenceDate = new Date(),
) {
  if (!invoice.last_reminder_at) {
    return null;
  }

  const reminderDate = new Date(invoice.last_reminder_at);

  if (Number.isNaN(reminderDate.getTime())) {
    return null;
  }

  return differenceInCalendarDays(
    getTodayUtcTimestamp(referenceDate),
    getTodayUtcTimestamp(reminderDate),
  );
}

export function getDaysUntilInvoiceDue(
  invoice: Pick<InvoiceRecord, "due_date">,
  referenceDate = new Date(),
) {
  const dueTimestamp = getDateUtcTimestamp(invoice.due_date);

  if (dueTimestamp === null) {
    return null;
  }

  return differenceInCalendarDays(dueTimestamp, getTodayUtcTimestamp(referenceDate));
}

export function matchesInvoiceReminderBatch(
  invoice: Pick<
    InvoiceRecord,
    | "payment_status"
    | "due_date"
    | "grand_total"
    | "amount_paid"
    | "last_reminder_at"
  >,
  batchKey: InvoiceReminderBatchKey,
  referenceDate = new Date(),
) {
  const collectionState = getInvoiceCollectionState(invoice, referenceDate);
  const daysSinceReminder = getDaysSinceInvoiceReminder(invoice, referenceDate);
  const daysUntilDue = getDaysUntilInvoiceDue(invoice, referenceDate);

  if (batchKey === "overdue_due") {
    return (
      collectionState === "overdue" &&
      (daysSinceReminder === null || daysSinceReminder >= 7)
    );
  }

  if (batchKey === "partial_due") {
    return (
      collectionState === "partial" &&
      (daysSinceReminder === null || daysSinceReminder >= 5)
    );
  }

  return (
    collectionState === "pending" &&
    daysUntilDue !== null &&
    daysUntilDue >= 0 &&
    daysUntilDue <= 3 &&
    (daysSinceReminder === null || daysSinceReminder >= 7)
  );
}

export function getInvoiceReminderQueues(
  invoices: Array<
    Pick<
      InvoiceRecord,
      | "payment_status"
      | "due_date"
      | "grand_total"
      | "amount_paid"
      | "last_reminder_at"
    >
  >,
  referenceDate = new Date(),
) {
  const queueDefinitions: Array<{
    key: InvoiceReminderBatchKey;
    description: string;
  }> = [
    {
      key: "overdue_due",
      description:
        "Facturas vencidas sin recordatorio en los últimos 7 días.",
    },
    {
      key: "partial_due",
      description:
        "Cobros parciales que necesitan un seguimiento adicional.",
    },
    {
      key: "due_soon",
      description:
        "Facturas que vencen en los próximos 3 días y aún no han recibido aviso reciente.",
    },
  ];

  return queueDefinitions.map((queue) => {
    const matchingInvoices = invoices.filter((invoice) =>
      matchesInvoiceReminderBatch(invoice, queue.key, referenceDate),
    );

    return {
      key: queue.key,
      label: invoiceReminderBatchLabels[queue.key],
      description: queue.description,
      count: matchingInvoices.length,
      amountPending: matchingInvoices.reduce(
        (sum, invoice) => sum + getInvoiceAmountOutstanding(invoice),
        0,
      ),
    } satisfies InvoiceReminderQueue;
  });
}
