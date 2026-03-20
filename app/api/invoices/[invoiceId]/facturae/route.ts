import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import {
  getFacturaeInvoiceByIdForUser,
  getInvoiceFacturaeFileName,
  renderFacturaeXml,
} from "@/lib/facturae";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _: Request,
  context: {
    params: Promise<{
      invoiceId: string;
    }>;
  },
) {
  try {
    const user = await requireUser();
    const { invoiceId } = await context.params;
    const invoice = await getFacturaeInvoiceByIdForUser(user.id, invoiceId);

    if (!invoice) {
      return NextResponse.json(
        { error: "No se ha encontrado la factura solicitada." },
        { status: 404 },
      );
    }

    const xml = renderFacturaeXml(invoice);

    return new NextResponse(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Content-Disposition": `attachment; filename="${getInvoiceFacturaeFileName(
          invoice.invoice_number,
        )}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se ha podido generar el XML Facturae.",
      },
      { status: 500 },
    );
  }
}
