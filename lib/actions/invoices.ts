"use server";

import { revalidateAppPath } from "@/lib/actions/revalidate-path";
import { redirect } from "next/navigation";
import { z, ZodError } from "zod";

import { requireFeatureAccess } from "@/lib/billing";
import { rethrowIfRedirectError } from "@/lib/actions/redirect-error";
import { generateBusinessDocument } from "@/lib/ai";
import { requireUser } from "@/lib/auth";
import {
  type InvoiceReminderBatchKey,
  matchesInvoiceReminderBatch,
} from "@/lib/collections";
import { isDemoMode, isLocalFileMode } from "@/lib/demo";
import { getInvoicePdfFileName } from "@/lib/invoice-files";
import { syncInvoicePaymentStatusFromBankMatches } from "@/lib/collections-server";
import {
  buildInvoiceEmailHtml,
  buildInvoiceReminderAiBrief,
  buildInvoiceReminderEmailHtml,
  buildInvoiceReminderEmailText,
  calculateInvoice,
  invoiceFormSchema,
  getLogoStoragePath,
  parseInvoiceLines,
  renderInvoicePdfBuffer,
} from "@/lib/invoices";
import {
  createLocalInvoiceRecord,
  fileToDataUrl,
  getLocalInvoiceById,
  listLocalInvoicesForUser,
  recordLocalInvoiceReminder,
  saveLocalProfile,
  updateLocalInvoicePaymentState,
  updateLocalInvoicePaymentStates,
} from "@/lib/local-core";
import { sendTransactionalEmail } from "@/lib/mail";
import { hasLocalAiEnv } from "@/lib/env";
import { assertAllowedUpload, uploadRules } from "@/lib/security";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { InvoiceRecord } from "@/lib/types";
import { formatCurrency, formatInvoiceNumber, toNumber } from "@/lib/utils";

function getFirstErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Revisa el formulario.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Ha ocurrido un error inesperado.";
}

async function deliverInvoiceReminderEmail({
  invoice,
  userEmail,
}: {
  invoice: InvoiceRecord;
  userEmail: string | null | undefined;
}) {
  if (invoice.payment_status === "paid") {
    throw new Error("La factura ya consta como cobrada y no necesita recordatorio.");
  }

  const amountOutstanding = Math.max(
    0,
    toNumber(invoice.grand_total) - toNumber(invoice.amount_paid),
  );

  if (amountOutstanding <= 0) {
    throw new Error("La factura ya no tiene saldo pendiente.");
  }

  let generatedReminderText: string | undefined;

  if (hasLocalAiEnv()) {
    try {
      const generated = await generateBusinessDocument({
        documentType: "payment_reminder",
        brief: buildInvoiceReminderAiBrief(invoice),
        issuerName: invoice.issuer_name,
        clientName: invoice.client_name,
      });
      generatedReminderText = generated.body;
    } catch {
      generatedReminderText = undefined;
    }
  }

  const pdfBuffer = await renderInvoicePdfBuffer(invoice);
  const subject = `Recordatorio de pago ${formatInvoiceNumber(invoice.invoice_number)} · ${formatCurrency(amountOutstanding)} pendientes`;
  await sendTransactionalEmail({
    to: [invoice.client_email],
    subject,
    html: buildInvoiceReminderEmailHtml(invoice, generatedReminderText),
    text: buildInvoiceReminderEmailText(invoice, generatedReminderText),
    replyTo: userEmail ?? undefined,
    attachments: [
      {
        filename: getInvoicePdfFileName(invoice.invoice_number),
        content: pdfBuffer,
      },
    ],
  });

  return subject;
}

