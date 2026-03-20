import Link from "next/link";
import { Download, ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";

import { getDemoInvoiceByPublicId, isDemoMode } from "@/lib/demo";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { InvoiceRecord } from "@/lib/types";
import {
  formatCurrency,
  formatDateLong,
  formatInvoiceNumber,
} from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const invoice = isDemoMode()
    ? getDemoInvoiceByPublicId(publicId)
    : (
        await createAdminSupabaseClient()
          .from("invoices")
          .select("*")
          .eq("public_id", publicId)
          .maybeSingle()
      ).data;

  if (!invoice) {
    notFound();
  }

  const typedInvoice = invoice as InvoiceRecord;

  return (
    <main className="page-shell px-2 py-10 sm:py-14">
      {isDemoMode() ? (
        <div className="status-banner mb-6">
          Estás viendo una factura pública de ejemplo en modo demo local.
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>{formatInvoiceNumber(typedInvoice.invoice_number)}</CardTitle>
            <CardDescription>
              Factura pública disponible para consulta y descarga.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[24px] bg-[color:var(--color-panel)] p-4">
                <p className="text-sm text-muted-foreground">Emisor</p>
                <p className="mt-2 font-semibold text-foreground">
                  {typedInvoice.issuer_name}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {typedInvoice.issuer_nif}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {typedInvoice.issuer_address}
                </p>
              </div>
              <div className="rounded-[24px] bg-[color:var(--color-panel)] p-4">
                <p className="text-sm text-muted-foreground">Cliente</p>
                <p className="mt-2 font-semibold text-foreground">
                  {typedInvoice.client_name}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {typedInvoice.client_nif}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Vencimiento: {formatDateLong(typedInvoice.due_date)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {typedInvoice.client_email}
                </p>
              </div>
            </div>

            <div className="rounded-[24px] border border-white/60 bg-white/75 p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="font-semibold text-foreground">Conceptos</p>
                <p className="text-sm text-muted-foreground">
                  Emitida {formatDateLong(typedInvoice.issue_date)} · Vence {formatDateLong(typedInvoice.due_date)}
                </p>
              </div>
              <div className="space-y-3">
                {typedInvoice.line_items.map((line, index) => (
                  <div
                    key={`${line.description}-${index}`}
                    className="flex flex-col gap-2 rounded-[20px] bg-[color:var(--color-panel)] p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium text-foreground">{line.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {line.quantity} x {formatCurrency(Number(line.unitPrice))} · IVA {line.vatRate}%
                      </p>
                    </div>
                    <p className="text-lg font-semibold text-[color:var(--color-brand)]">
                      {formatCurrency(Number(line.lineTotal))}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Total y descarga</CardTitle>
            <CardDescription>
              Este documento incluye pie de &quot;Factura preparada para VeriFactu&quot;.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[26px] bg-[color:var(--color-brand)] p-6 text-[color:var(--color-brand-foreground)]">
              <p className="text-sm uppercase tracking-[0.18em] opacity-80">
                Total factura
              </p>
              <p className="mt-3 font-display text-5xl">
                {formatCurrency(Number(typedInvoice.grand_total))}
              </p>
            </div>

            <Button className="w-full" asChild>
              <Link href={`/api/public/invoices/${publicId}/pdf`} target="_blank">
                <Download className="h-4 w-4" />
                Descargar PDF profesional
              </Link>
            </Button>

            <Button variant="outline" className="w-full" asChild>
              <Link href="/" target="_blank">
                <ExternalLink className="h-4 w-4" />
                Abrir FacturaIA
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
