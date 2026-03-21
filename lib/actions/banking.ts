"use server";

import { revalidateAppPath } from "@/lib/actions/revalidate-path";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { rethrowIfRedirectError } from "@/lib/actions/redirect-error";
import { getBankMovementByIdForUser, parseBankCsvFile } from "@/lib/banking";
import { syncInvoicePaymentStatusFromBankMatches } from "@/lib/collections-server";
import { isDemoMode, isLocalFileMode } from "@/lib/demo";
import {
  createLocalBankMovementRecords,
  reconcileLocalBankMovement,
} from "@/lib/local-core";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const importBankMovementsSchema = z.object({
  accountLabel: z.string().trim().min(2, "Indica una cuenta o alias para el extracto."),
});

function getFirstErrorMessage(error: unknown) {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? "Revisa el formulario.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Ha ocurrido un error inesperado.";
}

export async function importBankMovementsAction(formData: FormData) {
  try {
    if (isDemoMode()) {
      redirect(
        "/banca?error=Modo%20demo:%20la%20importaci%C3%B3n%20real%20de%20extractos%20est%C3%A1%20desactivada.",
      );
    }

    const user = await requireUser();
    const payload = importBankMovementsSchema.parse({
      accountLabel: String(formData.get("accountLabel") ?? ""),
    });
    const file = formData.get("statement");

    if (!(file instanceof File) || file.size === 0) {
      throw new Error("Adjunta un extracto CSV antes de importar.");
    }

    const parsedRows = parseBankCsvFile({
      fileText: await file.text(),
      fileName: file.name || "extracto.csv",
      accountLabel: payload.accountLabel,
    });

    if (isLocalFileMode()) {
      const createdRows = await createLocalBankMovementRecords({
        userId: user.id,
        rows: parsedRows,
      });

      if (createdRows.length === 0) {
        throw new Error(
          "Todos los movimientos de este fichero ya estaban importados anteriormente.",
        );
      }

      revalidateAppPath("/banca");
      revalidateAppPath("/backups");
      revalidateAppPath("/modules");
      revalidateAppPath("/system");
      redirect(`/banca?created=${createdRows.length}`);
    }

    const supabase = await createServerSupabaseClient();
    const sourceHashes = parsedRows.map((row) => row.sourceHash);
    const { data: existingRows, error: existingError } = await supabase
      .from("bank_movements")
      .select("source_hash")
      .eq("user_id", user.id)
      .in("source_hash", sourceHashes);

    if (existingError) {
      throw new Error("No se ha podido comprobar si el extracto ya estaba importado.");
    }

    const existingHashes = new Set(
      ((existingRows ?? []) as Array<{ source_hash: string }>).map((row) => row.source_hash),
    );
    const rowsToInsert = parsedRows.filter((row) => !existingHashes.has(row.sourceHash));

    if (rowsToInsert.length === 0) {
      throw new Error(
        "Todos los movimientos de este fichero ya estaban importados anteriormente.",
      );
    }

    const { error } = await supabase.from("bank_movements").insert(
      rowsToInsert.map((row) => ({
        user_id: user.id,
        account_label: row.accountLabel,
        booking_date: row.bookingDate,
        value_date: row.valueDate,
        description: row.description,
        counterparty_name: row.counterpartyName,
        amount: row.amount,
        currency: row.currency,
        direction: row.direction,
        balance: row.balance,
        status: "pending",
        source_file_name: row.sourceFileName,
        source_hash: row.sourceHash,
        raw_row: row.rawRow,
      })),
    );

    if (error) {
      throw new Error("No se ha podido guardar el extracto bancario.");
    }

    revalidateAppPath("/banca");
    revalidateAppPath("/backups");
    revalidateAppPath("/modules");
    revalidateAppPath("/system");
    redirect(`/banca?created=${rowsToInsert.length}`);
  } catch (error) {
    rethrowIfRedirectError(error);
    redirect(`/banca?error=${encodeURIComponent(getFirstErrorMessage(error))}`);
  }
}

const reconcileBankMovementSchema = z.object({
  movementId: z.string().uuid("Movimiento no válido."),
  actionKind: z.enum(["match_invoice", "match_expense", "ignore", "clear"]),
  targetId: z.string().uuid().optional(),
  notes: z.string().trim().max(2000).optional(),
});