async function sendReminderForInvoice({
  invoice,
  userEmail,
  supabase,
  triggerMode,
  batchKey,
}: {
  invoice: InvoiceRecord;
  userEmail: string | null | undefined;
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  triggerMode: "manual" | "batch";
  batchKey?: InvoiceReminderBatchKey | null;
}) {
  const subject = await deliverInvoiceReminderEmail({
    invoice,
    userEmail,
  });

  const { error: updateError } = await supabase
    .from("invoices")
    .update({
      last_reminder_at: new Date().toISOString(),
      reminder_count: (invoice.reminder_count ?? 0) + 1,
    })
    .eq("id", invoice.id)
    .eq("user_id", invoice.user_id);

  if (updateError) {
    throw new Error("El recordatorio se envió, pero no se pudo registrar su seguimiento.");
  }

  const { error: reminderLogError } = await supabase.from("invoice_reminders").insert({
    user_id: invoice.user_id,
    invoice_id: invoice.id,
    delivery_channel: "email",
    trigger_mode: triggerMode,
    batch_key: batchKey ?? null,
    recipient_email: invoice.client_email,
    subject,
    status: "sent",
    error_message: null,
    sent_at: new Date().toISOString(),
  });

  if (reminderLogError) {
    console.error(
      "[facturaia] No se pudo registrar el historial del recordatorio",
      reminderLogError,
    );
  }
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
    const payload = invoiceFormSchema.parse({
      issuerName: String(formData.get("issuerName") ?? ""),
      issuerNif: String(formData.get("issuerNif") ?? ""),
      issuerAddress: String(formData.get("issuerAddress") ?? ""),
      clientName: String(formData.get("clientName") ?? ""),
      clientNif: String(formData.get("clientNif") ?? ""),
      clientAddress: String(formData.get("clientAddress") ?? ""),
      clientEmail: String(formData.get("clientEmail") ?? ""),
      issueDate: String(formData.get("issueDate") ?? ""),
      dueDate: String(formData.get("dueDate") ?? ""),
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

    if (isLocalFileMode()) {
      if (logoFile instanceof File && logoFile.size > 0) {
        assertAllowedUpload(logoFile, uploadRules.logo);
        issuerLogoUrl = await fileToDataUrl(logoFile);
        issuerLogoPath = null;
      }

      await saveLocalProfile({
        userId: user.id,
        email: user.email ?? "",
        fullName: payload.issuerName,
        nif: payload.issuerNif,
        address: payload.issuerAddress,
        logoUrl: issuerLogoUrl,
      });

      const invoice = await createLocalInvoiceRecord({
        userId: user.id,
        payload,
        lineItems,
        totals,
        issuerLogoUrl,
      });

      revalidateAppPath("/dashboard");
      revalidateAppPath("/new-invoice");
      revalidateAppPath("/invoices");
      revalidateAppPath("/profile");
      revalidateAppPath("/cobros");
      revalidateAppPath("/clientes");
      revalidateAppPath(`/factura/${invoice.public_id}`);

      redirect(`/invoices?created=${invoice.id}`);
    }

    const supabase = await createServerSupabaseClient();

    if (logoFile instanceof File && logoFile.size > 0) {
      assertAllowedUpload(logoFile, uploadRules.logo);
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
        due_date: payload.dueDate,
        payment_status: "pending",
        amount_paid: 0,
        paid_at: null,
      })
      .select("*")
      .single();

    if (invoiceError || !invoice) {
      throw new Error("No se ha podido guardar la factura en Supabase.");
    }

    revalidateAppPath("/dashboard");
    revalidateAppPath("/new-invoice");
    revalidateAppPath("/invoices");
    revalidateAppPath("/profile");
    revalidateAppPath("/cobros");
    revalidateAppPath("/clientes");
    revalidateAppPath(`/factura/${invoice.public_id}`);

    redirect(`/invoices?created=${invoice.id}`);
  } catch (error) {
    rethrowIfRedirectError(error);
    redirect(`/new-invoice?error=${encodeURIComponent(getFirstErrorMessage(error))}`);
  }
}

const updateInvoicePaymentStateSchema = z.object({
  invoiceId: z.string().uuid("Factura no válida."),
  actionKind: z.enum(["mark_paid", "reopen"]),
});

const updateInvoiceBatchPaymentStateSchema = z.object({
  invoiceIds: z.array(z.string().uuid("Factura no válida.")).min(1, "Selecciona al menos una factura."),
  actionKind: z.enum(["mark_paid", "reopen"]),
});

