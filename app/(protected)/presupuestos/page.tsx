import Link from "next/link";
import { ArrowRightLeft, FileCheck2, FileText, ReceiptText } from "lucide-react";

import { requireUser } from "@/lib/auth";
import {
  convertCommercialDocumentToInvoiceAction,
  updateCommercialDocumentStatusAction,
} from "@/lib/actions/commercial-documents";
import {
  buildCommercialDocumentMeta,
  buildCommercialDocumentStatusDescription,
  canConvertCommercialDocument,
  commercialDocumentStatusLabels,
  commercialDocumentTypeLabels,
  getCommercialDocumentStatusActions,
  getCommercialDocumentSummary,
  getCommercialDocumentsForUser,
} from "@/lib/commercial-documents";
import { isDemoMode } from "@/lib/demo";
import type { CommercialDocumentRecord } from "@/lib/types";
import { getCurrentProfile } from "@/lib/auth";
import { cn, formatCurrency } from "@/lib/utils";
import { CommercialDocumentForm } from "@/components/commercial/commercial-document-form";
import { RouteToast } from "@/components/route-toast";
import { SubmitButton } from "@/components/submit-button";
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

function getSingleSearchParam(
  value: string | string[] | undefined,
  fallback = "",
) {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }

  return value ?? fallback;
}

function getStatusTone(document: CommercialDocumentRecord) {
  if (document.status === "converted") {
    return "bg-[color:rgba(47,125,50,0.12)] text-[color:var(--color-success)]";
  }

  if (document.status === "accepted" || document.status === "signed") {
    return "bg-[color:rgba(19,45,52,0.1)] text-[color:var(--color-brand)]";
  }

  if (document.status === "rejected") {
    return "bg-[color:rgba(190,64,48,0.12)] text-[color:#a73d2b]";
  }

  return "bg-[color:rgba(202,145,34,0.14)] text-[color:#8b5b00]";
}

function buildCommercialHref({
  q,
  type,
  status,
}: {
  q?: string;
  type?: string;
  status?: string;
}) {
  const params = new URLSearchParams();

  if (q?.trim()) {
    params.set("q", q.trim());
  }

  if (type && type !== "all") {
    params.set("type", type);
  }

  if (status && status !== "all") {
    params.set("status", status);
  }

  const query = params.toString();
  return query ? `/presupuestos?${query}` : "/presupuestos";
}

