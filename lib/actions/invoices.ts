"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";

import { requireFeatureAccess } from "@/lib/billing";
import { requireUser } from "@/lib/auth";
import { isDemoMode } from "@/lib/demo";
import { getResendEnv } from "@/lib/env";
import { getInvoicePdfFileName } from "@/lib/invoice-files";
import {
  buildInvoiceEmailHtml,
  calculateInvoice,
  getLogoStoragePath,
  invoiceFormSchema,
  parseInvoiceLines,
  renderInvoicePdfBuffer,
} from "@/lib/invoices";
import { getResendClient } from "@/lib/resend";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { InvoiceRecord } from "@/lib/types";
import { formatInvoiceNumber } from "@/lib/utils";

function getFirstErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Revisa el formulario.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Ha ocurrido un error inesperado.";
}

export async function createInvoiceAction(formData: FormData) {
  try {
    if (isDemoMode()) {
      redirect(
        "/new-invoice?error=Modo%20demo:%20la%20creaci%C3%B3n%20real%20de%20facturas%20est%C3%A1%20desactivada.",
      );
    }

    const user = await requireUser();
    await requireFeatureAccess("create_invoices");
    const supabase = await createServerSupabaseClient();
    const payload = invoiceFormSchema.parse({
      issuerName: String(formData.get("issuerName") ?? ""),
      issuerNif: String(formData.get("issuerNif") ?? ""),
      issuerAddress: String(formData.get("issuerAddress") ?? ""),
      clientName: String(formData.get("clientName") ?? ""),
      clientNif: String(formData.get("clientNif") ?? ""),
      clientAddress: String(formData.get("clientAddress") ?? ""),
      clientEmail: String(formData.get("clientEmail") ?? ""),
      issueDate: String(formData.get("issueDate") ?? ""),
      irpfRate: Number(formData.get("irpfRate") ?? 0),
    });
    const lines = parseInvoiceLines(String(formData.get("lines") ?? "[]"));
    const { lineItems, totals } = calculateInvoice(lines, payload.irpfRate);
    const existingLogoPath =
      String(formData.get("existingLogoPath") ?? "").trim() || null;
    const existingLogoUrl =
      String(formData.get("existingLogoUrl") ?? "").trim() || null;
    const logoFile = formData.get("issuerLogo");

    let issuerLogoPath = existingLogoPath;
    let issuerLogoUrl = existingLogoUrl;

    if (logoFile instanceof File && logoFile.size > 0) {
      const storagePath = getLogoStoragePath(
        user.id,
        logoFile.name || "facturaia-logo.png",
      );
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
      id: user.id,
      email: user.email ?? "",
      full_name: payload.issuerName,
      nif: payload.issuerNif,
      address: payload.issuerAddress,
      logo_path: issuerLogoPath,
      logo_url: issuerLogoUrl,
    });

    if (profileError) {
      throw new Error("No se ha podido guardar el perfil del emisor.");
    }

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
        user_id: user.id,
        issue_date: payload.issueDate,
        issuer_name: payload.issuerName,
        issuer_nif: payload.issuerNif,
        issuer_address: payload.issuerAddress,
        issuer_logo_url: issuerLogoUrl,
        client_name: payload.clientName,
        client_nif: payload.clientNif,
        client_address: payload.clientAddress,
        client_email: payload.clientEmail,
        line_items: lineItems,
        vat_breakdown: totals.vatBreakdown,
        subtotal: totals.subtotal,
        vat_total: totals.vatTotal,
        irpf_rate: totals.irpfRate,
        irpf_amount: totals.irpfAmount,
        grand_total: totals.grandTotal,
      })
      .select("*")
      .single();

    if (invoiceError || !invoice) {
      throw new Error("No se ha podido guardar la factura en Supabase.");
    }

    revalidatePath("/dashboard");
    revalidatePath("/new-invoice");
    revalidatePath("/invoices");
    revalidatePath("/profile");
    revalidatePath(`/factura/${invoice.public_id}`);

    redirect(`/invoices?created=${invoice.id}`);
  } catch (error) {
    redirect(`/new-invoice?error=${encodeURIComponent(getFirstErrorMessage(error))}`);
  }
}

export async function sendInvoiceEmailAction(formData: FormData) {
  try {
    if (isDemoMode()) {
      redirect(
        "/invoices?error=Modo%20demo:%20el%20env%C3%ADo%20por%20email%20est%C3%A1%20desactivado.",
      );
    }

    const user = await requireUser();
    const invoiceId = String(formData.get("invoiceId") ?? "").trim();
    const supabase = await createServerSupabaseClient();

    if (!invoiceId) {
      throw new Error("Factura no encontrada.");
    }

    const { data: invoice, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", invoiceId)
      .eq("user_id", user.id)
      .single();

    if (error || !invoice) {
      throw new Error("No se ha podido cargar la factura.");
    }

    const pdfBuffer = await renderInvoicePdfBuffer(invoice as InvoiceRecord);
    const resend = getResendClient();
    const resendEnv = getResendEnv();

    const { error: emailError } = await resend.emails.send({
      from: resendEnv.RESEND_FROM_EMAIL,
      to: [(invoice as InvoiceRecord).client_email],
      subject: `Tu factura ${formatInvoiceNumber((invoice as InvoiceRecord).invoice_number)}`,
      html: buildInvoiceEmailHtml(invoice as InvoiceRecord),
      attachments: [
        {
          filename: getInvoicePdfFileName(
            (invoice as InvoiceRecord).invoice_number,
          ),
          content: pdfBuffer,
        },
      ],
    });

    if (emailError) {
      throw new Error("Resend no ha podido enviar el email.");
    }

    revalidatePath("/invoices");
    redirect(`/invoices?emailed=${invoiceId}`);
  } catch (error) {
    redirect(`/invoices?error=${encodeURIComponent(getFirstErrorMessage(error))}`);
  }
}