export async function updateInvoicePaymentStateAction(formData: FormData) {
  try {
    if (isDemoMode()) {
      redirect(
        "/cobros?error=Modo%20demo:%20la%20actualizaci%C3%B3n%20manual%20de%20cobros%20est%C3%A1%20desactivada.",
      );
    }

    const user = await requireUser();
    const payload = updateInvoicePaymentStateSchema.parse({
      invoiceId: String(formData.get("invoiceId") ?? ""),
      actionKind: String(formData.get("actionKind") ?? ""),
    });

    if (isLocalFileMode()) {
      const invoice = await updateLocalInvoicePaymentState(
        user.id,
        payload.invoiceId,
        payload.actionKind,
      );

      if (!invoice) {
        throw new Error("No se ha podido cargar la factura.");
      }

      revalidateAppPath("/dashboard");
      revalidateAppPath("/invoices");
      revalidateAppPath("/cobros");
      revalidateAppPath("/clientes");
      revalidateAppPath("/banca");
      redirect("/cobros?updated=1");
    }

    const supabase = await createServerSupabaseClient();
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("id, grand_total")
      .eq("id", payload.invoiceId)
      .eq("user_id", user.id)
      .single();

    if (invoiceError || !invoice) {
      throw new Error("No se ha podido cargar la factura.");
    }

    if (payload.actionKind === "mark_paid") {
      const { error } = await supabase
        .from("invoices")
        .update({
          payment_status: "paid",
          amount_paid: (invoice as Pick<InvoiceRecord, "grand_total">).grand_total,
          paid_at: new Date().toISOString(),
        })
        .eq("id", payload.invoiceId)
        .eq("user_id", user.id);

      if (error) {
        throw new Error("No se ha podido marcar la factura como cobrada.");
      }
    } else {
      const { error } = await supabase
        .from("invoices")
        .update({
          payment_status: "pending",
          amount_paid: 0,
          paid_at: null,
        })
        .eq("id", payload.invoiceId)
        .eq("user_id", user.id);

      if (error) {
        throw new Error("No se ha podido reabrir el seguimiento de cobro.");
      }

      await syncInvoicePaymentStatusFromBankMatches(user.id, [payload.invoiceId]);
    }

    revalidateAppPath("/dashboard");
    revalidateAppPath("/invoices");
    revalidateAppPath("/cobros");
    revalidateAppPath("/clientes");
    revalidateAppPath("/banca");
    redirect("/cobros?updated=1");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirect(`/cobros?error=${encodeURIComponent(getFirstErrorMessage(error))}`);
  }
}

