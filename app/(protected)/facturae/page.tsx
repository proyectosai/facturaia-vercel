import Link from "next/link";
import {
  ArrowUpRight,
  CircleAlert,
  Download,
  FileCheck2,
  FileCode2,
  Landmark,
  ShieldCheck,
} from "lucide-react";

import { requireUser } from "@/lib/auth";
import {
  getFacturaeInvoicesForUser,
  getFacturaeReadiness,
} from "@/lib/facturae";
import { isDemoMode } from "@/lib/demo";
import { cn, formatCurrency, formatDateShort, formatInvoiceNumber } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const officialLinks = [
  {
    title: "Facturae 3.2.2 en BOE",
    href: "https://www.boe.es/boe/dias/2017/08/25/pdfs/BOE-A-2017-9982.pdf",
    description:
      "Orden HFP/816/2017 con la nueva versión 3.2.2 del formato Facturae.",
  },
  {
    title: "Portal oficial Facturae",
    href: "https://www.facturae.gob.es/formato/Paginas/versiones-anteriores-formato-facturae.aspx",
    description:
      "Portal público del formato Facturae con materiales y referencias del esquema.",
  },
  {
    title: "Reglamento VeriFactu",
    href: "https://www.boe.es/buscar/act.php?id=BOE-A-2023-24840",
    description:
      "Real Decreto 1007/2023 sobre requisitos de sistemas informáticos de facturación.",
  },
  {
    title: "Descripción técnica AEAT",
    href: "https://sede.agenciatributaria.gob.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Veri-Factu_Descripcion_SWeb.pdf",
    description:
      "Documento técnico de la AEAT para remisión de registros de facturación.",
  },
  {
    title: "Nota AEAT sobre plazos",
    href: "https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu/nota-informativa-ampliacion-plazo-adaptacion-facturacion.html",
    description:
      "Plazos verificados a 20 de marzo de 2026: 1 de enero de 2027 para IS y 1 de julio de 2027 para el resto.",
  },
];

function getSingleSearchParam(value: string | string[] | undefined, fallback = "") {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }

  return value ?? fallback;
}

function buildFacturaeHref(q?: string) {
  const params = new URLSearchParams();

  if (q?.trim()) {
    params.set("q", q.trim());
  }

  const query = params.toString();
  return query ? `/facturae?${query}` : "/facturae";
}

