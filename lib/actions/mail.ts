"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z, ZodError } from "zod";

import { requireUser } from "@/lib/auth";
import { rethrowIfRedirectError } from "@/lib/actions/redirect-error";
import { isDemoMode, isLocalFileMode } from "@/lib/demo";
import { syncInboundMailForUser } from "@/lib/inbound-mail";
import { sendTransactionalEmail } from "@/lib/mail";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const testMailSchema = z.object({
  recipientEmail: z.email("Indica un email válido para la prueba."),
  subject: z.string().trim().min(4, "El asunto es demasiado corto."),
  message: z.string().trim().min(10, "Escribe un mensaje algo más completo."),
});

function getErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Revisa el formulario de correo.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "No se ha podido enviar el correo de prueba.";
}

function buildTestEmailHtml(message: string, senderEmail: string) {
  return `
    <div style="font-family: Arial, sans-serif; color: #173038; line-height: 1.6;">
      <h1 style="font-size: 22px; margin-bottom: 12px;">Prueba de correo desde FacturaIA</h1>
      <p>Este mensaje confirma que el módulo de correo saliente está operativo.</p>
      <div style="margin: 18px 0; padding: 16px; background: #f5efe6; border-radius: 14px;">
        <p style="margin: 0; white-space: pre-wrap;">${message}</p>
      </div>
      <p style="font-size: 14px; color: #5f6c72;">
        Enviado desde la instalación privada de FacturaIA de ${senderEmail}.
      </p>
    </div>
  `;
}

export async function sendMailTestAction(formData: FormData) {
  try {
    if (isDemoMode()) {
      redirect("/mail?error=Modo%20demo:%20el%20correo%20de%20prueba%20est%C3%A1%20desactivado.");
    }

    const user = await requireUser();
    const payload = testMailSchema.parse({
      recipientEmail: String(formData.get("recipientEmail") ?? ""),
      subject: String(formData.get("subject") ?? ""),
      message: String(formData.get("message") ?? ""),
    });

    await sendTransactionalEmail({
      to: [payload.recipientEmail],
      subject: payload.subject,
      html: buildTestEmailHtml(payload.message, user.email ?? "usuario local"),
      text: payload.message,
      replyTo: user.email ?? undefined,
    });

    redirect(`/mail?sent=${encodeURIComponent(payload.recipientEmail)}`);
  } catch (error) {
    rethrowIfRedirectError(error);
    redirect(`/mail?error=${encodeURIComponent(getErrorMessage(error))}`);
  }
}

export async function syncInboundMailAction() {
  try {
    if (isDemoMode()) {
      redirect(
        "/mail?error=Modo%20demo:%20la%20sincronizaci%C3%B3n%20IMAP%20real%20est%C3%A1%20desactivada.",
      );
    }

    if (isLocalFileMode()) {
      redirect(
        "/mail?info=Modo%20local:%20la%20bandeja%20IMAP%20todav%C3%ADa%20no%20persiste%20mensajes%20importados.",
      );
    }

    const user = await requireUser();
    const result = await syncInboundMailForUser(user.id);

    redirect(
      `/mail?synced=${result.importedCount}&info=${encodeURIComponent(result.detail)}`,
    );
  } catch (error) {
    rethrowIfRedirectError(error);
    redirect(`/mail?error=${encodeURIComponent(getErrorMessage(error))}`);
  }
}

export async function markMailThreadReadAction(formData: FormData) {
  const user = await requireUser();
  const threadId = String(formData.get("threadId") ?? "");

  if (!threadId || isDemoMode() || isLocalFileMode()) {
    revalidatePath("/mail");
    return;
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("mail_threads")
    .update({ unread_count: 0 })
    .eq("id", threadId)
    .eq("user_id", user.id);

  if (error) {
    throw new Error("No se ha podido marcar el hilo de correo como leído.");
  }

  revalidatePath("/mail");
}