export async function updateInvoiceBatchPaymentStateAction(formData: FormData) {
  try {
    if (isDemoMode()) {
      redirect(
        "/cobros?error=Modo%20demo:%20la%20actualizaci%C3%B3n%20por%20lote%20est%C3%A1%20desactivada.",
      );
    }

    const user = await requireUser();
    const payload = updateInvoiceBatchPaymentStateSchema.parse({
      invoiceIds: formData.getAll("invoiceId").map((value) => String(value ?? "")),
      actionKind: String(formData.get("actionKind") ?? ""),
    });

    if (isLocalFileMode()) {
      const updatedInvoices = await updateLocalInvoicePaymentStates(
        user.id,
        payload.invoiceIds,
        payload.actionKind,
      );

      if (updatedInvoices.length === 0) {
        throw new Error("No se ha podido actualizar ninguna factura.");
      }

      revalidateAppPath("/dashboard");
      revalidateAppPath("/invoices");
      revalidateAppPath("/cobros");
      revalidateAppPath("/clientes");
      revalidateAppPath("/banca");

      const message =
        payload.actionKind === "mark_paid"
          ? `Se han marcado ${updatedInvoices.length} factura(s) como cobradas.`
          : `Se han reabierto ${updatedInvoices.length} factura(s).`;

      redirect(`/cobros?batchMessage=${encodeURIComponent(message)}`);
    }

    const supabase = await createServerSupabaseClient();
    const { data: invoices, error: invoiceError } = await supabase
      .from("invoices")
      .select("id, grand_total")
      .in("id", payload.invoiceIds)
      .eq("user_id", user.id);

    if (invoiceError) {
      throw new Error("No se han podido cargar las facturas seleccionadas.");
    }

    const invoiceRows = (invoices as Array<Pick<InvoiceRecord, "id" | "grand_total">> | null) ?? [];

    if (invoiceRows.length === 0) {
      throw new Error("No se ha podido cargar ninguna factura.");
    }

    const targetIds = invoiceRows.map((invoice) => invoice.id);

    if (payload.actionKind === "mark_paid") {
      const { error } = await supabase
        .from("invoices")
        .update({
          payment_status: "paid",
          paid_at: new Date().toISOString(),
        })
        .in("id", targetIds)
        .eq("user_id", user.id);

      if (error) {
        throw new Error("No se han podido marcar las facturas como cobradas.");
      }

      for (const invoice of invoiceRows) {
        const { error: amountError } = await supabase
          .from("invoices")
          .update({
            amount_paid: invoice.grand_total,
          })
          .eq("id", invoice.id)
          .eq("user_id", user.id);

        if (amountError) {
          throw new Error("No se ha podido actualizar el importe cobrado de una factura.");
        }
      }
    } else {
      const { error } = await supabase
        .from("invoices")
        .update({
          payment_status: "pending",
          amount_paid: 0,
          paid_at: null,
        })
        .in("id", targetIds)
        .eq("user_id", user.id);

      if (error) {
        throw new Error("No se ha podido reabrir el seguimiento de cobro por lote.");
      }

      await syncInvoicePaymentStatusFromBankMatches(user.id, targetIds);
    }

    revalidateAppPath("/dashboard");
    revalidateAppPath("/invoices");
    revalidateAppPath("/cobros");
    revalidateAppPath("/clientes");
    revalidateAppPath("/banca");

    const message =
      payload.actionKind === "mark_paid"
        ? `Se han marcado ${targetIds.length} factura(s) como cobradas.`
        : `Se han reabierto ${targetIds.length} factura(s).`;

    redirect(`/cobros?batchMessage=${encodeURIComponent(message)}`);
  } catch (error) {
    rethrowIfRedirectError(error);
    redirect(`/cobros?error=${encodeURIComponent(getFirstErrorMessage(error))}`);
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

    if (!invoiceId) {
      throw new Error("Factura no encontrada.");
    }

    if (isLocalFileMode()) {
      const invoice = await getLocalInvoiceById(user.id, invoiceId);

      if (!invoice) {
        throw new Error("No se ha podido cargar la factura.");
      }

      const pdfBuffer = await renderInvoicePdfBuffer(invoice);
      await sendTransactionalEmail({
        to: [invoice.client_email],
        subject: `Tu factura ${formatInvoiceNumber(invoice.invoice_number)}`,
        html: buildInvoiceEmailHtml(invoice),
        attachments: [
          {
            filename: getInvoicePdfFileName(invoice.invoice_number),
            content: pdfBuffer,
          },
        ],
      });

      revalidateAppPath("/invoices");
      redirect(`/invoices?emailed=${invoiceId}`);
    }

    const supabase = await createServerSupabaseClient();

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
    await sendTransactionalEmail({
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

    revalidateAppPath("/invoices");
    redirect(`/invoices?emailed=${invoiceId}`);
  } catch (error) {
    rethrowIfRedirectError(error);
    redirect(`/invoices?error=${encodeURIComponent(getFirstErrorMessage(error))}`);
  }
}

const sendInvoiceReminderSchema = z.object({
  invoiceId: z.string().uuid("Factura no válida."),
});

export async function sendInvoiceReminderAction(formData: FormData) {
  try {
    if (isDemoMode()) {
      redirect(
        "/cobros?error=Modo%20demo:%20el%20env%C3%ADo%20de%20recordatorios%20est%C3%A1%20desactivado.",
      );
    }

    const user = await requireUser();
    const payload = sendInvoiceReminderSchema.parse({
      invoiceId: String(formData.get("invoiceId") ?? ""),
    });

    if (isLocalFileMode()) {
      const invoice = await getLocalInvoiceById(user.id, payload.invoiceId);

      if (!invoice) {
        throw new Error("No se ha podido cargar la factura para enviar el recordatorio.");
      }

      const subject = await deliverInvoiceReminderEmail({
        invoice,
        userEmail: user.email,
      });

      await recordLocalInvoiceReminder({
        userId: user.id,
        invoiceId: invoice.id,
        recipientEmail: invoice.client_email,
        subject,
        triggerMode: "manual",
        batchKey: null,
      });

      revalidateAppPath("/dashboard");
      revalidateAppPath("/invoices");
      revalidateAppPath("/cobros");
      revalidateAppPath("/clientes");
      redirect(`/cobros?reminded=${payload.invoiceId}`);
    }

    const supabase = await createServerSupabaseClient();
    const { data: invoice, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", payload.invoiceId)
      .eq("user_id", user.id)
      .single();

    if (error || !invoice) {
      throw new Error("No se ha podido cargar la factura para enviar el recordatorio.");
    }

    await sendReminderForInvoice({
      invoice: invoice as InvoiceRecord,
      userEmail: user.email,
      supabase,
      triggerMode: "manual",
      batchKey: null,
    });

    revalidateAppPath("/dashboard");
    revalidateAppPath("/invoices");
    revalidateAppPath("/cobros");
    revalidateAppPath("/clientes");
    redirect(`/cobros?reminded=${payload.invoiceId}`);
  } catch (error) {
    rethrowIfRedirectError(error);
    redirect(`/cobros?error=${encodeURIComponent(getFirstErrorMessage(error))}`);
  }
}

const sendInvoiceBatchReminderSchema = z.object({
  batchKey: z.enum(["overdue_due", "partial_due", "due_soon"]),
});

export async function sendInvoiceBatchReminderAction(formData: FormData) {
  try {
    if (isDemoMode()) {
      redirect(
        "/cobros?error=Modo%20demo:%20el%20env%C3%ADo%20por%20lote%20est%C3%A1%20desactivado.",
      );
    }

    const user = await requireUser();
    const payload = sendInvoiceBatchReminderSchema.parse({
      batchKey: String(formData.get("batchKey") ?? ""),
    });

    if (isLocalFileMode()) {
      const invoices = await listLocalInvoicesForUser(user.id);
      const candidates = invoices.filter((invoice) =>
        matchesInvoiceReminderBatch(invoice, payload.batchKey as InvoiceReminderBatchKey),
      );

      if (candidates.length === 0) {
        throw new Error("No hay facturas que encajen con esa regla de recordatorio.");
      }

      let sentCount = 0;
      let failedCount = 0;
      let firstFailure: Error | null = null;

      for (const invoice of candidates) {
        try {
          const subject = await deliverInvoiceReminderEmail({
            invoice,
            userEmail: user.email,
          });

          await recordLocalInvoiceReminder({
            userId: user.id,
            invoiceId: invoice.id,
            recipientEmail: invoice.client_email,
            subject,
            triggerMode: "batch",
            batchKey: payload.batchKey,
          });
          sentCount += 1;
        } catch (error) {
          failedCount += 1;
          firstFailure =
            firstFailure ??
            (error instanceof Error
              ? error
              : new Error("No se ha podido enviar uno de los recordatorios."));
        }
      }

      if (sentCount === 0) {
        throw firstFailure ?? new Error("No se ha podido enviar ningún recordatorio.");
      }

      revalidateAppPath("/dashboard");
      revalidateAppPath("/invoices");
      revalidateAppPath("/cobros");
      revalidateAppPath("/clientes");

      const message =
        failedCount > 0
          ? `Se han enviado ${sentCount} recordatorio(s) y ${failedCount} han fallado.`
          : `Se han enviado ${sentCount} recordatorio(s) por lote.`;

      redirect(`/cobros?batchMessage=${encodeURIComponent(message)}`);
    }

    const supabase = await createServerSupabaseClient();
    const { data: invoices, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("user_id", user.id)
      .order("due_date", { ascending: true });

    if (error) {
      throw new Error("No se ha podido cargar la cola de facturas para el recordatorio.");
    }

    const candidates = ((invoices ?? []) as InvoiceRecord[]).filter((invoice) =>
      matchesInvoiceReminderBatch(invoice, payload.batchKey as InvoiceReminderBatchKey),
    );

    if (candidates.length === 0) {
      throw new Error("No hay facturas que encajen con esa regla de recordatorio.");
    }

    let sentCount = 0;
    let failedCount = 0;
    let firstFailure: Error | null = null;

    for (const invoice of candidates) {
      try {
        await sendReminderForInvoice({
          invoice,
          userEmail: user.email,
          supabase,
          triggerMode: "batch",
          batchKey: payload.batchKey,
        });
        sentCount += 1;
      } catch (error) {
        failedCount += 1;
        firstFailure =
          firstFailure ??
          (error instanceof Error
            ? error
            : new Error("No se ha podido enviar uno de los recordatorios."));
      }
    }

    if (sentCount === 0) {
      throw firstFailure ?? new Error("No se ha podido enviar ningún recordatorio.");
    }

    revalidateAppPath("/dashboard");
    revalidateAppPath("/invoices");
    revalidateAppPath("/cobros");
    revalidateAppPath("/clientes");

    const message =
      failedCount > 0
        ? `Se han enviado ${sentCount} recordatorio(s) y ${failedCount} han fallado.`
        : `Se han enviado ${sentCount} recordatorio(s) por lote.`;

    redirect(`/cobros?batchMessage=${encodeURIComponent(message)}`);
  } catch (error) {
    rethrowIfRedirectError(error);
    redirect(`/cobros?error=${encodeURIComponent(getFirstErrorMessage(error))}`);
  }
}
