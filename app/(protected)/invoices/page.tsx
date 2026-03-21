import Link from "next/link";
import { CalendarRange, FilterX, Plus, Search } from "lucide-react";

import { requireUser } from "@/lib/auth";
import {
  getInvoiceAmountOutstanding,
  getInvoiceCollectionSummary,
  isInvoiceOverdue,
} from "@/lib/collections";
import { demoInvoices, isDemoMode, isLocalFileMode } from "@/lib/demo";
import { buildPublicInvoiceUrl } from "@/lib/invoice-files";
import { listLocalInvoicesForUser } from "@/lib/local-core";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { InvoiceMonthGroup, InvoiceRecord } from "@/lib/types";
import { formatCurrency, formatDateShort } from "@/lib/utils";
import { InvoicesCollection } from "@/components/invoices/invoices-collection";
import { RouteToast } from "@/components/route-toast";
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

function getIsoDateOffset(daysAgo: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

function getMonthStartIso() {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0),
  )
    .toISOString()
    .slice(0, 10);
}

function buildInvoicesHref({
  q,
  from,
  to,
}: {
  q?: string;
  from?: string;
  to?: string;
}) {
  const params = new URLSearchParams();

  if (q?.trim()) {
    params.set("q", q.trim());
  }

  if (from?.trim()) {
    params.set("from", from.trim());
  }

  if (to?.trim()) {
    params.set("to", to.trim());
  }

  const query = params.toString();
  return query ? `/invoices?${query}` : "/invoices";
}

function getRangeLabel(from: string, to: string) {
  if (from && to) {
    return `${formatDateShort(from)} - ${formatDateShort(to)}`;
  }

  if (from) {
    return `Desde ${formatDateShort(from)}`;
  }

  if (to) {
    return `Hasta ${formatDateShort(to)}`;
  }

  return "Todo el historial";
}

