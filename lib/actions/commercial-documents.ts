"use server";

import { revalidateAppPath } from "@/lib/actions/revalidate-path";
import { redirect } from "next/navigation";
import { ZodError, z } from "zod";

import { requireUser } from "@/lib/auth";
import { rethrowIfRedirectError } from "@/lib/actions/redirect-error";
import { requireFeatureAccess } from "@/lib/billing";
import {
  buildCommercialDocumentInsertPayload,
  canConvertCommercialDocument,
  commercialDocumentFormSchema,
  getCommercialDocumentByIdForUser,
  parseCommercialDocumentLines,
} from "@/lib/commercial-documents";
import { isDemoMode, isLocalFileMode } from "@/lib/demo";
import { calculateInvoice, getLogoStoragePath } from "@/lib/invoices";
import {
  createLocalCommercialDocumentRecord,
  createLocalInvoiceRecord,
  fileToDataUrl,
  getLocalCommercialDocumentById,
  linkLocalCommercialDocumentToInvoice,
  saveLocalProfile,
  updateLocalCommercialDocumentStatus,
} from "@/lib/local-core";
import { assertAllowedUpload, uploadRules } from "@/lib/security";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function getFirstErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Revisa el formulario.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Ha ocurrido un error inesperado.";
}

async function persistIssuerProfile(
  userId: string,
  email: string,
  payload: z.infer<typeof commercialDocumentFormSchema>,
  formData: FormData,
) {
  const existingLogoPath =
    String(formData.get("existingLogoPath") ?? "").trim() || null;
  const existingLogoUrl =
    String(formData.get("existingLogoUrl") ?? "").trim() || null;
  const logoFile = formData.get("issuerLogo");

  let issuerLogoPath = existingLogoPath;
  let issuerLogoUrl = existingLogoUrl;

  if (isLocalFileMode()) {
    if (logoFile instanceof File && logoFile.size > 0) {
      assertAllowedUpload(logoFile, uploadRules.logo);
      issuerLogoUrl = await fileToDataUrl(logoFile);
      issuerLogoPath = null;
    }

    await saveLocalProfile({
      userId,
      email,
      fullName: payload.issuerName,
      nif: payload.issuerNif,
      address: payload.issuerAddress,
      logoUrl: issuerLogoUrl,
    });

    return { issuerLogoUrl };
  }

  const supabase = await createServerSupabaseClient();

  if (logoFile instanceof File && logoFile.size > 0) {
    assertAllowedUpload(logoFile, uploadRules.logo);
    const storagePath = getLogoStoragePath(userId, logoFile.name || "facturaia-logo.png");
    const { error: uploadError } = await supabase.storage
      .from("logos")
      .upload(storagePath, logoFile, {
        contentType: logoFile.type,
        upsert: true,
      });

    if (uploadError) {
      throw new Error("No se ha podido subir el logo a Supabase Storage.");
    }

    const { data: publicLogo } = supabase.storage
      .from("logos")
      .getPublicUrl(storagePath);

    issuerLogoPath = storagePath;
    issuerLogoUrl = publicLogo.publicUrl;
  }

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: userId,
    email,
    full_name: payload.issuerName,
    nif: payload.issuerNif,
    address: payload.issuerAddress,
    logo_path: issuerLogoPath,
    logo_url: issuerLogoUrl,
  });

  if (profileError) {
    throw new Error("No se ha podido guardar el perfil del emisor.");
  }

  return { issuerLogoUrl };
}

