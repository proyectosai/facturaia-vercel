import { NextResponse } from "next/server";

import { getDemoInvoiceByPublicId, isDemoMode, isLocalFileMode } from "@/lib/demo";
import { getInvoicePdfFileName } from "@/lib/invoice-files";
import { renderInvoicePdfBuffer } from "@/lib/invoices";
import { getLocalInvoiceByPublicId } from "@/lib/local-core";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { InvoiceRecord } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ publicId: string }> },
) {
  const { publicId } = await params;

  if (isDemoMode()) {
    const invoice = getDemoInvoiceByPublicId(publicId);

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
    const invoice = await getLocalInvoiceByPublicId(publicId);

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

  const supabase = createAdminSupabaseClient();
  const { data: invoice } = await supabase
    .from("invoices")
    .select("*")
    .eq("public_id", publicId)
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
