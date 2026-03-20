import { NextResponse } from "next/server";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { z } from "zod";

import type { FacturaIaBackup } from "@/lib/backups";
import { restoreBackupForUser } from "@/lib/backups";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const backupSchema = z.object({
  schemaVersion: z.literal(1),
  exportedAt: z.string(),
  source: z.enum(["demo", "live"]).optional(),
  appUrl: z.string().optional(),
  user: z.object({
    id: z.string(),
    email: z.string(),
  }),
  profile: z
    .object({
      email: z.string().optional(),
      full_name: z.string().nullable().optional(),
      nif: z.string().nullable().optional(),
      address: z.string().nullable().optional(),
      logo_path: z.string().nullable().optional(),
      logo_url: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  clients: z
    .array(
      z.object({
        id: z.string(),
        relation_kind: z.enum(["client", "supplier", "mixed"]),
        status: z.enum(["lead", "active", "paused", "archived"]),
        priority: z.enum(["low", "medium", "high"]),
        display_name: z.string(),
        first_name: z.string().nullable().optional(),
        last_name: z.string().nullable().optional(),
        company_name: z.string().nullable().optional(),
        email: z.string().nullable().optional(),
        phone: z.string().nullable().optional(),
        nif: z.string().nullable().optional(),
        address: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
        tags: z.array(z.string()).default([]),
        created_at: z.string().optional(),
        updated_at: z.string().optional(),
      }),
    )
    .default([]),
  invoices: z
    .array(
      z.object({
        id: z.string(),
        public_id: z.string(),
        invoice_number: z.number(),
        issue_date: z.string(),
        issuer_name: z.string(),
        issuer_nif: z.string(),
        issuer_address: z.string(),
        issuer_logo_url: z.string().nullable().optional(),
        client_name: z.string(),
        client_nif: z.string(),
        client_address: z.string(),
        client_email: z.string(),
        line_items: z.any(),
        vat_breakdown: z.any(),
        subtotal: z.union([z.number(), z.string()]),
        vat_total: z.union([z.number(), z.string()]),
        irpf_rate: z.union([z.number(), z.string()]),
        irpf_amount: z.union([z.number(), z.string()]),
        grand_total: z.union([z.number(), z.string()]),
        created_at: z.string().optional(),
        updated_at: z.string().optional(),
      }),
    )
    .default([]),
  commercialDocuments: z
    .array(
      z.object({
        id: z.string(),
        document_type: z.enum(["quote", "delivery_note"]),
        status: z.enum([
          "draft",
          "sent",
          "accepted",
          "rejected",
          "delivered",
          "signed",
          "converted",
        ]),
        public_id: z.string(),
        document_number: z.number(),
        issue_date: z.string(),
        valid_until: z.string().nullable().optional(),
        issuer_name: z.string(),
        issuer_nif: z.string(),
        issuer_address: z.string(),
        issuer_logo_url: z.string().nullable().optional(),
        client_name: z.string(),
        client_nif: z.string(),
        client_address: z.string(),
        client_email: z.string(),
        line_items: z.any(),
        vat_breakdown: z.any(),
        subtotal: z.union([z.number(), z.string()]),
        vat_total: z.union([z.number(), z.string()]),
        irpf_rate: z.union([z.number(), z.string()]),
        irpf_amount: z.union([z.number(), z.string()]),
        grand_total: z.union([z.number(), z.string()]),
        notes: z.string().nullable().optional(),
        converted_invoice_id: z.string().nullable().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional(),
      }),
    )
    .default([]),
  documentSignatureRequests: z
    .array(
      z.object({
        id: z.string(),
        document_id: z.string(),
        document_type: z.enum(["quote", "delivery_note"]),
        request_kind: z.enum(["quote_acceptance", "delivery_note_signature"]),
        status: z.enum(["pending", "signed", "rejected", "revoked", "expired"]),
        public_token: z.string(),
        request_note: z.string().nullable().optional(),
        requested_at: z.string(),
        expires_at: z.string().nullable().optional(),
        viewed_at: z.string().nullable().optional(),
        responded_at: z.string().nullable().optional(),
        signer_name: z.string().nullable().optional(),
        signer_email: z.string().nullable().optional(),
        signer_nif: z.string().nullable().optional(),
        signer_message: z.string().nullable().optional(),
        evidence: z.any(),
        created_at: z.string().optional(),
        updated_at: z.string().optional(),
      }),
    )
    .default([]),
  expenses: z
    .array(
      z.object({
        id: z.string(),
        expense_kind: z.enum(["ticket", "supplier_invoice"]),
        review_status: z.enum(["draft", "reviewed"]),
        vendor_name: z.string().nullable().optional(),
        vendor_nif: z.string().nullable().optional(),
        expense_date: z.string().nullable().optional(),
        currency: z.string().default("EUR"),
        base_amount: z.union([z.number(), z.string()]).nullable().optional(),
        vat_amount: z.union([z.number(), z.string()]).nullable().optional(),
        total_amount: z.union([z.number(), z.string()]).nullable().optional(),
        notes: z.string().nullable().optional(),
        source_file_name: z.string().nullable().optional(),
        source_file_path: z.string().nullable().optional(),
        source_file_mime_type: z.string().nullable().optional(),
        text_extraction_method: z.enum(["manual", "pdf_text", "plain_text", "unavailable"]),
        raw_text: z.string().nullable().optional(),
        extracted_payload: z.any(),
        created_at: z.string().optional(),
        updated_at: z.string().optional(),
      }),
    )
    .default([]),
  bankMovements: z
    .array(
      z.object({
        id: z.string(),
        account_label: z.string(),
        booking_date: z.string(),
        value_date: z.string().nullable().optional(),
        description: z.string(),
        counterparty_name: z.string().nullable().optional(),
        amount: z.union([z.number(), z.string()]),
        currency: z.string().default("EUR"),
        direction: z.enum(["credit", "debit"]),
        balance: z.union([z.number(), z.string()]).nullable().optional(),
        status: z.enum(["pending", "reconciled", "ignored"]),
        matched_invoice_id: z.string().nullable().optional(),
        matched_expense_id: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
        source_file_name: z.string().nullable().optional(),
        source_hash: z.string(),
        raw_row: z.any(),
        imported_at: z.string(),
        created_at: z.string().optional(),
        updated_at: z.string().optional(),
      }),
    )
    .default([]),
  aiUsage: z
    .array(
      z.object({
        date: z.string(),
        calls_count: z.number(),
        created_at: z.string().optional(),
        updated_at: z.string().optional(),
      }),
    )
    .default([]),
  messages: z
    .object({
      connections: z
        .array(
          z.object({
            id: z.string(),
            channel: z.enum(["whatsapp", "telegram"]),
            label: z.string(),
            status: z.enum(["draft", "active", "paused"]),
            inbound_key: z.string(),
            verify_token: z.string(),
            metadata: z.any(),
            created_at: z.string().optional(),
            updated_at: z.string().optional(),
          }),
        )
        .default([]),
      threads: z
        .array(
          z.object({
            id: z.string(),
            connection_id: z.string().nullable().optional(),
            channel: z.enum(["whatsapp", "telegram"]),
            external_chat_id: z.string(),
            external_contact_id: z.string().nullable().optional(),
            first_name: z.string().nullable().optional(),
            last_name: z.string().nullable().optional(),
            full_name: z.string(),
            phone: z.string().nullable().optional(),
            telegram_username: z.string().nullable().optional(),
            urgency: z.enum(["low", "medium", "high"]),
            urgency_score: z.number(),
            urgency_locked: z.boolean(),
            unread_count: z.number(),
            last_message_preview: z.string().nullable().optional(),
            last_message_direction: z.enum(["inbound", "outbound"]),
            last_message_at: z.string(),
            metadata: z.any(),
            created_at: z.string().optional(),
            updated_at: z.string().optional(),
          }),
        )
        .default([]),
      records: z
        .array(
          z.object({
            id: z.string(),
            thread_id: z.string(),
            channel: z.enum(["whatsapp", "telegram"]),
            external_message_id: z.string().nullable().optional(),
            direction: z.enum(["inbound", "outbound"]),
            sender_name: z.string().nullable().optional(),
            body: z.string(),
            message_type: z.string(),
            received_at: z.string(),
            raw_payload: z.any(),
            created_at: z.string().optional(),
          }),
        )
        .default([]),
    })
    .default({
      connections: [],
      threads: [],
      records: [],
    }),
  mail: z
    .object({
      threads: z
        .array(
          z.object({
            id: z.string(),
            source: z.literal("imap"),
            external_thread_key: z.string(),
            from_name: z.string().nullable().optional(),
            from_email: z.string(),
            subject: z.string().nullable().optional(),
            urgency: z.enum(["low", "medium", "high"]),
            urgency_score: z.number(),
            unread_count: z.number(),
            last_message_preview: z.string().nullable().optional(),
            last_message_at: z.string(),
            metadata: z.any(),
            created_at: z.string().optional(),
            updated_at: z.string().optional(),
          }),
        )
        .default([]),
      messages: z
        .array(
          z.object({
            id: z.string(),
            thread_id: z.string(),
            source: z.literal("imap"),
            external_message_id: z.string(),
            from_name: z.string().nullable().optional(),
            from_email: z.string(),
            to_emails: z.array(z.string()).default([]),
            subject: z.string().nullable().optional(),
            body_text: z.string(),
            body_html: z.string().nullable().optional(),
            received_at: z.string(),
            raw_headers: z.any(),
            created_at: z.string().optional(),
          }),
        )
        .default([]),
      syncRuns: z
        .array(
          z.object({
            id: z.string(),
            source: z.literal("imap"),
            status: z.enum(["success", "error"]),
            imported_count: z.number(),
            detail: z.string().nullable().optional(),
            created_at: z.string().optional(),
          }),
        )
        .default([]),
    })
    .default({
      threads: [],
      messages: [],
      syncRuns: [],
    }),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const formData = await request.formData();
    const file = formData.get("backup");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Selecciona un archivo JSON de copia de seguridad." },
        { status: 400 },
      );
    }

    const text = await file.text();
    const parsed = backupSchema.parse(JSON.parse(text)) as FacturaIaBackup;
    const restored = await restoreBackupForUser(user.id, user.email ?? "", parsed);

    return NextResponse.json({
      ok: true,
      restored,
    });
  } catch (error) {
    if (isRedirectError(error)) {
      return NextResponse.json(
        { error: "Necesitas iniciar sesión para restaurar una copia de seguridad." },
        { status: 401 },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof z.ZodError
            ? error.issues[0]?.message ?? "El archivo no tiene el formato esperado."
            : error instanceof Error
              ? error.message
              : "No se ha podido restaurar la copia de seguridad.",
      },
      { status: 500 },
    );
  }
}