export async function reconcileBankMovementAction(formData: FormData) {
  try {
    if (isDemoMode()) {
      redirect(
        "/banca?error=Modo%20demo:%20la%20conciliaci%C3%B3n%20real%20est%C3%A1%20desactivada.",
      );
    }

    const user = await requireUser();
    const payload = reconcileBankMovementSchema.parse({
      movementId: String(formData.get("movementId") ?? ""),
      actionKind: String(formData.get("actionKind") ?? ""),
      targetId: String(formData.get("targetId") ?? "") || undefined,
      notes: String(formData.get("notes") ?? "") || undefined,
    });
    const movement = await getBankMovementByIdForUser(user.id, payload.movementId);

    if (!movement) {
      throw new Error("No se ha podido cargar el movimiento bancario.");
    }

    if (isLocalFileMode()) {
      if (
        (payload.actionKind === "match_invoice" || payload.actionKind === "match_expense") &&
        !payload.targetId
      ) {
        throw new Error(
          payload.actionKind === "match_invoice"
            ? "Selecciona una factura para conciliar el movimiento."
            : "Selecciona un gasto para conciliar el movimiento.",
        );
      }

      const updatedMovement = await reconcileLocalBankMovement({
        userId: user.id,
        movementId: payload.movementId,
        actionKind: payload.actionKind,
        targetId: payload.targetId,
        notes: payload.notes ?? null,
      });

      if (!updatedMovement) {
        throw new Error("No se ha podido actualizar el estado del movimiento.");
      }

      const affectedInvoiceIds = new Set<string>();

      if (movement.matched_invoice_id) {
        affectedInvoiceIds.add(movement.matched_invoice_id);
      }

      if (payload.actionKind === "match_invoice" && payload.targetId) {
        affectedInvoiceIds.add(payload.targetId);
      }

      await syncInvoicePaymentStatusFromBankMatches(
        user.id,
        Array.from(affectedInvoiceIds),
      );

      revalidateAppPath("/banca");
      revalidateAppPath("/dashboard");
      revalidateAppPath("/invoices");
      revalidateAppPath("/cobros");
      revalidateAppPath("/clientes");
      revalidateAppPath("/backups");
      redirect("/banca?updated=1");
    }

    const supabase = await createServerSupabaseClient();
    const affectedInvoiceIds = new Set<string>();

    if (movement.matched_invoice_id) {
      affectedInvoiceIds.add(movement.matched_invoice_id);
    }

    let updatePayload:
      | {
          status: "pending" | "reconciled" | "ignored";
          matched_invoice_id: string | null;
          matched_expense_id: string | null;
          notes: string | null;
        }
      | null = null;

    if (payload.actionKind === "match_invoice") {
      if (!payload.targetId) {
        throw new Error("Selecciona una factura para conciliar el movimiento.");
      }

      affectedInvoiceIds.add(payload.targetId);
      updatePayload = {
        status: "reconciled",
        matched_invoice_id: payload.targetId,
        matched_expense_id: null,
        notes: payload.notes ?? movement.notes ?? "Conciliado manualmente con una factura.",
      };
    } else if (payload.actionKind === "match_expense") {
      if (!payload.targetId) {
        throw new Error("Selecciona un gasto para conciliar el movimiento.");
      }

      updatePayload = {
        status: "reconciled",
        matched_invoice_id: null,
        matched_expense_id: payload.targetId,
        notes: payload.notes ?? movement.notes ?? "Conciliado manualmente con un gasto.",
      };
    } else if (payload.actionKind === "ignore") {
      updatePayload = {
        status: "ignored",
        matched_invoice_id: null,
        matched_expense_id: null,
        notes: payload.notes ?? movement.notes ?? "Marcado como ignorado manualmente.",
      };
    } else if (payload.actionKind === "clear") {
      updatePayload = {
        status: "pending",
        matched_invoice_id: null,
        matched_expense_id: null,
        notes: payload.notes ?? null,
      };
    }

    const { error } = await supabase
      .from("bank_movements")
      .update(updatePayload)
      .eq("id", payload.movementId)
      .eq("user_id", user.id);

    if (error) {
      throw new Error("No se ha podido actualizar el estado del movimiento.");
    }

    await syncInvoicePaymentStatusFromBankMatches(
      user.id,
      Array.from(affectedInvoiceIds),
    );

    revalidateAppPath("/banca");
    revalidateAppPath("/dashboard");
    revalidateAppPath("/invoices");
    revalidateAppPath("/cobros");
    revalidateAppPath("/clientes");
    revalidateAppPath("/backups");
    redirect("/banca?updated=1");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirect(`/banca?error=${encodeURIComponent(getFirstErrorMessage(error))}`);
  }
}
