"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CheckCheck,
  Copy,
  Download,
  ExternalLink,
  Mail,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { sendInvoiceEmailAction } from "@/lib/actions/invoices";
import { getInvoicePdfFileName } from "@/lib/invoice-files";
import type { InvoiceMonthGroup } from "@/lib/types";
import {
  cn,
  formatCurrency,
  formatDateLong,
  formatDateShort,
  formatInvoiceNumber,
} from "@/lib/utils";
import { CopyLinkButton } from "@/components/copy-link-button";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function InvoicesCollection({
  groups,
  demoMode = false,
}: {
  groups: InvoiceMonthGroup[];
  demoMode?: boolean;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const allInvoices = groups.flatMap((group) => group.items);
  const selectedInvoices = allInvoices.filter((invoice) =>
    selectedIds.includes(invoice.id),
  );
  const selectedCount = selectedInvoices.length;
  const selectedTotal = selectedInvoices.reduce(
    (sum, invoice) => sum + invoice.grandTotal,
    0,
  );
  const selectedClients = new Set(
    selectedInvoices.map((invoice) => invoice.clientName),
  ).size;
  const allVisibleSelected =
    allInvoices.length > 0 && selectedCount === allInvoices.length;
  const singleSelectedInvoice =
    selectedCount === 1 ? selectedInvoices[0] : null;

  function toggleInvoice(invoiceId: string) {
    setSelectedIds((current) =>
      current.includes(invoiceId)
        ? current.filter((item) => item !== invoiceId)
        : [...current, invoiceId],
    );
  }

  function toggleSelectVisible() {
    if (allVisibleSelected) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(allInvoices.map((invoice) => invoice.id));
  }

  async function copySelectedLinks() {
    if (!selectedInvoices.length) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        selectedInvoices.map((invoice) => invoice.publicUrl).join("\n"),
      );
      toast.success("Enlaces copiados al portapapeles.");
    } catch {
      toast.error("No se han podido copiar los enlaces.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-[28px] border border-white/60 bg-white/70 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">
            Vista agrupada por mes
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Selecciona varias facturas para revisar volumen, copiar enlaces o centrarte en un lote concreto.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={allVisibleSelected ? "secondary" : "outline"}
            size="sm"
            onClick={toggleSelectVisible}
          >
            <CheckCheck className="h-4 w-4" />
            {allVisibleSelected ? "Quitar selección" : "Seleccionar visibles"}
          </Button>
          {selectedCount ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds([])}
            >
              <X className="h-4 w-4" />
              Vaciar selección
            </Button>
          ) : null}
        </div>
      </div>

      {selectedCount ? (
        <Card className="sticky top-3 z-20 border-[color:var(--color-brand-soft)] bg-[linear-gradient(140deg,rgba(255,255,255,0.96),rgba(230,245,241,0.94))] shadow-lg shadow-[color:color-mix(in_oklab,var(--color-brand)_10%,transparent)] backdrop-blur">
          <CardContent className="mt-0 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <Badge>{selectedCount} seleccionada{selectedCount === 1 ? "" : "s"}</Badge>
              <span className="rounded-full bg-white/80 px-4 py-2 text-sm text-muted-foreground">
                {formatCurrency(selectedTotal)} acumulados
              </span>
              <span className="rounded-full bg-white/80 px-4 py-2 text-sm text-muted-foreground">
                {selectedClients} cliente{selectedClients === 1 ? "" : "s"}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void copySelectedLinks()}
              >
                <Copy className="h-4 w-4" />
                Copiar enlaces
              </Button>

              {singleSelectedInvoice ? (
                <>
                  <Button variant="outline" size="sm" asChild>
                    <Link
                      href={`/api/invoices/${singleSelectedInvoice.id}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Download className="h-4 w-4" />
                      PDF
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <Link
                      href={singleSelectedInvoice.publicUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Ver pública
                    </Link>
                  </Button>
                </>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-8">
        {groups.map((group) => (
          <section key={group.key} className="space-y-4">
            <div className="flex flex-col gap-3 rounded-[30px] border border-white/60 bg-white/70 p-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="section-kicker">Bloque mensual</p>
                <h2 className="font-display text-3xl capitalize text-foreground">
                  {group.label}
                </h2>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span className="rounded-full bg-[color:var(--color-panel)] px-4 py-2">
                  {group.items.length} facturas
                </span>
                <span className="rounded-full bg-[color:var(--color-brand-soft)] px-4 py-2 text-[color:var(--color-brand)]">
                  {formatCurrency(group.total)}
                </span>
              </div>
            </div>

            <div className="grid gap-4">
              {group.items.map((invoice) => {
                const isSelected = selectedIds.includes(invoice.id);

                return (
                  <Card
                    key={invoice.id}
                    className={cn(
                      "overflow-hidden transition-all duration-200",
                      isSelected
                        ? "border-[color:var(--color-brand)] bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(230,245,241,0.92))] shadow-lg shadow-[color:color-mix(in_oklab,var(--color-brand)_10%,transparent)]"
                        : "",
                    )}
                  >
                    <CardContent className="mt-0 space-y-5">
                      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              type="button"
                              variant={isSelected ? "default" : "outline"}
                              size="sm"
                              onClick={() => toggleInvoice(invoice.id)}
                            >
                              {isSelected ? "Seleccionada" : "Seleccionar"}
                            </Button>
                            <Badge>{formatInvoiceNumber(invoice.invoiceNumber)}</Badge>
                            <Badge variant="secondary">
                              {formatDateLong(invoice.issueDate)}
                            </Badge>
                            <Badge variant="secondary">{invoice.clientNif}</Badge>
                            {invoice.isRecent ? (
                              <Badge variant="success">Reciente</Badge>
                            ) : null}
                          </div>

                          <div className="space-y-1">
                            <h3 className="text-2xl font-semibold text-foreground">
                              {invoice.clientName}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {invoice.clientEmail}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {invoice.clientAddress}
                            </p>
                          </div>
                        </div>

                        <div className="rounded-[28px] bg-[color:var(--color-brand)] p-5 text-[color:var(--color-brand-foreground)] xl:min-w-[220px]">
                          <p className="text-sm uppercase tracking-[0.16em] opacity-80">
                            Total factura
                          </p>
                          <p className="mt-3 font-display text-4xl">
                            {formatCurrency(invoice.grandTotal)}
                          </p>
                          <p className="mt-3 text-sm opacity-90">
                            {invoice.conceptsCount} concepto
                            {invoice.conceptsCount === 1 ? "" : "s"}
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-center">
                        <div className="rounded-[26px] bg-[color:var(--color-panel)] p-4">
                          <p className="text-sm text-muted-foreground">URL pública</p>
                          <Link
                            href={invoice.publicUrl}
                            className="mt-2 block break-all text-sm font-medium text-[color:var(--color-brand)] underline decoration-[color:var(--color-brand-soft)] underline-offset-4"
                          >
                            {invoice.publicUrl}
                          </Link>
                          <p className="mt-3 text-sm text-muted-foreground">
                            Última emisión: {formatDateShort(invoice.issueDate)}
                          </p>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row xl:flex-wrap xl:justify-end">
                          <Button variant="outline" asChild>
                            <Link
                              href={`/api/invoices/${invoice.id}/pdf`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <Download className="h-4 w-4" />
                              Descargar PDF
                            </Link>
                          </Button>

                          <form action={sendInvoiceEmailAction}>
                            <input type="hidden" name="invoiceId" value={invoice.id} />
                            <SubmitButton
                              variant="secondary"
                              pendingLabel="Enviando..."
                              className="w-full sm:w-auto"
                              disabled={demoMode}
                            >
                              <Mail className="h-4 w-4" />
                              {demoMode ? "Email desactivado en demo" : "Enviar por email"}
                            </SubmitButton>
                          </form>

                          <CopyLinkButton value={invoice.publicUrl} />

                          <Button variant="ghost" asChild>
                            <Link
                              href={invoice.publicUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <ExternalLink className="h-4 w-4" />
                              Ver pública
                            </Link>
                          </Button>

                          <Button variant="ghost" asChild>
                            <Link
                              href={`/api/invoices/${invoice.id}/pdf`}
                              download={getInvoicePdfFileName(invoice.invoiceNumber)}
                            >
                              PDF
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
