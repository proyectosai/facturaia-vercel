"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError, z } from "zod";

import { requireUser } from "@/lib/auth";
import { rethrowIfRedirectError } from "@/lib/actions/redirect-error";
import { isDemoMode, isLocalFileMode } from "@/lib/demo";
import { saveLocalClientRecord } from "@/lib/local-core";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const clientSchema = z.object({
  clientId: z.string().uuid().optional(),
  relationKind: z.enum(["client", "supplier", "mixed"]),
  status: z.enum(["lead", "active", "paused", "archived"]),
  priority: z.enum(["low", "medium", "high"]),
  displayName: z.string().trim().min(2, "Indica un nombre visible para la ficha."),
  firstName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
  companyName: z.string().trim().optional(),
  email: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || "")
    .refine((value) => !value || z.string().email().safeParse(value).success, {
      message: "El email no tiene un formato válido.",
    }),
  phone: z.string().trim().optional(),
  nif: z.string().trim().optional(),
  address: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  tags: z.string().trim().optional(),
});

function getActionError(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Revisa los datos de la ficha.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "No se ha podido guardar la ficha del CRM.";
}

export async function saveClientAction(formData: FormData) {
  try {
    if (isDemoMode()) {
      redirect("/clientes?error=Modo%20demo:%20las%20fichas%20no%20se%20guardan.");
    }

    const user = await requireUser();
    const payload = clientSchema.parse({
      clientId: String(formData.get("clientId") ?? "").trim() || undefined,
      relationKind: String(formData.get("relationKind") ?? "client"),
      status: String(formData.get("status") ?? "lead"),
      priority: String(formData.get("priority") ?? "medium"),
      displayName: String(formData.get("displayName") ?? ""),
      firstName: String(formData.get("firstName") ?? ""),
      lastName: String(formData.get("lastName") ?? ""),
      companyName: String(formData.get("companyName") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      nif: String(formData.get("nif") ?? ""),
      address: String(formData.get("address") ?? ""),
      notes: String(formData.get("notes") ?? ""),
      tags: String(formData.get("tags") ?? ""),
    });

    const tags = payload.tags
      ? payload.tags
          .split(",")
          .map((segment) => segment.trim())
          .filter(Boolean)
      : [];

    if (isLocalFileMode()) {
      const client = await saveLocalClientRecord({
        userId: user.id,
        clientId: payload.clientId,
        relationKind: payload.relationKind,
        status: payload.status,
        priority: payload.priority,
        displayName: payload.displayName,
        firstName: payload.firstName?.trim() || null,
        lastName: payload.lastName?.trim() || null,
        companyName: payload.companyName?.trim() || null,
        email: payload.email || null,
        phone: payload.phone?.trim() || null,
        nif: payload.nif?.trim() || null,
        address: payload.address?.trim() || null,
        notes: payload.notes?.trim() || null,
        tags,
      });

      revalidatePath("/clientes");
      revalidatePath("/modules");
      revalidatePath("/backups");
      redirect(`/clientes?client=${client.id}&${payload.clientId ? "updated=1" : "created=1"}`);
    }

    const supabase = await createServerSupabaseClient();

    if (payload.clientId) {
      const { error } = await supabase
        .from("clients")
        .update({
          relation_kind: payload.relationKind,
          status: payload.status,
          priority: payload.priority,
          display_name: payload.displayName,
          first_name: payload.firstName || null,
          last_name: payload.lastName || null,
          company_name: payload.companyName || null,
          email: payload.email || null,
          phone: payload.phone || null,
          nif: payload.nif || null,
          address: payload.address || null,
          notes: payload.notes || null,
          tags,
        })
        .eq("id", payload.clientId)
        .eq("user_id", user.id);

      if (error) {
        throw new Error("No se ha podido actualizar la ficha del cliente.");
      }

      revalidatePath("/clientes");
      revalidatePath("/modules");
      revalidatePath("/backups");
      redirect(`/clientes?client=${payload.clientId}&updated=1`);
    }

    const { data, error } = await supabase
      .from("clients")
      .insert({
        user_id: user.id,
        relation_kind: payload.relationKind,
        status: payload.status,
        priority: payload.priority,
        display_name: payload.displayName,
        first_name: payload.firstName || null,
        last_name: payload.lastName || null,
        company_name: payload.companyName || null,
        email: payload.email || null,
        phone: payload.phone || null,
        nif: payload.nif || null,
        address: payload.address || null,
        notes: payload.notes || null,
        tags,
      })
      .select("id")
      .single();

    if (error || !data) {
      throw new Error("No se ha podido crear la ficha del cliente.");
    }

    revalidatePath("/clientes");
    revalidatePath("/modules");
    revalidatePath("/backups");
    redirect(`/clientes?client=${data.id}&created=1`);
  } catch (error) {
    rethrowIfRedirectError(error);
    redirect(`/clientes?error=${encodeURIComponent(getActionError(error))}`);
  }
}
