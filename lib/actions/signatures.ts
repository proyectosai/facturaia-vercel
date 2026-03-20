"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError, z } from "zod";

import { requireUser } from "@/lib/auth";
import { getCommercialDocumentByIdForUser } from "@/lib/commercial-documents";
import { isDemoMode } from "@/lib/demo";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildSignatureRequestInsertPayload } from "@/lib/signatures";

function getActionError(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Revisa los datos enviados.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "No se ha podido completar la acción.";
}

const createRequestSchema = z.object({
  documentId: z.string().uuid("Documento no válido."),
  requestNote: z.string().trim().max(2000).optional(),
});

const revokeRequestSchema = z.object({
  requestId: z.string().uuid("Solicitud no válida."),
});

const publicResponseSchema = z.object({
  token: z.string().trim().min(8, "Enlace no válido."),
  decision: z.enum(["accept", "reject"]),
  signerName: z.string().trim().min(2, "Indica tu nombre o razón social."),
  signerEmail: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || "")
    .refine((value) => !value || z.string().email().safeParse(value).success, {
      message: "El email indicado no es válido.",
    }),
  signerNif: z.string().trim().max(40).optional(),
  signerMessage: z.string().trim().max(2000).optional(),
});

export async function createDocumentSignatureRequestAction(formData: FormData) {
  try {
    if (isDemoMode()) {
      redirect(
        "/firmas?error=Modo%20demo:%20la%20creaci%C3%B3n%20real%20de%20solicitudes%20est%C3%A1%20desactivada.",
      );
    }

    const user = await requireUser();
    const payload = createRequestSchema.parse({
      documentId: String(formData.get("documentId") ?? ""),
      requestNote: String(formData.get("requestNote") ?? ""),
    });

    const document = await getCommercialDocumentByIdForUser(user.id, payload.documentId);

    if (!document) {
      throw new Error("No se ha encontrado el documento para solicitar firma.");
    }

    if (document.status === "converted") {
      throw new Error("El documento ya se convirtió en factura y no admite una nueva solicitud.");
    }

    if (document.document_type === "quote" && document.status === "rejected") {
      throw new Error("Este presupuesto está rechazado y no admite una nueva aceptación.");
    }

    const note = payload.requestNote?.trim() ? payload.requestNote.trim() : null;
    const supabase = await createServerSupabaseClient();

    const { error: revokeError } = await supabase
      .from("document_signature_requests")
      .update({
        status: "revoked",
        responded_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .eq("document_id", document.id)
      .eq("status", "pending");

    if (revokeError) {
      throw new Error("No se ha podido cerrar la solicitud anterior antes de crear una nueva.");
    }

    const insertPayload = buildSignatureRequestInsertPayload(document, note);
    const { data, error } = await supabase
      .from("document_signature_requests")
      .insert({
        user_id: user.id,
        ...insertPayload,
      })
      .select("id")
      .single();

    if (error || !data) {
      throw new Error("No se ha podido crear la solicitud de firma.");
    }

    if (document.document_type === "quote" && document.status === "draft") {
      await supabase
        .from("commercial_documents")
        .update({ status: "sent" })
        .eq("id", document.id)
        .eq("user_id", user.id);
    }

    if (document.document_type === "delivery_note" && document.status === "draft") {
      await supabase
        .from("commercial_documents")
        .update({ status: "delivered" })
        .eq("id", document.id)
        .eq("user_id", user.id);
    }

    revalidatePath("/firmas");
    revalidatePath("/presupuestos");
    revalidatePath("/modules");
    revalidatePath("/dashboard");

    redirect(`/firmas?created=${data.id}`);
  } catch (error) {
    redirect(`/firmas?error=${encodeURIComponent(getActionError(error))}`);
  }
}

export async function revokeDocumentSignatureRequestAction(formData: FormData) {
  try {
    if (isDemoMode()) {
      redirect(
        "/firmas?error=Modo%20demo:%20la%20revocaci%C3%B3n%20real%20de%20solicitudes%20est%C3%A1%20desactivada.",
      );
    }

    const user = await requireUser();
    const payload = revokeRequestSchema.parse({
      requestId: String(formData.get("requestId") ?? ""),
    });
    const supabase = await createServerSupabaseClient();

    const { error } = await supabase
      .from("document_signature_requests")
      .update({
        status: "revoked",
        responded_at: new Date().toISOString(),
      })
      .eq("id", payload.requestId)
      .eq("user_id", user.id)
      .eq("status", "pending");

    if (error) {
      throw new Error("No se ha podido revocar la solicitud.");
    }

    revalidatePath("/firmas");
    revalidatePath("/presupuestos");
    redirect("/firmas?updated=1");
  } catch (error) {
    redirect(`/firmas?error=${encodeURIComponent(getActionError(error))}`);
  }
}

export async function respondToDocumentSignatureAction(formData: FormData) {
  const rawToken = String(formData.get("token") ?? "");

  try {
    const payload = publicResponseSchema.parse({
      token: rawToken,
      decision: String(formData.get("decision") ?? ""),
      signerName: String(formData.get("signerName") ?? ""),
      signerEmail: String(formData.get("signerEmail") ?? ""),
      signerNif: String(formData.get("signerNif") ?? ""),
      signerMessage: String(formData.get("signerMessage") ?? ""),
    });

    if (isDemoMode()) {
      redirect(
        `/firma/${payload.token}?${
          payload.decision === "accept" ? "accepted=1" : "rejected=1"
        }`,
      );
    }

    const admin = createAdminSupabaseClient();
    const { data: request, error: requestError } = await admin
      .from("document_signature_requests")
      .select("*")
      .eq("public_token", payload.token)
      .maybeSingle();

    if (requestError || !request) {
      throw new Error("La solicitud ya no está disponible.");
    }

    if (request.status !== "pending") {
      throw new Error("Esta solicitud ya ha sido cerrada.");
    }

    if (request.expires_at && new Date(request.expires_at).getTime() < Date.now()) {
      await admin
        .from("document_signature_requests")
        .update({ status: "expired" })
        .eq("id", request.id)
        .eq("status", "pending");
      throw new Error("La solicitud ha caducado y ya no admite respuesta.");
    }

    const requestHeaders = await headers();
    const forwardedFor = requestHeaders.get("x-forwarded-for");
    const userAgent = requestHeaders.get("user-agent");
    const now = new Date().toISOString();
    const newStatus = payload.decision === "accept" ? "signed" : "rejected";

    const { error: updateError } = await admin
      .from("document_signature_requests")
      .update({
        status: newStatus,
        viewed_at: request.viewed_at ?? now,
        responded_at: now,
        signer_name: payload.signerName,
        signer_email: payload.signerEmail || null,
        signer_nif: payload.signerNif || null,
        signer_message: payload.signerMessage || null,
        evidence: {
          ...(typeof request.evidence === "object" && request.evidence ? request.evidence : {}),
          forwardedFor,
          userAgent,
          respondedAt: now,
        },
      })
      .eq("id", request.id);

    if (updateError) {
      throw new Error("No se ha podido registrar la respuesta.");
    }

    if (payload.decision === "accept") {
      const nextDocumentStatus =
        request.document_type === "quote" ? "accepted" : "signed";

      await admin
        .from("commercial_documents")
        .update({
          status: nextDocumentStatus,
        })
        .eq("id", request.document_id)
        .eq("user_id", request.user_id);
    } else if (request.document_type === "quote") {
      await admin
        .from("commercial_documents")
        .update({
          status: "rejected",
        })
        .eq("id", request.document_id)
        .eq("user_id", request.user_id);
    }

    revalidatePath("/firmas");
    revalidatePath("/presupuestos");
    revalidatePath(`/firma/${payload.token}`);

    redirect(
      `/firma/${payload.token}?${
        payload.decision === "accept" ? "accepted=1" : "rejected=1"
      }`,
    );
  } catch (error) {
    redirect(`/firma/${rawToken}?error=${encodeURIComponent(getActionError(error))}`);
  }
}
