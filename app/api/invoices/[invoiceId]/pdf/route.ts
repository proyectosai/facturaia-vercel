import { NextResponse } from "next/server";

import { getOptionalUser } from "@/lib/auth";
import { getDemoInvoiceById, isDemoMode, isLocalFileMode } from "@/lib/demo";
import { getInvoicePdfFileName } from "@/lib/invoice-files";
import { renderInvoicePdfBuffer } from "@/lib/invoices";
import { getLocalInvoiceById } from "@/lib/local-core";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { InvoiceRecord } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ invoiceId: string }> },
) {
  const { invoiceId } = await params;

  if (isDemoMode()) {
    const invoice = getDemoInvoiceById(invoiceId);

    if (!invoice) {
      return NextResponse.json({ error: "Factura no encontrada." }, { status: 404 });
    }

    const pdfBuffer = await renderInvoicePdfBuffer(invoice);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${getInvoicePdfFileName(invoice.invoice_number)}"`,
      },
    });
  }

  if (isLocalFileMode()) {
    const user = await getOptionalUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const invoice = await getLocalInvoiceById(user.id, invoiceId);

    if (!invoice) {
      return NextResponse.json({ error: "Factura no encontrada." }, { status: 404 });
    }

    const pdfBuffer = await renderInvoicePdfBuffer(invoice);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${getInvoicePdfFileName(invoice.invoice_number)}"`,
      },
    });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!invoice) {
    return NextResponse.json({ error: "Factura no encontrada." }, { status: 404 });
  }

  const pdfBuffer = await renderInvoicePdfBuffer(invoice as InvoiceRecord);

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${getInvoicePdfFileName((invoice as InvoiceRecord).invoice_number)}"`,
    },
  });
}
