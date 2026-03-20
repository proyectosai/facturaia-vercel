"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { rethrowIfRedirectError } from "@/lib/actions/redirect-error";
import { isDemoMode, isLocalFileMode } from "@/lib/demo";
import {
  createLocalFeedbackEntry,
  updateLocalFeedbackStatus,
} from "@/lib/local-core";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const createFeedbackSchema = z.object({
  sourceType: z.enum(["self", "pilot"]),
  moduleKey: z.string().trim().min(2, "Indica el área o módulo."),
  severity: z.enum(["low", "medium", "high"]),
  title: z.string().trim().min(4, "Indica un título más claro."),
  message: z.string().trim().min(12, "Describe mejor el feedback."),
  reporterName: z.string().trim().max(120).optional(),
  contactEmail: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || "")
    .refine((value) => !value || z.email().safeParse(value).success, {
      message: "El email de contacto no es válido.",
    }),
});

const updateFeedbackStatusSchema = z.object({
  entryId: z.string().uuid("Entrada de feedback no válida."),
  status: z.enum(["open", "reviewed", "planned", "resolved"]),
});

function getActionError(error: unknown) {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? "Revisa el formulario.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "No se ha podido completar la acción.";
}

export async function createFeedbackEntryAction(formData: FormData) {
  try {
    if (isDemoMode()) {
      redirect(
        "/feedback?error=Modo%20demo:%20las%20entradas%20de%20feedback%20no%20se%20guardan.",
      );
    }

    const user = await requireUser();
    const payload = createFeedbackSchema.parse({
      sourceType: String(formData.get("sourceType") ?? ""),
      moduleKey: String(formData.get("moduleKey") ?? ""),
      severity: String(formData.get("severity") ?? ""),
      title: String(formData.get("title") ?? ""),
      message: String(formData.get("message") ?? ""),
      reporterName: String(formData.get("reporterName") ?? ""),
      contactEmail: String(formData.get("contactEmail") ?? ""),
    });

    if (isLocalFileMode()) {
      await createLocalFeedbackEntry({
        userId: user.id,
        sourceType: payload.sourceType,
        moduleKey: payload.moduleKey,
        severity: payload.severity,
        title: payload.title,
        message: payload.message,
        reporterName: payload.reporterName?.trim() || null,
        contactEmail: payload.contactEmail || null,
      });

      revalidatePath("/feedback");
      revalidatePath("/dashboard");
      revalidatePath("/backups");
      redirect("/feedback?created=1");
    }

    const supabase = await createServerSupabaseClient();

    const { error } = await supabase.from("feedback_entries").insert({
      user_id: user.id,
      source_type: payload.sourceType,
      module_key: payload.moduleKey,
      severity: payload.severity,
      status: "open",
      title: payload.title,
      message: payload.message,
      reporter_name: payload.reporterName?.trim() || null,
      contact_email: payload.contactEmail || null,
    });

    if (error) {
      throw new Error("No se ha podido guardar la entrada de feedback.");
    }

    revalidatePath("/feedback");
    revalidatePath("/dashboard");
    revalidatePath("/backups");
    redirect("/feedback?created=1");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirect(`/feedback?error=${encodeURIComponent(getActionError(error))}`);
  }
}

export async function updateFeedbackStatusAction(formData: FormData) {
  try {
    if (isDemoMode()) {
      redirect(
        "/feedback?error=Modo%20demo:%20el%20estado%20del%20feedback%20no%20se%20actualiza.",
      );
    }

    const user = await requireUser();
    const payload = updateFeedbackStatusSchema.parse({
      entryId: String(formData.get("entryId") ?? ""),
      status: String(formData.get("status") ?? ""),
    });

    if (isLocalFileMode()) {
      const updated = await updateLocalFeedbackStatus(user.id, payload.entryId, payload.status);

      if (!updated) {
        throw new Error("No se ha podido actualizar el estado del feedback.");
      }

      revalidatePath("/feedback");
      revalidatePath("/backups");
      redirect("/feedback?updated=1");
    }

    const supabase = await createServerSupabaseClient();

    const { error } = await supabase
      .from("feedback_entries")
      .update({
        status: payload.status,
      })
      .eq("id", payload.entryId)
      .eq("user_id", user.id);

    if (error) {
      throw new Error("No se ha podido actualizar el estado del feedback.");
    }

    revalidatePath("/feedback");
    redirect("/feedback?updated=1");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirect(`/feedback?error=${encodeURIComponent(getActionError(error))}`);
  }
}