export async function createCommercialDocumentAction(formData: FormData) {
  try {
    if (isDemoMode()) {
      redirect(
        "/presupuestos?error=Modo%20demo:%20la%20creaci%C3%B3n%20real%20de%20documentos%20est%C3%A1%20desactivada.",
      );
    }

    const user = await requireUser();
    await requireFeatureAccess("create_invoices");
    const payload = commercialDocumentFormSchema.parse({
      documentType: String(formData.get("documentType") ?? ""),
      issuerName: String(formData.get("issuerName") ?? ""),
      issuerNif: String(formData.get("issuerNif") ?? ""),
      issuerAddress: String(formData.get("issuerAddress") ?? ""),
      clientName: String(formData.get("clientName") ?? ""),
      clientNif: String(formData.get("clientNif") ?? ""),
      clientAddress: String(formData.get("clientAddress") ?? ""),
      clientEmail: String(formData.get("clientEmail") ?? ""),
      issueDate: String(formData.get("issueDate") ?? ""),
      validUntil: String(formData.get("validUntil") ?? ""),
      irpfRate: Number(formData.get("irpfRate") ?? 0),
      notes: String(formData.get("notes") ?? ""),
    });
    const lines = parseCommercialDocumentLines(String(formData.get("lines") ?? "[]"));
    const { lineItems, totals } = calculateInvoice(lines, payload.irpfRate);
    const { issuerLogoUrl } = await persistIssuerProfile(
      user.id,
      user.email ?? "",
      payload,
      formData,
    );

    const notes = payload.notes?.trim() ? payload.notes.trim() : null;
    const insertPayload = buildCommercialDocumentInsertPayload({
      userId: user.id,
      documentType: payload.documentType,
      payload,
      lineItems,
      totals,
      issuerLogoUrl,
      notes,
    });

    if (isLocalFileMode()) {
      const { user_id, ...documentInput } = insertPayload;
      void user_id;
      const document = await createLocalCommercialDocumentRecord({
        userId: user.id,
        input: documentInput,
      });

      revalidateAppPath("/dashboard");
      revalidateAppPath("/presupuestos");
      revalidateAppPath("/profile");
      revalidateAppPath("/modules");
      revalidateAppPath("/backups");

      redirect(`/presupuestos?created=${document.id}`);
    }

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("commercial_documents")
      .insert(insertPayload)
      .select("id")
      .single();

    if (error || !data) {
      throw new Error("No se ha podido guardar el documento.");
    }

    revalidateAppPath("/dashboard");
    revalidateAppPath("/presupuestos");
    revalidateAppPath("/profile");
    revalidateAppPath("/modules");

    redirect(`/presupuestos?created=${data.id}`);
  } catch (error) {
    rethrowIfRedirectError(error);
    redirect(`/presupuestos?error=${encodeURIComponent(getFirstErrorMessage(error))}`);
  }
}

export async function updateCommercialDocumentStatusAction(formData: FormData) {
  try {
    if (isDemoMode()) {
      redirect(
        "/presupuestos?error=Modo%20demo:%20la%20actualizaci%C3%B3n%20de%20estado%20est%C3%A1%20desactivada.",
      );
    }

    const user = await requireUser();
    const documentId = String(formData.get("documentId") ?? "").trim();
    const status = z
      .enum(["sent", "accepted", "rejected", "delivered", "signed"])
      .parse(String(formData.get("status") ?? ""));

    if (!documentId) {
      throw new Error("Documento no encontrado.");
    }

    const document = isLocalFileMode()
      ? await getLocalCommercialDocumentById(user.id, documentId)
      : await getCommercialDocumentByIdForUser(user.id, documentId);

    if (!document) {
      throw new Error("No se ha podido cargar el documento.");
    }

    if (
      (document.document_type === "quote" &&
        !["sent", "accepted", "rejected"].includes(status)) ||
      (document.document_type === "delivery_note" &&
        !["delivered", "signed"].includes(status))
    ) {
      throw new Error("El estado no es válido para este tipo de documento.");
    }

    if (isLocalFileMode()) {
      const updatedDocument = await updateLocalCommercialDocumentStatus(user.id, documentId, status);

      if (!updatedDocument) {
        throw new Error("No se ha podido actualizar el estado.");
      }

      revalidateAppPath("/presupuestos");
      revalidateAppPath("/dashboard");
      revalidateAppPath("/backups");
      redirect("/presupuestos?updated=1");
    }

    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from("commercial_documents")
      .update({ status })
      .eq("id", documentId)
      .eq("user_id", user.id);

    if (error) {
      throw new Error("No se ha podido actualizar el estado.");
    }

    revalidateAppPath("/presupuestos");
    revalidateAppPath("/dashboard");

    redirect("/presupuestos?updated=1");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirect(`/presupuestos?error=${encodeURIComponent(getFirstErrorMessage(error))}`);
  }
}

