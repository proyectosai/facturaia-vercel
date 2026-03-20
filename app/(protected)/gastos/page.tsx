import Link from "next/link";
import { FileSearch, Receipt, ScanSearch, Wallet } from "lucide-react";

import { requireUser } from "@/lib/auth";
import { createExpenseAction, markExpenseReviewedAction } from "@/lib/actions/expenses";
import { isDemoMode } from "@/lib/demo";
import {
  expenseExtractionLabels,
  expenseKindLabels,
  expenseReviewStatusLabels,
  getExpensesForUser,
  getExpensesOcrSupport,
  getExpensesSummary,
} from "@/lib/expenses";
import type { ExpenseRecord, ExpenseReviewStatus } from "@/lib/types";
import { cn, formatCurrency, formatDateLong, toNumber } from "@/lib/utils";
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
import { Textarea } from "@/components/ui/textarea";

function getSingleSearchParam(
  value: string | string[] | undefined,
  fallback = "",
) {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }

  return value ?? fallback;
}

function buildExpenseHref({
  q,
  review,
  kind,
}: {
  q?: string;
  review?: string;
  kind?: string;
}) {
  const params = new URLSearchParams();

  if (q?.trim()) {
    params.set("q", q.trim());
  }

  if (review && review !== "all") {
    params.set("review", review);
  }

  if (kind && kind !== "all") {
    params.set("kind", kind);
  }

  const query = params.toString();
  return query ? `/gastos?${query}` : "/gastos";
}

function getReviewTone(reviewStatus: ExpenseReviewStatus) {
  return {
    draft: "bg-[color:rgba(202,145,34,0.14)] text-[color:#8b5b00]",
    reviewed: "bg-[color:rgba(47,125,50,0.12)] text-[color:var(--color-success)]",
  }[reviewStatus];
}

