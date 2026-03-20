import "server-only";

import { isDemoMode, isLocalFileMode } from "@/lib/demo";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { InvoicePaymentStatus, InvoiceRecord } from "@/lib/types";
import { roundCurrency, toNumber } from "@/lib/utils";

function toPaidAtIso(dateValue: string | null) {
  if (!dateValue) {
    return null;
  }

  return new Date(`${dateValue}T12:00:00.000Z`).toISOString();
}

function resolveSyncedPaymentStatus(
  amountPaid: number,
  grandTotal: number,
): InvoicePaymentStatus {
  if (amountPaid <= 0) {
    return "pending";
  }

  if (amountPaid + 0.01 >= grandTotal) {
    return "paid";
  }

  return "partial";
}

export async function syncInvoicePaymentStatusFromBankMatches(
  userId: string,
  invoiceIds: string[],
) {
  if (isDemoMode() || isLocalFileMode()) {
    return;
  }

  const uniqueInvoiceIds = Array.from(
    new Set(invoiceIds.map((invoiceId) => invoiceId.trim()).filter(Boolean)),
  );

  if (uniqueInvoiceIds.length === 0) {
    return;
  }

  const supabase = await createServerSupabaseClient();
  const [{ data: invoices, error: invoiceError }, { data: movements, error: movementError }] =
    await Promise.all([
      supabase
        .from("invoices")
        .select("id, user_id, grand_total")
        .eq("user_id", userId)
        .in("id", uniqueInvoiceIds),
      supabase
        .from("bank_movements")
        .select("matched_invoice_id, amount, booking_date")
        .eq("user_id", userId)
        .eq("status", "reconciled")
        .eq("direction", "credit")
        .in("matched_invoice_id", uniqueInvoiceIds),
    ]);

  if (invoiceError) {
    throw new Error("No se han podido cargar las facturas para sincronizar cobros.");
  }

  if (movementError) {
    throw new Error("No se han podido cargar los movimientos conciliados.");
  }

  const movementMap = new Map<
    string,
    Array<{ amount: number; booking_date: string | null }>
  >();

  for (const movement of
    ((movements ?? []) as Array<{
      matched_invoice_id: string | null;
      amount: number | string;
      booking_date: string | null;
    }>)) {
    if (!movement.matched_invoice_id) {
      continue;
    }

    const current = movementMap.get(movement.matched_invoice_id) ?? [];
    current.push({
      amount: Math.abs(toNumber(movement.amount)),
      booking_date: movement.booking_date,
    });
    movementMap.set(movement.matched_invoice_id, current);
  }

  for (const invoice of (invoices ?? []) as Array<
    Pick<InvoiceRecord, "id" | "grand_total">
  >) {
    const matchedMovements = movementMap.get(invoice.id) ?? [];
    const amountPaid = roundCurrency(
      matchedMovements.reduce((sum, movement) => sum + movement.amount, 0),
    );
    const latestBookingDate =
      matchedMovements
        .map((movement) => movement.booking_date)
        .filter(Boolean)
        .sort()
        .at(-1) ?? null;
    const paymentStatus = resolveSyncedPaymentStatus(
      amountPaid,
      roundCurrency(toNumber(invoice.grand_total)),
    );

    const { error } = await supabase
      .from("invoices")
      .update({
        amount_paid: amountPaid,
        payment_status: paymentStatus,
        paid_at: paymentStatus === "paid" ? toPaidAtIso(latestBookingDate) : null,
      })
      .eq("id", invoice.id)
      .eq("user_id", userId);

    if (error) {
      throw new Error("No se ha podido sincronizar el estado de cobro de la factura.");
    }
  }
}