export async function convertCommercialDocumentToInvoiceAction(formData: FormData) {
  try {
    if (isDemoMode()) {
      redirect(
        "/presupuestos?error=Modo%20demo:%20la%20conversi%C3%B3n%20a%20factura%20est%C3%A1%20desactivada.",
      );
    }

    const user = await requireUser();
    await requireFeatureAccess("create_invoices");
    const documentId = String(formData.get("documentId") ?? "").trim();

    if (!documentId) {
      throw new Error("Documento no encontrado.");
    }

    const document = isLocalFileMode()
      ? await getLocalCommercialDocumentById(user.id, documentId)
      : await getCommercialDocumentByIdForUser(user.id, documentId);

    if (!document) {
      throw new Error("No se ha podido cargar el documento.");
    }

    if (!canConvertCommercialDocument(document)) {
      throw new Error("Este documento todavía no está listo para facturar.");
    }

    const issueDate = new Date().toISOString().slice(0, 10);

    if (isLocalFileMode()) {
      const invoice = await createLocalInvoiceRecord({
        userId: user.id,
        payload: {
          issueDate,
          dueDate: issueDate,
          issuerName: document.issuer_name,
          issuerNif: document.issuer_nif,
          issuerAddress: document.issuer_address,
          clientName: document.client_name,
          clientNif: document.client_nif,
          clientAddress: document.client_address,
          clientEmail: document.client_email,
        },
        lineItems: document.line_items,
        totals: {
          subtotal: Number(document.subtotal),
          vatTotal: Number(document.vat_total),
          irpfRate: Number(document.irpf_rate),
          irpfAmount: Number(document.irpf_amount),
          grandTotal: Number(document.grand_total),
          vatBreakdown: document.vat_breakdown,
        },
        issuerLogoUrl: document.issuer_logo_url,
      });

      const linked = await linkLocalCommercialDocumentToInvoice({
        userId: user.id,
        documentId,
        invoiceId: invoice.id,
      });

      if (!linked) {
        throw new Error("La factura se creó, pero no se pudo vincular el documento origen.");
      }

      revalidateAppPath("/presupuestos");
      revalidateAppPath("/invoices");
      revalidateAppPath("/dashboard");
      revalidateAppPath("/backups");
      redirect(`/invoices?created=${invoice.id}`);
    }

    const supabase = await createServerSupabaseClient();

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
        user_id: user.id,
        issue_date: issueDate,
        issuer_name: document.issuer_name,
        issuer_nif: document.issuer_nif,
        issuer_address: document.issuer_address,
        issuer_logo_url: document.issuer_logo_url,
        client_name: document.client_name,
        client_nif: document.client_nif,
        client_address: document.client_address,
        client_email: document.client_email,
        line_items: document.line_items,
        vat_breakdown: document.vat_breakdown,
        subtotal: document.subtotal,
        vat_total: document.vat_total,
        irpf_rate: document.irpf_rate,
        irpf_amount: document.irpf_amount,
        grand_total: document.grand_total,
      })
      .select("id, public_id")
      .single();

    if (invoiceError || !invoice) {
      throw new Error("No se ha podido crear la factura desde el documento.");
    }

    const { error: updateError } = await supabase
      .from("commercial_documents")
      .update({
        status: "converted",
        converted_invoice_id: invoice.id,
      })
      .eq("id", documentId)
      .eq("user_id", user.id);

    if (updateError) {
      throw new Error("La factura se creó, pero no se pudo vincular el documento origen.");
    }

    revalidateAppPath("/presupuestos");
    revalidateAppPath("/invoices");
    revalidateAppPath("/dashboard");

    redirect(`/invoices?created=${invoice.id}`);
  } catch (error) {
    rethrowIfRedirectError(error);
    redirect(`/presupuestos?error=${encodeURIComponent(getFirstErrorMessage(error))}`);
  }
}