function DocumentCard({
  document,
  demoMode,
}: {
  document: CommercialDocumentRecord;
  demoMode: boolean;
}) {
  const meta = buildCommercialDocumentMeta(document);
  const actions = getCommercialDocumentStatusActions(document);
  const canConvert = canConvertCommercialDocument(document);

  return (
    <Card className="overflow-hidden border-white/60 bg-white/86">
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Badge>{commercialDocumentTypeLabels[document.document_type]}</Badge>
              <div
                className={cn(
                  "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]",
                  getStatusTone(document),
                )}
              >
                {commercialDocumentStatusLabels[document.status]}
              </div>
            </div>
            <CardTitle className="text-2xl">{meta.number}</CardTitle>
            <CardDescription>{document.client_name}</CardDescription>
          </div>

          <div className="rounded-[24px] bg-[color:rgba(241,246,243,0.82)] px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Total
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{meta.total}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-[24px] bg-[color:rgba(251,247,241,0.72)] p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Emisión
            </p>
            <p className="mt-2 text-sm font-medium text-foreground">{meta.issueDate}</p>
          </div>
          <div className="rounded-[24px] bg-[color:rgba(251,247,241,0.72)] p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Validez
            </p>
            <p className="mt-2 text-sm font-medium text-foreground">
              {meta.validUntil ?? "No aplica"}
            </p>
          </div>
          <div className="rounded-[24px] bg-[color:rgba(251,247,241,0.72)] p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Líneas
            </p>
            <p className="mt-2 text-sm font-medium text-foreground">{meta.lines}</p>
          </div>
          <div className="rounded-[24px] bg-[color:rgba(251,247,241,0.72)] p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Cliente
            </p>
            <p className="mt-2 text-sm font-medium text-foreground">{document.client_email}</p>
          </div>
        </div>

        <div className="rounded-[28px] bg-[color:rgba(241,246,243,0.82)] p-5">
          <p className="text-sm font-medium text-foreground">
            {buildCommercialDocumentStatusDescription(document)}
          </p>
          {document.notes ? (
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{document.notes}</p>
          ) : null}
        </div>

        <div className="grid gap-3 xl:grid-cols-[1fr_auto] xl:items-start">
          <div className="flex flex-wrap gap-2">
            {actions.map((action) => (
              <form key={action.status} action={demoMode ? undefined : updateCommercialDocumentStatusAction}>
                <input type="hidden" name="documentId" value={document.id} />
                <input type="hidden" name="status" value={action.status} />
                <SubmitButton
                  variant="outline"
                  size="sm"
                  pendingLabel="Actualizando..."
                  disabled={demoMode}
                >
                  {action.label}
                </SubmitButton>
              </form>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 xl:justify-end">
            <Link href="/new-invoice">
              <Button variant="ghost" size="sm">
                Revisar emisión manual
              </Button>
            </Link>

            <form action={demoMode ? undefined : convertCommercialDocumentToInvoiceAction}>
              <input type="hidden" name="documentId" value={document.id} />
              <SubmitButton
                size="sm"
                pendingLabel="Convirtiendo..."
                disabled={demoMode || !canConvert}
              >
                <ArrowRightLeft className="h-4 w-4" />
                Convertir en factura
              </SubmitButton>
            </form>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function PresupuestosPage({
  searchParams,
}: {
  searchParams: Promise<{
    created?: string | string[];
    updated?: string | string[];
    error?: string | string[];
    q?: string | string[];
    type?: string | string[];
    status?: string | string[];
  }>;
}) {
  const user = await requireUser();
  const profile = await getCurrentProfile();
  const demoMode = isDemoMode();
  const params = await searchParams;
  const created = getSingleSearchParam(params.created);
  const updated = getSingleSearchParam(params.updated);
  const error = getSingleSearchParam(params.error);
  const q = getSingleSearchParam(params.q);
  const type = getSingleSearchParam(params.type, "all");
  const status = getSingleSearchParam(params.status, "all");
  const allDocuments = await getCommercialDocumentsForUser(user.id, { type: "all", status: "all" });
  const documents = await getCommercialDocumentsForUser(user.id, {
    query: q,
    type: type === "quote" || type === "delivery_note" ? type : "all",
    status:
      status === "draft" ||
      status === "sent" ||
      status === "accepted" ||
      status === "rejected" ||
      status === "delivered" ||
      status === "signed" ||
      status === "converted"
        ? status
        : "all",
  });
  const summary = getCommercialDocumentSummary(allDocuments);
  const quotes = documents.filter((document) => document.document_type === "quote");
  const deliveryNotes = documents.filter(
    (document) => document.document_type === "delivery_note",
  );
  const readyToInvoice = documents.filter((document) => canConvertCommercialDocument(document));

  return (
    <div className="space-y-8">
      <RouteToast
        type="success"
        message={created ? "Documento guardado correctamente." : null}
      />
      <RouteToast
        type="success"
        message={updated ? "Estado actualizado correctamente." : null}
      />
      <RouteToast type="error" message={error || null} />

      <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr] xl:items-end">
        <div className="max-w-4xl space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge>Presupuestos y albaranes</Badge>
            <Badge variant="secondary">Pre-facturación</Badge>
            {demoMode ? <Badge variant="secondary">Modo demo</Badge> : null}
          </div>

          <div className="space-y-3">
            <p className="section-kicker">Flujo previo a la factura</p>
            <h1 className="font-display text-5xl leading-none tracking-tight text-foreground">
              Guarda presupuestos y albaranes sin salir del circuito fiscal.
            </h1>
            <p className="text-lg leading-8 text-muted-foreground">
              Este módulo cubre la fase previa a emitir una factura: preparar una
              oferta económica, dejar constancia de una entrega y convertir ese
              documento en factura definitiva cuando toque facturar.
            </p>
          </div>
        </div>

        <Card className="overflow-hidden bg-[linear-gradient(150deg,rgba(255,255,255,0.95),rgba(232,246,242,0.9))]">
          <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[24px] bg-white/82 p-4">
              <p className="text-sm text-muted-foreground">Documentos</p>
              <p className="mt-2 font-display text-3xl text-foreground">{summary.total}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Presupuestos y albaranes guardados.
              </p>
            </div>
            <div className="rounded-[24px] bg-white/82 p-4">
              <p className="text-sm text-muted-foreground">Pipeline presupuesto</p>
              <p className="mt-2 font-display text-3xl text-foreground">
                {formatCurrency(summary.quotePipelineAmount)}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Importe vivo antes de facturar.
              </p>
            </div>
            <div className="rounded-[24px] bg-white/82 p-4">
              <p className="text-sm text-muted-foreground">Presupuestos</p>
              <p className="mt-2 font-display text-3xl text-foreground">{summary.quotes}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                En borrador, enviados o aceptados.
              </p>
            </div>
            <div className="rounded-[24px] bg-white/82 p-4">
              <p className="text-sm text-muted-foreground">Albaranes pendientes</p>
              <p className="mt-2 font-display text-3xl text-foreground">
                {summary.pendingDeliveryNotes}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Entregas aún no convertidas en factura.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {demoMode ? (
        <div className="status-banner">
          Estás viendo este módulo en modo demo. La interfaz y la conversión están
          visibles, pero el guardado real de documentos permanece desactivado.
        </div>
      ) : null}

      <Card className="border-white/60 bg-[color:rgba(251,247,241,0.82)]">
        <CardContent className="space-y-5 py-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">Seguimiento documental</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Filtra por tipo, estado o cliente para detectar rápido qué está listo para facturar.
              </p>
            </div>
            <div className="rounded-full bg-white/80 px-4 py-2 text-sm text-muted-foreground">
              {documents.length} resultados · {readyToInvoice.length} listos para factura
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href={buildCommercialHref({ q, type: "all", status })}>
              <Button variant={type === "all" ? "default" : "outline"} size="sm">
                Todos
              </Button>
            </Link>
            <Link href={buildCommercialHref({ q, type: "quote", status })}>
              <Button variant={type === "quote" ? "default" : "outline"} size="sm">
                Presupuestos
              </Button>
            </Link>
            <Link href={buildCommercialHref({ q, type: "delivery_note", status })}>
              <Button
                variant={type === "delivery_note" ? "default" : "outline"}
                size="sm"
              >
                Albaranes
              </Button>
            </Link>
            <Link href={buildCommercialHref({ q, type, status: "accepted" })}>
              <Button variant={status === "accepted" ? "default" : "outline"} size="sm">
                Aceptados
              </Button>
            </Link>
            <Link href={buildCommercialHref({ q, type, status: "sent" })}>
              <Button variant={status === "sent" ? "default" : "outline"} size="sm">
                Enviados
              </Button>
            </Link>
            <Link href={buildCommercialHref({ q, type, status: "delivered" })}>
              <Button variant={status === "delivered" ? "default" : "outline"} size="sm">
                Entregados
              </Button>
            </Link>
            <Link href={buildCommercialHref({ q, type, status: "converted" })}>
              <Button variant={status === "converted" ? "default" : "outline"} size="sm">
                Convertidos
              </Button>
            </Link>
          </div>

          <form action="/presupuestos" className="flex gap-3">
            <Input
              name="q"
              defaultValue={q}
              placeholder="Buscar por cliente, NIF o email..."
            />
            {type !== "all" ? <input type="hidden" name="type" value={type} /> : null}
            {status !== "all" ? <input type="hidden" name="status" value={status} /> : null}
            <Button type="submit" variant="outline">Buscar</Button>
          </form>
        </CardContent>
      </Card>

      <CommercialDocumentForm profile={profile} demoMode={demoMode} />

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="section-kicker">Presupuestos</p>
              <h2 className="font-display text-3xl text-foreground">
                Ofertas listas para seguimiento
              </h2>
            </div>
            <div className="rounded-full bg-[color:rgba(241,246,243,0.82)] px-4 py-2 text-sm text-muted-foreground">
              {quotes.length} activos
            </div>
          </div>

          {quotes.length > 0 ? (
            quotes.map((document) => (
              <DocumentCard key={document.id} document={document} demoMode={demoMode} />
            ))
          ) : (
            <Card className="border-dashed border-white/60 bg-white/74">
              <CardContent className="flex flex-col items-start gap-3 py-8">
                <FileText className="h-10 w-10 text-[color:var(--color-brand)]" />
                <div>
                  <p className="font-semibold text-foreground">Todavía no hay presupuestos.</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Crea el primero arriba y úsalo como paso previo antes de emitir la factura final.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="section-kicker">Albaranes</p>
              <h2 className="font-display text-3xl text-foreground">
                Entregas y trabajos realizados
              </h2>
            </div>
            <div className="rounded-full bg-[color:rgba(241,246,243,0.82)] px-4 py-2 text-sm text-muted-foreground">
              {deliveryNotes.length} registrados
            </div>
          </div>

          {deliveryNotes.length > 0 ? (
            deliveryNotes.map((document) => (
              <DocumentCard key={document.id} document={document} demoMode={demoMode} />
            ))
          ) : (
            <Card className="border-dashed border-white/60 bg-white/74">
              <CardContent className="flex flex-col items-start gap-3 py-8">
                <FileCheck2 className="h-10 w-10 text-[color:var(--color-brand)]" />
                <div>
                  <p className="font-semibold text-foreground">No hay albaranes todavía.</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Usa este bloque para dejar constancia de entregas antes de su facturación.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      <Card className="border-white/60 bg-[color:rgba(251,247,241,0.82)]">
        <CardContent className="flex flex-col gap-4 py-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-foreground">
              Primera entrega del módulo
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Esta fase ya cubre persistencia, estados y conversión a factura. La
              siguiente iteración añadirá PDF dedicado, firma/aceptación y enlace más
              directo con la cabina documental.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/documents-ai">
              <Button variant="outline">
                <ReceiptText className="h-4 w-4" />
                Abrir documentos IA
              </Button>
            </Link>
            <Link href="/invoices">
              <Button>
                Ver facturas emitidas
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
