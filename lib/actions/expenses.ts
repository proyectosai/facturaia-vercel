"use server";

import { revalidateAppPath } from "@/lib/actions/revalidate-path";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { rethrowIfRedirectError } from "@/lib/actions/redirect-error";
import { buildExpenseDraftFromInput, getExpenseByIdForUser, getExpenseStoragePath } from "@/lib/expenses";
import { isDemoMode, isLocalFileMode } from "@/lib/demo";
import {
  createLocalExpenseRecord,
  fileToDataUrl,
  toggleLocalExpenseReview,
} from "@/lib/local-core";
import { assertAllowedUpload, uploadRules } from "@/lib/security";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const createExpenseSchema = z.object({
  expenseKind: z.enum(["ticket", "supplier_invoice"]),
  notes: z.string().trim().max(2000).optional(),
  manualText: z.string().trim().max(20000).optional(),
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

export async function createExpenseAction(formData: FormData) {
  try {
    if (isDemoMode()) {
      redirect(
        "/gastos?error=Modo%20demo:%20la%20creaci%C3%B3n%20real%20de%20gastos%20est%C3%A1%20desactivada.",
      );
    }

    const user = await requireUser();
    const payload = createExpenseSchema.parse({
      expenseKind: String(formData.get("expenseKind") ?? ""),
      notes: String(formData.get("notes") ?? ""),
      manualText: String(formData.get("manualText") ?? ""),
    });
    const file = formData.get("sourceFile");

    if (!(file instanceof File) || file.size === 0) {
      throw new Error("Adjunta un ticket, factura PDF o archivo de texto.");
    }

    assertAllowedUpload(file, uploadRules.expenseSource);
    const { extraction, draft } = await buildExpenseDraftFromInput({
      file,
      expenseKind: payload.expenseKind,
      manualText: payload.manualText,
    });

    if (isLocalFileMode()) {
      const expense = await createLocalExpenseRecord({
        userId: user.id,
        expenseKind: payload.expenseKind,
        reviewStatus: "draft",
        vendorName: draft.vendorName,
        vendorNif: draft.vendorNif,
        expenseDate: draft.expenseDate,
        currency: "EUR",
        baseAmount: draft.baseAmount,
        vatAmount: draft.vatAmount,
        totalAmount: draft.totalAmount,
        notes: payload.notes?.trim() || draft.notes || null,
        sourceFileName: file.name,
        sourceFilePath: await fileToDataUrl(file),
        sourceFileMimeType: file.type || "application/octet-stream",
        extractionMethod: extraction.method,
        rawText: extraction.rawText || null,
        extractedPayload: {
          confidence: draft.confidence ?? null,
          parser: draft.source,
        },
      });

      revalidateAppPath("/gastos");
      revalidateAppPath("/backups");
      revalidateAppPath("/modules");
      redirect(`/gastos?created=${expense.id}`);
    }

    const supabase = await createServerSupabaseClient();
    const storagePath = getExpenseStoragePath(user.id, file.name || "gasto.pdf");
    const { error: uploadError } = await supabase.storage
      .from("expense-files")
      .upload(storagePath, file, {
        contentType: file.type || "application/octet-stream",
        upsert: true,
      });

    if (uploadError) {
      throw new Error("No se ha podido subir el justificante del gasto.");
    }
    const { data, error } = await supabase
      .from("expenses")
      .insert({
        user_id: user.id,
        expense_kind: payload.expenseKind,
        review_status: "draft",
        vendor_name: draft.vendorName,
        vendor_nif: draft.vendorNif,
        expense_date: draft.expenseDate,
        currency: "EUR",
        base_amount: draft.baseAmount,
        vat_amount: draft.vatAmount,
        total_amount: draft.totalAmount,
        notes: payload.notes?.trim() || draft.notes || null,
        source_file_name: file.name,
        source_file_path: storagePath,
        source_file_mime_type: file.type || "application/octet-stream",
        text_extraction_method: extraction.method,
        raw_text: extraction.rawText || null,
        extracted_payload: {
          confidence: draft.confidence ?? null,
          parser: draft.source,
        },
      })
      .select("id")
      .single();

    if (error || !data) {
      throw new Error("No se ha podido guardar el gasto.");
    }

    revalidateAppPath("/gastos");
    revalidateAppPath("/backups");
    revalidateAppPath("/modules");

    redirect(`/gastos?created=${data.id}`);
  } catch (error) {
    rethrowIfRedirectError(error);
    redirect(`/gastos?error=${encodeURIComponent(getFirstErrorMessage(error))}`);
  }
}

export async function markExpenseReviewedAction(formData: FormData) {
  try {
    if (isDemoMode()) {
      redirect(
        "/gastos?error=Modo%20demo:%20la%20revisi%C3%B3n%20real%20de%20gastos%20est%C3%A1%20desactivada.",
      );
    }

    const user = await requireUser();
    const expenseId = String(formData.get("expenseId") ?? "").trim();

    if (!expenseId) {
      throw new Error("Gasto no encontrado.");
    }

    const expense = await getExpenseByIdForUser(user.id, expenseId);

    if (!expense) {
      throw new Error("No se ha podido cargar el gasto.");
    }

    if (isLocalFileMode()) {
      const updatedExpense = await toggleLocalExpenseReview(user.id, expenseId);

      if (!updatedExpense) {
        throw new Error("No se ha podido actualizar el estado del gasto.");
      }

      revalidateAppPath("/gastos");
      revalidateAppPath("/backups");
      redirect("/gastos?updated=1");
    }

    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from("expenses")
      .update({
        review_status: expense.review_status === "draft" ? "reviewed" : "draft",
      })
      .eq("id", expenseId)
      .eq("user_id", user.id);

    if (error) {
      throw new Error("No se ha podido actualizar el estado del gasto.");
    }

    revalidateAppPath("/gastos");
    redirect("/gastos?updated=1");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirect(`/gastos?error=${encodeURIComponent(getFirstErrorMessage(error))}`);
  }
}
