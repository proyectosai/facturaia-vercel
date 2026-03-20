import Link from "next/link";
import {
  ArrowRight,
  CircleDashed,
  Landmark,
  Mail,
  ReceiptText,
  RotateCcw,
  Wallet,
} from "lucide-react";

import { requireUser } from "@/lib/auth";
import {
  getInvoiceAmountOutstanding,
  getInvoiceCollectionState,
  getInvoiceCollectionSummary,
  invoiceCollectionStateLabels,
} from "@/lib/collections";
import {
  sendInvoiceReminderAction,
  updateInvoicePaymentStateAction,
} from "@/lib/actions/invoices";
import { demoInvoices, isDemoMode } from "@/lib/demo";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { InvoiceCollectionState } from "@/lib/collections";
import type { InvoiceRecord } from "@/lib/types";
import {
  cn,
  formatCurrency,
  formatDateLong,
  formatDateShort,
  formatInvoiceNumber,
} from "@/lib/utils";
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
import { Label } from "@/components/ui/label";

type CollectionFilter = "all" | InvoiceCollectionState;

function getSingleSearchParam(value: string | string[] | undefined, fallback = "") {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }

  return value ?? fallback;
}

function buildCollectionsHref({
  q,
  state,
}: {
  q?: string;
  state?: CollectionFilter;
}) {
  const params = new URLSearchParams();

  if (q?.trim()) {
    params.set("q", q.trim());
  }

  if (state && state !== "all") {
    params.set("state", state);
  }

  const query = params.toString();
  return query ? `/cobros?${query}` : "/cobros";
}

function getCollectionTone(state: InvoiceCollectionState) {
  return {
    pending: "bg-[color:rgba(202,145,34,0.14)] text-[color:#8b5b00]",
    partial: "bg-[color:rgba(16,115,112,0.14)] text-[color:#0f5f63]",
    paid: "bg-[color:rgba(47,125,50,0.12)] text-[color:var(--color-success)]",
    overdue: "bg-[color:rgba(180,68,54,0.14)] text-[color:#8f2f2f]",
  }[state];
}

function getCollectionCardBorder(state: InvoiceCollectionState) {
  return {
    pending: "border-white/60",
    partial: "border-[color:rgba(16,115,112,0.22)]",
    paid: "border-[color:rgba(47,125,50,0.2)]",
    overdue: "border-[color:rgba(180,68,54,0.22)]",
  }[state];
}