function groupInvoicesByMonth(invoices: InvoiceRecord[]): InvoiceMonthGroup[] {
  const formatter = new Intl.DateTimeFormat("es-ES", {
    month: "long",
    year: "numeric",
  });
  const groups = new Map<
    string,
    {
      label: string;
      total: number;
      items: InvoiceRecord[];
    }
  >();

  for (const invoice of invoices) {
    const date = new Date(invoice.issue_date);
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;

    if (!groups.has(key)) {
      groups.set(key, {
        label: formatter.format(date),
        total: 0,
        items: [],
      });
    }

    const group = groups.get(key)!;
    group.items.push(invoice);
    group.total += Number(invoice.grand_total);
  }

  return Array.from(groups.entries()).map(([key, value]) => ({
    key,
    label: value.label,
    total: value.total,
    items: value.items.map((invoice) => ({
      id: invoice.id,
      publicUrl: buildPublicInvoiceUrl(invoice.public_id),
      invoiceNumber: invoice.invoice_number,
      issueDate: invoice.issue_date,
      dueDate: invoice.due_date,
      clientName: invoice.client_name,
      clientNif: invoice.client_nif,
      clientAddress: invoice.client_address,
      clientEmail: invoice.client_email,
      grandTotal: Number(invoice.grand_total),
      amountPaid: Number(invoice.amount_paid),
      amountOutstanding: getInvoiceAmountOutstanding(invoice),
      paymentStatus: invoice.payment_status,
      paidAt: invoice.paid_at,
      isOverdue: isInvoiceOverdue(invoice),
      conceptsCount: invoice.line_items?.length ?? 0,
      isRecent:
        (Date.now() - new Date(invoice.issue_date).getTime()) /
          (1000 * 60 * 60 * 24) <=
        7,
    })),
  }));
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    from?: string;
    to?: string;
    created?: string;
    emailed?: string;
    error?: string;
  }>;
}) {
  const user = await requireUser();
  const demoMode = isDemoMode();
  const localFileMode = isLocalFileMode();
  const supabase = demoMode || localFileMode ? null : await createServerSupabaseClient();
  const { q = "", from = "", to = "", created, emailed, error } =
    await searchParams;

  let typedInvoices: InvoiceRecord[] = [];

  if (demoMode) {
    typedInvoices = [...demoInvoices];

    if (q) {
      const safeQuery = q.replaceAll(",", " ").trim().toLowerCase();
      typedInvoices = typedInvoices.filter((invoice) => {
        const matchesText =
          invoice.client_name.toLowerCase().includes(safeQuery) ||
          invoice.client_email.toLowerCase().includes(safeQuery) ||
          invoice.client_nif.toLowerCase().includes(safeQuery);
        const matchesNumber =
          !Number.isNaN(Number(safeQuery)) &&
          invoice.invoice_number === Number(safeQuery);

        return matchesText || matchesNumber;
      });
    }

    if (from) {
      typedInvoices = typedInvoices.filter((invoice) => invoice.issue_date >= from);
    }

    if (to) {
      typedInvoices = typedInvoices.filter((invoice) => invoice.issue_date <= to);
    }

    typedInvoices.sort((a, b) => b.issue_date.localeCompare(a.issue_date));
  } else if (localFileMode) {
    typedInvoices = await listLocalInvoicesForUser(user.id);

    if (q) {
      const safeQuery = q.replaceAll(",", " ").trim().toLowerCase();
      typedInvoices = typedInvoices.filter((invoice) => {
        const matchesText =
          invoice.client_name.toLowerCase().includes(safeQuery) ||
          invoice.client_email.toLowerCase().includes(safeQuery) ||
          invoice.client_nif.toLowerCase().includes(safeQuery);
        const matchesNumber =
          !Number.isNaN(Number(safeQuery)) &&
          invoice.invoice_number === Number(safeQuery);

        return matchesText || matchesNumber;
      });
    }

    if (from) {
      typedInvoices = typedInvoices.filter((invoice) => invoice.issue_date >= from);
    }

    if (to) {
      typedInvoices = typedInvoices.filter((invoice) => invoice.issue_date <= to);
    }
  } else {
    let query = supabase!
      .from("invoices")
      .select("*")
      .eq("user_id", user.id)
      .order("issue_date", { ascending: false });

    if (q) {
      const safeQuery = q.replaceAll(",", " ").trim();
      const filters = [
        `client_name.ilike.%${safeQuery}%`,
        `client_email.ilike.%${safeQuery}%`,
        `client_nif.ilike.%${safeQuery}%`,
      ];

      if (!Number.isNaN(Number(safeQuery))) {
        filters.push(`invoice_number.eq.${Number(safeQuery)}`);
      }

      query = query.or(filters.join(","));
    }

    if (from) {
      query = query.gte("issue_date", from);
    }

    if (to) {
      query = query.lte("issue_date", to);
    }

    const { data: invoices } = await query;
    typedInvoices = (invoices as InvoiceRecord[] | null) ?? [];
  }

  const filteredTotal = typedInvoices.reduce(
    (sum, invoice) => sum + Number(invoice.grand_total),
    0,
  );
  const collectionSummary = getInvoiceCollectionSummary(typedInvoices);
  const monthlyGroups = groupInvoicesByMonth(typedInvoices);
  const hasFilters = Boolean(q || from || to);
  const quickRanges = [
    {
      label: "Todo",
      href: buildInvoicesHref({ q }),
      active: !from && !to,
    },
    {
      label: "Este mes",
      href: buildInvoicesHref({
        q,
        from: getMonthStartIso(),
        to: new Date().toISOString().slice(0, 10),
      }),
      active:
        from === getMonthStartIso() &&
        to === new Date().toISOString().slice(0, 10),
    },
    {
      label: "30 días",
      href: buildInvoicesHref({
        q,
        from: getIsoDateOffset(30),
        to: new Date().toISOString().slice(0, 10),
      }),
      active:
        from === getIsoDateOffset(30) &&
        to === new Date().toISOString().slice(0, 10),
    },
    {
      label: "90 días",
      href: buildInvoicesHref({
        q,
        from: getIsoDateOffset(90),
        to: new Date().toISOString().slice(0, 10),
      }),
      active:
        from === getIsoDateOffset(90) &&
        to === new Date().toISOString().slice(0, 10),
    },
  ];

  return (
    <div className="space-y-8">
      {demoMode ? (
        <div className="status-banner">
          Estás navegando el historial en modo demo local. Puedes revisar tarjetas, abrir factura pública y descargar el PDF de ejemplo.
        </div>
      ) : null}

      <RouteToast
        type="success"
        message={
          created
            ? "Factura creada correctamente."
            : emailed
              ? "Email enviado correctamente."
              : null
        }
      />
      <RouteToast
        type="error"
        message={error ? decodeURIComponent(error) : null}
      />

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr] xl:items-end">
        <div className="max-w-3xl space-y-4">
          <p className="section-kicker">Mis facturas</p>
          <h1 className="font-display text-4xl leading-none tracking-tight text-foreground sm:text-5xl">
            Historial claro, acciones rápidas y control real sobre cada factura.
          </h1>
          <p className="text-lg leading-8 text-muted-foreground">
            Busca por cliente o factura, filtra por fechas y resuelve envío,
            descarga o copia de enlace público sin salir del listado.
          </p>

          <div className="grid gap-3 sm:flex sm:flex-wrap">
            <Button className="w-full sm:w-auto" asChild>
              <Link href="/new-invoice">
                <Plus className="h-4 w-4" />
                Nueva Factura
              </Link>
            </Button>
            {hasFilters ? (
              <Button className="w-full sm:w-auto" variant="outline" asChild>
                <Link href="/invoices">
                  <FilterX className="h-4 w-4" />
                  Limpiar filtros
                </Link>
              </Button>
            ) : null}
          </div>
        </div>

        <Card className="overflow-hidden bg-[linear-gradient(150deg,rgba(255,255,255,0.95),rgba(238,247,244,0.88))]">
          <CardContent className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <div className="rounded-[24px] bg-white/80 p-4">
              <p className="text-sm text-muted-foreground">Facturas visibles</p>
              <p className="mt-2 font-display text-3xl text-foreground sm:text-4xl">
                {typedInvoices.length}
              </p>
            </div>
            <div className="rounded-[24px] bg-white/80 p-4">
              <p className="text-sm text-muted-foreground">Importe filtrado</p>
              <p className="mt-2 font-display text-3xl text-foreground sm:text-4xl">
                {formatCurrency(filteredTotal)}
              </p>
            </div>
            <div className="rounded-[24px] bg-white/80 p-4">
              <p className="text-sm text-muted-foreground">Pendiente de cobro</p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {formatCurrency(collectionSummary.amountPending)}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {collectionSummary.pending + collectionSummary.partial} facturas abiertas
              </p>
            </div>
            <div className="rounded-[24px] bg-white/80 p-4">
              <p className="text-sm text-muted-foreground">Vencidas</p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {collectionSummary.overdue}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Periodo actual: {getRangeLabel(from, to)}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {created ? (
        <div className="status-banner">
          Factura creada correctamente. Ya puedes descargar su PDF o compartirla con el cliente.
        </div>
      ) : null}

      {emailed ? (
        <div className="status-banner">
          Email enviado correctamente al destinatario configurado en la factura.
        </div>
      ) : null}

      {error ? (
        <div className="status-banner error">{decodeURIComponent(error)}</div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Filtros y navegación rápida</CardTitle>
          <CardDescription>
            Busca por cliente, email, NIF o número de factura y muévete por rangos frecuentes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <form className="grid gap-4 xl:grid-cols-[1.5fr_1fr_1fr_auto]">
            <div className="space-y-2">
              <Label htmlFor="q">Búsqueda</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="q"
                  name="q"
                  defaultValue={q}
                  placeholder="Cliente, NIF o factura"
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="from">Desde</Label>
              <Input id="from" name="from" type="date" defaultValue={from} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="to">Hasta</Label>
              <Input id="to" name="to" type="date" defaultValue={to} />
            </div>
            <div className="flex items-end">
              <Button className="w-full">Aplicar filtros</Button>
            </div>
          </form>

          <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
            {quickRanges.map((range) => (
              <Button
                key={range.label}
                variant={range.active ? "default" : "outline"}
                size="sm"
                className="shrink-0"
                asChild
              >
                <Link href={range.href}>
                  <CalendarRange className="h-4 w-4" />
                  {range.label}
                </Link>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {typedInvoices.length ? (
        <InvoicesCollection groups={monthlyGroups} demoMode={demoMode} />
      ) : (
        <Card className="overflow-hidden bg-[linear-gradient(150deg,rgba(255,255,255,0.94),rgba(238,247,244,0.88))]">
          <CardContent className="mt-0 space-y-5">
            <div className="max-w-2xl space-y-3">
              <p className="section-kicker">Sin resultados</p>
              <h2 className="font-display text-3xl text-foreground sm:text-4xl">
                No hay facturas que encajen con los filtros actuales.
              </h2>
              <p className="text-lg leading-8 text-muted-foreground">
                Prueba otra búsqueda o limpia el rango de fechas para volver a
                ver todo tu historial.
              </p>
            </div>

            <div className="grid gap-3 sm:flex sm:flex-wrap">
              <Button className="w-full sm:w-auto" asChild>
                <Link href="/new-invoice">
                  <Plus className="h-4 w-4" />
                  Crear nueva factura
                </Link>
              </Button>
              {hasFilters ? (
                <Button className="w-full sm:w-auto" variant="outline" asChild>
                  <Link href="/invoices">Quitar filtros</Link>
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