function ExpenseCard({
  expense,
  demoMode,
}: {
  expense: ExpenseRecord;
  demoMode: boolean;
}) {
  return (
    <Card className="overflow-hidden border-white/60 bg-white/86">
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Badge>{expenseKindLabels[expense.expense_kind]}</Badge>
              <div
                className={cn(
                  "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]",
                  getReviewTone(expense.review_status),
                )}
              >
                {expenseReviewStatusLabels[expense.review_status]}
              </div>
            </div>
            <CardTitle className="text-2xl">
              {expense.vendor_name ?? "Proveedor pendiente de revisar"}
            </CardTitle>
            <CardDescription>
              {expense.source_file_name ?? "Sin archivo"} ·{" "}
              {expense.expense_date ? formatDateLong(expense.expense_date) : "Fecha pendiente"}
            </CardDescription>
          </div>

          <div className="rounded-[24px] bg-[color:rgba(241,246,243,0.82)] px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Total
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {expense.total_amount !== null ? formatCurrency(toNumber(expense.total_amount)) : "Pendiente"}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-[24px] bg-[color:rgba(251,247,241,0.72)] p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">NIF</p>
            <p className="mt-2 text-sm font-medium text-foreground">
              {expense.vendor_nif ?? "Pendiente"}
            </p>
          </div>
          <div className="rounded-[24px] bg-[color:rgba(251,247,241,0.72)] p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Base</p>
            <p className="mt-2 text-sm font-medium text-foreground">
              {expense.base_amount !== null ? formatCurrency(toNumber(expense.base_amount)) : "Pendiente"}
            </p>
          </div>
          <div className="rounded-[24px] bg-[color:rgba(251,247,241,0.72)] p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">IVA</p>
            <p className="mt-2 text-sm font-medium text-foreground">
              {expense.vat_amount !== null ? formatCurrency(toNumber(expense.vat_amount)) : "Pendiente"}
            </p>
          </div>
          <div className="rounded-[24px] bg-[color:rgba(251,247,241,0.72)] p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Extracción
            </p>
            <p className="mt-2 text-sm font-medium text-foreground">
              {expenseExtractionLabels[expense.text_extraction_method]}
            </p>
          </div>
        </div>

        <div className="rounded-[28px] bg-[color:rgba(241,246,243,0.82)] p-5">
          <p className="text-sm font-medium text-foreground">
            {expense.review_status === "draft"
              ? "Revisa este gasto antes de darlo por válido en tu contabilidad."
              : "Este gasto ya ha pasado por una revisión manual dentro de la app."}
          </p>
          {expense.notes ? (
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{expense.notes}</p>
          ) : null}
          {expense.raw_text ? (
            <pre className="mt-3 max-h-44 overflow-auto rounded-2xl bg-white/80 p-4 text-xs leading-6 text-muted-foreground">
              {expense.raw_text}
            </pre>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              No se ha podido extraer texto automáticamente de este justificante.
            </p>
          )}
        </div>

        <form action={demoMode ? undefined : markExpenseReviewedAction}>
          <input type="hidden" name="expenseId" value={expense.id} />
          <SubmitButton
            variant="outline"
            pendingLabel="Actualizando..."
            disabled={demoMode}
          >
            {expense.review_status === "draft" ? "Marcar como revisado" : "Volver a pendiente"}
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}

export default async function GastosPage({
  searchParams,
}: {
  searchParams: Promise<{
    created?: string | string[];
    updated?: string | string[];
    error?: string | string[];
    q?: string | string[];
    review?: string | string[];
    kind?: string | string[];
  }>;
}) {
  const user = await requireUser();
  const demoMode = isDemoMode();
  const params = await searchParams;
  const q = getSingleSearchParam(params.q);
  const review = getSingleSearchParam(params.review, "all");
  const kind = getSingleSearchParam(params.kind, "all");
  const created = getSingleSearchParam(params.created);
  const updated = getSingleSearchParam(params.updated);
  const error = getSingleSearchParam(params.error);
  const expenses = await getExpensesForUser(user.id, {
    query: q,
    reviewStatus:
      review === "draft" || review === "reviewed" ? review : "all",
    expenseKind:
      kind === "ticket" || kind === "supplier_invoice" ? kind : "all",
  });
  const summary = getExpensesSummary(expenses);
  const ocrSupport = getExpensesOcrSupport();

  return (
    <div className="space-y-8">
      <RouteToast
        type="success"
        message={created ? "Gasto importado correctamente." : null}
      />
      <RouteToast
        type="success"
        message={updated ? "Estado del gasto actualizado." : null}
      />
      <RouteToast type="error" message={error || null} />

      <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr] xl:items-end">
        <div className="max-w-4xl space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge>OCR de gastos</Badge>
            <Badge variant="secondary">Primera entrega</Badge>
            {demoMode ? <Badge variant="secondary">Modo demo</Badge> : null}
          </div>

          <div className="space-y-3">
            <p className="section-kicker">Justificantes y revisión</p>
            <h1 className="font-display text-5xl leading-none tracking-tight text-foreground">
              Importa tickets y facturas de proveedor sin salir de tu instalación privada.
            </h1>
            <p className="text-lg leading-8 text-muted-foreground">
              Esta primera fase del módulo no pretende cerrar la contabilidad por ti:
              importa justificantes, extrae texto cuando puede y te propone datos para
              que los revises antes de dar el gasto por bueno.
            </p>
          </div>
        </div>

        <Card className="overflow-hidden bg-[linear-gradient(150deg,rgba(255,255,255,0.95),rgba(232,246,242,0.9))]">
          <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[24px] bg-white/82 p-4">
              <p className="text-sm text-muted-foreground">Gastos</p>
              <p className="mt-2 font-display text-3xl text-foreground">{summary.total}</p>
              <p className="mt-2 text-sm text-muted-foreground">Histórico importado.</p>
            </div>
            <div className="rounded-[24px] bg-white/82 p-4">
              <p className="text-sm text-muted-foreground">Pendientes</p>
              <p className="mt-2 font-display text-3xl text-foreground">{summary.draft}</p>
              <p className="mt-2 text-sm text-muted-foreground">Requieren revisión humana.</p>
            </div>
            <div className="rounded-[24px] bg-white/82 p-4">
              <p className="text-sm text-muted-foreground">Importe total</p>
              <p className="mt-2 font-display text-3xl text-foreground">
                {formatCurrency(summary.totalAmount)}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">Suma del histórico visible.</p>
            </div>
            <div className="rounded-[24px] bg-white/82 p-4">
              <p className="text-sm text-muted-foreground">Motor de parseo</p>
              <p className="mt-2 font-display text-3xl text-foreground">
                {ocrSupport.providerLabel}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                PDF con texto: sí · imagen automática: no aún.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {demoMode ? (
        <div className="status-banner">
          Estás viendo este módulo en modo demo. El circuito visual está disponible, pero la
          subida y el guardado real de justificantes siguen desactivados.
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <Card className="border-white/60 bg-white/88">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[color:var(--color-brand-soft)] p-3 text-[color:var(--color-brand)]">
                <ScanSearch className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Importar un justificante</CardTitle>
                <CardDescription>
                  Sube un PDF, ticket o archivo de texto. Si tu sistema ya te deja copiar el OCR, pégalo para mejorar el resultado.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form action={demoMode ? undefined : createExpenseAction} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="expenseKind">Tipo de justificante</Label>
                  <select
                    id="expenseKind"
                    name="expenseKind"
                    defaultValue="ticket"
                    className="flex h-11 w-full rounded-2xl border border-border/60 bg-background px-4 text-sm"
                  >
                    <option value="ticket">Ticket</option>
                    <option value="supplier_invoice">Factura proveedor</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sourceFile">Archivo</Label>
                  <Input
                    id="sourceFile"
                    name="sourceFile"
                    type="file"
                    accept=".pdf,.txt,image/png,image/jpeg,image/webp"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="manualText">Texto OCR opcional</Label>
                <Textarea
                  id="manualText"
                  name="manualText"
                  placeholder="Pega aquí el texto OCR si tu sistema operativo o escáner ya te lo ha dado."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notas internas</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Ejemplo: gasto de material para cliente X, pendiente de revisión fiscal."
                />
              </div>

              {demoMode ? (
                <Button type="button" disabled className="w-full">
                  Importación real desactivada en demo
                </Button>
              ) : (
                <SubmitButton className="w-full" pendingLabel="Importando gasto...">
                  <Wallet className="h-4 w-4" />
                  Importar gasto
                </SubmitButton>
              )}
            </form>
          </CardContent>
        </Card>

        <Card className="border-white/60 bg-[color:rgba(251,247,241,0.82)]">
          <CardHeader>
            <CardTitle>Qué cubre esta primera entrega</CardTitle>
            <CardDescription>
              El objetivo es ser útil ya, sin fingir un OCR total que todavía no existe.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[26px] bg-white/82 p-5">
              <div className="flex items-center gap-3">
                <FileSearch className="h-5 w-5 text-[color:var(--color-brand)]" />
                <p className="font-semibold text-foreground">Soportado ahora</p>
              </div>
              <ul className="mt-4 space-y-2 text-sm leading-6 text-muted-foreground">
                <li>PDF con texto incrustado</li>
                <li>Archivos de texto</li>
                <li>Pegado manual de texto OCR</li>
                <li>Parseo local con IA o heurística</li>
              </ul>
            </div>

            <div className="rounded-[26px] bg-white/82 p-5">
              <div className="flex items-center gap-3">
                <Receipt className="h-5 w-5 text-[color:var(--color-brand)]" />
                <p className="font-semibold text-foreground">Siguiente fase</p>
              </div>
              <ul className="mt-4 space-y-2 text-sm leading-6 text-muted-foreground">
                <li>OCR automático de imágenes</li>
                <li>Previsualización del archivo subido</li>
                <li>Categorías y exportación de gastos</li>
                <li>Enlace con conciliación bancaria</li>
              </ul>
            </div>

            <div className="rounded-[26px] bg-white/82 p-5 md:col-span-2">
              <p className="font-semibold text-foreground">Filtros rápidos</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={buildExpenseHref({ q, review: "all", kind })}>
                  <Button variant={review === "all" ? "default" : "outline"} size="sm">
                    Todos
                  </Button>
                </Link>
                <Link href={buildExpenseHref({ q, review: "draft", kind })}>
                  <Button variant={review === "draft" ? "default" : "outline"} size="sm">
                    Pendientes
                  </Button>
                </Link>
                <Link href={buildExpenseHref({ q, review: "reviewed", kind })}>
                  <Button variant={review === "reviewed" ? "default" : "outline"} size="sm">
                    Revisados
                  </Button>
                </Link>
                <Link href={buildExpenseHref({ q, review, kind: "ticket" })}>
                  <Button variant={kind === "ticket" ? "default" : "outline"} size="sm">
                    Tickets
                  </Button>
                </Link>
                <Link href={buildExpenseHref({ q, review, kind: "supplier_invoice" })}>
                  <Button
                    variant={kind === "supplier_invoice" ? "default" : "outline"}
                    size="sm"
                  >
                    Facturas proveedor
                  </Button>
                </Link>
              </div>

              <form action="/gastos" className="mt-4 flex gap-3">
                <Input
                  name="q"
                  defaultValue={q}
                  placeholder="Buscar por proveedor, NIF o archivo..."
                />
                {review !== "all" ? <input type="hidden" name="review" value={review} /> : null}
                {kind !== "all" ? <input type="hidden" name="kind" value={kind} /> : null}
                <Button type="submit" variant="outline">Buscar</Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="section-kicker">Histórico</p>
            <h2 className="font-display text-3xl text-foreground">
              Gastos importados y pendientes de revisión
            </h2>
          </div>
          <div className="rounded-full bg-[color:rgba(241,246,243,0.82)] px-4 py-2 text-sm text-muted-foreground">
            Este mes: {formatCurrency(summary.thisMonthAmount)}
          </div>
        </div>

        {expenses.length > 0 ? (
          expenses.map((expense) => (
            <ExpenseCard key={expense.id} expense={expense} demoMode={demoMode} />
          ))
        ) : (
          <Card className="border-dashed border-white/60 bg-white/74">
            <CardContent className="flex flex-col items-start gap-3 py-8">
              <Wallet className="h-10 w-10 text-[color:var(--color-brand)]" />
              <div>
                <p className="font-semibold text-foreground">Todavía no hay gastos importados.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Empieza subiendo un ticket o una factura de proveedor para validar el circuito.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