function matchesCollectionQuery(invoice: InvoiceRecord, query: string) {
  if (!query) {
    return true;
  }

  const normalized = query.trim().toLowerCase();
  const invoiceLabel = formatInvoiceNumber(invoice.invoice_number).toLowerCase();
  const numericMatch =
    !Number.isNaN(Number(normalized)) && invoice.invoice_number === Number(normalized);
  const haystack = [
    invoice.client_name,
    invoice.client_email,
    invoice.client_nif,
    invoice.collection_notes,
    invoiceLabel,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return numericMatch || haystack.includes(normalized);
}

export default async function CobrosPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
    state?: string | string[];
    updated?: string | string[];
    reminded?: string | string[];
    error?: string | string[];
  }>;
}) {
  const user = await requireUser();
  const demoMode = isDemoMode();
  const params = await searchParams;
  const q = getSingleSearchParam(params.q);
  const state = getSingleSearchParam(params.state, "all");
  const updated = getSingleSearchParam(params.updated);
  const reminded = getSingleSearchParam(params.reminded);
  const error = getSingleSearchParam(params.error);
  const supabase = demoMode ? null : await createServerSupabaseClient();
  const collectionFilter: CollectionFilter =
    state === "pending" ||
    state === "partial" ||
    state === "paid" ||
    state === "overdue"
      ? state
      : "all";

  const typedInvoices = demoMode
    ? [...demoInvoices]
    : (((await supabase!
        .from("invoices")
        .select("*")
        .eq("user_id", user.id)
        .order("due_date", { ascending: true })).data as InvoiceRecord[] | null) ?? []);
  const sortedInvoices = [...typedInvoices].sort((left, right) => {
    const leftState = getInvoiceCollectionState(left);
    const rightState = getInvoiceCollectionState(right);
    const priority = {
      overdue: 0,
      partial: 1,
      pending: 2,
      paid: 3,
    };
    const stateDifference = priority[leftState] - priority[rightState];

    if (stateDifference !== 0) {
      return stateDifference;
    }

    return left.due_date.localeCompare(right.due_date);
  });
  const filteredInvoices = sortedInvoices.filter((invoice) => {
    const matchesQuery = matchesCollectionQuery(invoice, q);

    if (!matchesQuery) {
      return false;
    }

    if (collectionFilter === "all") {
      return true;
    }

    return getInvoiceCollectionState(invoice) === collectionFilter;
  });
  const summary = getInvoiceCollectionSummary(sortedInvoices);
  const quickFilters: Array<{ label: string; state: CollectionFilter }> = [
    { label: "Todo", state: "all" },
    { label: "Pendientes", state: "pending" },
    { label: "Parciales", state: "partial" },
    { label: "Vencidas", state: "overdue" },
    { label: "Cobradas", state: "paid" },
  ];

  return (
    <div className="space-y-8">
      <RouteToast
        type="success"
        message={updated ? "Estado de cobro actualizado correctamente." : null}
      />
      <RouteToast
        type="success"
        message={reminded ? "Recordatorio de cobro enviado correctamente." : null}
      />
      <RouteToast
        type="error"
        message={error ? decodeURIComponent(error) : null}
      />

      {demoMode ? (
        <div className="status-banner">
          Estás viendo el centro de cobros en modo demo local. Puedes revisar el flujo completo, pero los cambios manuales no se guardan.
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr] xl:items-end">
        <div className="max-w-4xl space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge>Seguimiento de cobros</Badge>
            <Badge variant="secondary">Operativa privada</Badge>
            {summary.overdue > 0 ? <Badge variant="secondary">Atención requerida</Badge> : null}
          </div>

          <div className="space-y-3">
            <p className="section-kicker">Cobros y vencimientos</p>
            <h1 className="font-display text-5xl leading-none tracking-tight text-foreground">
              Prioriza qué hay que cobrar hoy y cierra el seguimiento sin perder contexto.
            </h1>
            <p className="text-lg leading-8 text-muted-foreground">
              Este panel une vencimientos, pagos parciales y cobros cerrados.
              Úsalo junto con banca para conciliar movimientos o marca una factura
              como cobrada cuando el ingreso llegue por otra vía.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/banca">
                <Landmark className="h-4 w-4" />
                Ir a Banca
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/invoices">
                <ReceiptText className="h-4 w-4" />
                Ver facturas
              </Link>
            </Button>
          </div>
        </div>

        <Card className="overflow-hidden bg-[linear-gradient(150deg,rgba(255,255,255,0.95),rgba(238,247,244,0.88))]">
          <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[24px] bg-white/80 p-4">
              <p className="text-sm text-muted-foreground">Pendiente</p>
              <p className="mt-2 font-display text-4xl text-foreground">
                {formatCurrency(summary.amountPending)}
              </p>
            </div>
            <div className="rounded-[24px] bg-white/80 p-4">
              <p className="text-sm text-muted-foreground">Parciales</p>
              <p className="mt-2 font-display text-4xl text-foreground">
                {summary.partial}
              </p>
            </div>
            <div className="rounded-[24px] bg-white/80 p-4">
              <p className="text-sm text-muted-foreground">Vencidas</p>
              <p className="mt-2 font-display text-4xl text-foreground">
                {summary.overdue}
              </p>
            </div>
            <div className="rounded-[24px] bg-white/80 p-4">
              <p className="text-sm text-muted-foreground">Cobrado</p>
              <p className="mt-2 font-display text-4xl text-foreground">
                {formatCurrency(summary.amountCollected)}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Filtros y cola de trabajo</CardTitle>
          <CardDescription>
            Filtra por cliente, número de factura o estado de cobro para centrarte en el siguiente bloque operativo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <form className="grid gap-4 xl:grid-cols-[1.4fr_1fr_auto]">
            <div className="space-y-2">
              <Label htmlFor="q">Búsqueda</Label>
              <Input
                id="q"
                name="q"
                defaultValue={q}
                placeholder="Cliente, NIF, número o nota"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">Estado</Label>
              <select
                id="state"
                name="state"
                defaultValue={collectionFilter}
                className="flex h-11 w-full rounded-2xl border border-input bg-background px-4 text-sm shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <option value="all">Todo</option>
                <option value="pending">Pendientes</option>
                <option value="partial">Parciales</option>
                <option value="overdue">Vencidas</option>
                <option value="paid">Cobradas</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button className="w-full">Aplicar filtros</Button>
            </div>
          </form>

          <div className="flex flex-wrap gap-2">
            {quickFilters.map((item) => (
              <Button
                key={item.state}
                variant={collectionFilter === item.state ? "default" : "outline"}
                size="sm"
                asChild
              >
                <Link href={buildCollectionsHref({ q, state: item.state })}>
                  {item.label}
                </Link>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {filteredInvoices.length > 0 ? (
        <div className="grid gap-4">
          {filteredInvoices.map((invoice) => {
            const collectionState = getInvoiceCollectionState(invoice);
            const amountOutstanding = getInvoiceAmountOutstanding(invoice);

            return (
              <Card
                key={invoice.id}
                className={cn(
                  "overflow-hidden bg-white/90",
                  getCollectionCardBorder(collectionState),
                )}
              >
                <CardContent className="mt-0 space-y-5">
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge>{formatInvoiceNumber(invoice.invoice_number)}</Badge>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]",
                            getCollectionTone(collectionState),
                          )}
                        >
                          {invoiceCollectionStateLabels[collectionState]}
                        </span>
                        <Badge variant="secondary">
                          Emitida {formatDateShort(invoice.issue_date)}
                        </Badge>
                        <Badge variant="secondary">
                          Vence {formatDateShort(invoice.due_date)}
                        </Badge>
                      </div>

                      <div className="space-y-1">
                        <h2 className="text-2xl font-semibold text-foreground">
                          {invoice.client_name}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          {invoice.client_email} · {invoice.client_nif}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {invoice.collection_notes || "Sin nota interna de cobro."}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-[28px] bg-[color:var(--color-brand)] p-5 text-[color:var(--color-brand-foreground)] xl:min-w-[260px]">
                      <p className="text-sm uppercase tracking-[0.16em] opacity-80">
                        Situación económica
                      </p>
                      <p className="mt-3 font-display text-4xl">
                        {formatCurrency(Number(invoice.grand_total))}
                      </p>
                      <div className="mt-4 space-y-2 text-sm opacity-95">
                        <p>Cobrado: {formatCurrency(Number(invoice.amount_paid))}</p>
                        <p>Pendiente: {formatCurrency(amountOutstanding)}</p>
                        <p>
                          Recordatorios: {invoice.reminder_count}
                          {invoice.last_reminder_at
                            ? ` · último ${formatDateShort(invoice.last_reminder_at)}`
                            : ""}
                        </p>
                        <p>
                          {invoice.paid_at
                            ? `Último cierre ${formatDateLong(invoice.paid_at)}`
                            : "Todavía no consta como cobrada"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    <Button variant="outline" asChild>
                      <Link href="/invoices">
                        Abrir en historial
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="ghost" asChild>
                      <Link href="/clientes">
                        Ver cliente
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                    {collectionState !== "paid" ? (
                      <form action={demoMode ? undefined : sendInvoiceReminderAction}>
                        <input type="hidden" name="invoiceId" value={invoice.id} />
                        <SubmitButton
                          variant="outline"
                          pendingLabel="Enviando recordatorio..."
                          disabled={demoMode}
                        >
                          <Mail className="h-4 w-4" />
                          Enviar recordatorio
                        </SubmitButton>
                      </form>
                    ) : null}
                    <form action={demoMode ? undefined : updateInvoicePaymentStateAction}>
                      <input type="hidden" name="invoiceId" value={invoice.id} />
                      <input
                        type="hidden"
                        name="actionKind"
                        value={collectionState === "paid" ? "reopen" : "mark_paid"}
                      />
                      <SubmitButton
                        variant={collectionState === "paid" ? "outline" : "secondary"}
                        pendingLabel={
                          collectionState === "paid"
                            ? "Reabriendo..."
                            : "Marcando cobrada..."
                        }
                        disabled={demoMode}
                      >
                        {collectionState === "paid" ? (
                          <>
                            <RotateCcw className="h-4 w-4" />
                            Reabrir cobro
                          </>
                        ) : (
                          <>
                            <Wallet className="h-4 w-4" />
                            Marcar cobrada
                          </>
                        )}
                      </SubmitButton>
                    </form>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="space-y-5">
            <div className="max-w-2xl space-y-3">
              <p className="section-kicker">Sin resultados</p>
              <h2 className="font-display text-4xl text-foreground">
                No hay facturas en la cola de cobros para ese filtro.
              </h2>
              <p className="text-lg leading-8 text-muted-foreground">
                Ajusta la búsqueda o cambia de estado para revisar otro bloque del seguimiento.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/invoices">
                  <ReceiptText className="h-4 w-4" />
                  Volver a facturas
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/cobros">
                  <CircleDashed className="h-4 w-4" />
                  Limpiar filtro
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