export default async function FacturaePage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
  }>;
}) {
  const user = await requireUser();
  const demoMode = isDemoMode();
  const params = await searchParams;
  const q = getSingleSearchParam(params.q);
  const invoices = await getFacturaeInvoicesForUser(user.id);
  const preparedInvoices = invoices
    .filter((invoice) => {
      if (!q.trim()) {
        return true;
      }

      const query = q.trim().toLowerCase();
      return (
        String(invoice.invoice_number).includes(query) ||
        formatInvoiceNumber(invoice.invoice_number).toLowerCase().includes(query) ||
        invoice.client_name.toLowerCase().includes(query) ||
        invoice.client_nif.toLowerCase().includes(query)
      );
    })
    .map((invoice) => getFacturaeReadiness(invoice));
  const readyCount = preparedInvoices.filter((invoice) => invoice.isReady).length;
  const warningCount = preparedInvoices.reduce(
    (count, invoice) =>
      count + invoice.issues.filter((issue) => issue.level === "warning").length,
    0,
  );
  const totalAmount = preparedInvoices.reduce(
    (sum, item) => sum + item.invoice.grand_total,
    0,
  );

  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr] xl:items-end">
        <div className="max-w-4xl space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge>Facturae / VeriFactu</Badge>
            <Badge variant="secondary">Primera entrega</Badge>
            {demoMode ? <Badge variant="secondary">Modo demo</Badge> : null}
          </div>

          <div className="space-y-3">
            <p className="section-kicker">Cumplimiento y exportación</p>
            <h1 className="font-display text-5xl leading-none tracking-tight text-foreground">
              Prepara tus facturas para exportarlas en XML Facturae y seguir de cerca el marco VeriFactu.
            </h1>
            <p className="text-lg leading-8 text-muted-foreground">
              Esta entrega no automatiza FACe ni la remisión a la AEAT. Sí deja lista una base
              útil: exporta XML Facturae 3.2.2 sin firma, marca advertencias de revisión y te
              centraliza la normativa oficial.
            </p>
          </div>
        </div>

        <Card className="overflow-hidden bg-[linear-gradient(150deg,rgba(255,255,255,0.95),rgba(232,246,242,0.88))]">
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-[24px] bg-white/82 p-4">
              <p className="text-sm text-muted-foreground">Facturas visibles</p>
              <p className="mt-2 font-display text-3xl text-foreground">{preparedInvoices.length}</p>
              <p className="mt-2 text-sm text-muted-foreground">Lista filtrada para exportación.</p>
            </div>
            <div className="rounded-[24px] bg-white/82 p-4">
              <p className="text-sm text-muted-foreground">Listas para borrador XML</p>
              <p className="mt-2 font-display text-3xl text-foreground">{readyCount}</p>
              <p className="mt-2 text-sm text-muted-foreground">Sin bloqueos duros en esta revisión.</p>
            </div>
            <div className="rounded-[24px] bg-white/82 p-4">
              <p className="text-sm text-muted-foreground">Importe total</p>
              <p className="mt-2 font-display text-3xl text-foreground">{formatCurrency(totalAmount)}</p>
              <p className="mt-2 text-sm text-muted-foreground">{warningCount} avisos a revisar.</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.96fr_1.04fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[color:var(--color-brand-soft)] p-3 text-[color:var(--color-brand)]">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Qué cubre esta fase</CardTitle>
                <CardDescription>
                  Cumplimiento parcial y controlado para instalaciones privadas.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[26px] bg-[color:var(--color-panel)] p-5 text-sm leading-7 text-muted-foreground">
              Genera un <strong>borrador XML Facturae 3.2.2</strong> a partir de la factura ya
              emitida, con emisor, cliente, líneas, IVA y retención básica. El fichero sale sin
              firma XAdES y sin envío automático a FACe o VeriFactu.
            </div>
            <div className="rounded-[26px] bg-[color:rgba(251,247,241,0.82)] p-5 text-sm leading-7 text-muted-foreground">
              Según la nota oficial de la AEAT que está enlazada aquí, a fecha de <strong>20 de marzo de 2026</strong> el calendario queda situado en <strong>1 de enero de 2027</strong> para contribuyentes del Impuesto sobre Sociedades y <strong>1 de julio de 2027</strong> para el resto de obligados.
            </div>
            <div className="grid gap-3">
              {[
                "Exportación XML Facturae 3.2.2 sin firma",
                "Checklist visual por factura antes de sacar el XML",
                "Avisos para direcciones, códigos postales y retenciones",
                "Panel propio para revisar normativa y estado de preparación",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-[22px] bg-white/80 p-4">
                  <FileCheck2 className="mt-1 h-4 w-4 text-[color:var(--color-success)]" />
                  <p className="text-sm leading-6 text-muted-foreground">{item}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fuentes oficiales</CardTitle>
            <CardDescription>
              Referencias primarias para seguir el marco español sin depender de resúmenes de terceros.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {officialLinks.map((item) => (
              <div key={item.href} className="rounded-[26px] bg-[color:var(--color-panel)] p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">{item.title}</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                  </div>
                  <Button variant="outline" asChild>
                    <Link href={item.href} target="_blank" rel="noreferrer">
                      Abrir
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Buscar facturas para exportar</CardTitle>
          <CardDescription>
            Busca por número, cliente o NIF y descarga el XML borrador de cada una.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action="/facturae" className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <div className="space-y-2">
              <Label htmlFor="q">Buscar</Label>
              <Input
                id="q"
                name="q"
                defaultValue={q}
                placeholder="FAC-1027, cliente o NIF"
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full md:w-auto">
                Filtrar
              </Button>
            </div>
            <div className="flex items-end">
              <Button variant="outline" asChild className="w-full md:w-auto">
                <Link href={buildFacturaeHref()}>Limpiar</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div>
          <p className="section-kicker">Exportador</p>
          <h2 className="font-display text-4xl text-foreground">
            XML Facturae por factura
          </h2>
        </div>

        <div className="grid gap-4">
          {preparedInvoices.length > 0 ? (
            preparedInvoices.map((item) => (
              <Card key={item.invoice.id}>
                <CardContent className="space-y-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <Badge>{formatInvoiceNumber(item.invoice.invoice_number)}</Badge>
                        <Badge variant={item.isReady ? "success" : "secondary"}>
                          {item.isReady ? "Lista para borrador XML" : "Requiere revisión"}
                        </Badge>
                      </div>
                      <h3 className="mt-3 text-2xl font-semibold text-foreground">
                        {item.invoice.client_name}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {item.invoice.client_nif} · {formatDateShort(item.invoice.issue_date)} ·{" "}
                        {formatCurrency(item.invoice.grand_total)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Button variant="outline" asChild>
                        <Link href="/invoices">
                          <Landmark className="h-4 w-4" />
                          Abrir facturas
                        </Link>
                      </Button>
                      <Button asChild>
                        <Link href={`/api/invoices/${item.invoice.id}/facturae`}>
                          <Download className="h-4 w-4" />
                          Descargar XML
                        </Link>
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
                    <div className="rounded-[24px] bg-[color:rgba(251,247,241,0.78)] p-4">
                      <p className="text-sm font-semibold text-foreground">Resumen</p>
                      <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                        <p>Base imponible: {formatCurrency(item.invoice.subtotal)}</p>
                        <p>IVA total: {formatCurrency(item.invoice.vat_total)}</p>
                        {item.invoice.irpf_rate > 0 ? (
                          <p>
                            IRPF ({item.invoice.irpf_rate}%): -{formatCurrency(item.invoice.irpf_amount)}
                          </p>
                        ) : null}
                        <p>Total factura: {formatCurrency(item.invoice.grand_total)}</p>
                        <p>Conceptos: {item.invoice.line_items.length}</p>
                      </div>
                    </div>

                    <div className="rounded-[24px] bg-[color:rgba(19,45,52,0.04)] p-4">
                      <p className="text-sm font-semibold text-foreground">Avisos</p>
                      <div className="mt-3 space-y-2">
                        {item.issues.map((issue, index) => (
                          <div
                            key={`${item.invoice.id}-${index}`}
                            className={cn(
                              "flex items-start gap-3 rounded-[18px] px-3 py-3 text-sm leading-6",
                              issue.level === "warning"
                                ? "bg-[color:rgba(202,145,34,0.14)] text-[color:#8b5b00]"
                                : "bg-white/78 text-muted-foreground",
                            )}
                          >
                            <CircleAlert className="mt-1 h-4 w-4" />
                            <p>{issue.message}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="border-dashed border-white/70 bg-white/76">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="rounded-full bg-[color:var(--color-brand-soft)] p-4 text-[color:var(--color-brand)]">
                  <FileCode2 className="h-6 w-6" />
                </div>
                <p className="mt-5 text-xl font-semibold text-foreground">
                  No hay facturas que mostrar en este filtro.
                </p>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
                  Emite primero una factura o limpia la búsqueda para revisar el exportador XML.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <Button asChild>
                    <Link href="/new-invoice">Nueva factura</Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/invoices">Abrir historial</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}
