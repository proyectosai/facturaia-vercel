import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BadgeCheck,
  Ban,
  Landmark,
  ReceiptText,
  RotateCcw,
  ShieldAlert,
  Upload,
  Wallet,
} from "lucide-react";

import {
  bankMovementDirectionLabels,
  bankMovementStatusLabels,
  getBankMatchSuggestionsForMovement,
  getBankMatchingDataForUser,
  getBankMovementSummary,
  getBankMovementsForUser,
} from "@/lib/banking";
import {
  importBankMovementsAction,
  reconcileBankMovementAction,
} from "@/lib/actions/banking";
import { requireUser } from "@/lib/auth";
import { isDemoMode } from "@/lib/demo";
import type {
  BankMovementDirection,
  BankMovementRecord,
  BankMovementStatus,
  ExpenseRecord,
  InvoiceRecord,
} from "@/lib/types";
import {
  cn,
  formatCurrency,
  formatDateLong,
  formatDateShort,
  formatInvoiceNumber,
  toNumber,
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

function getSingleSearchParam(value: string | string[] | undefined, fallback = "") {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }

  return value ?? fallback;
}

function buildBankHref({
  q,
  status,
  direction,
}: {
  q?: string;
  status?: string;
  direction?: string;
}) {
  const params = new URLSearchParams();

  if (q?.trim()) {
    params.set("q", q.trim());
  }

  if (status && status !== "all") {
    params.set("status", status);
  }

  if (direction && direction !== "all") {
    params.set("direction", direction);
  }

  const query = params.toString();
  return query ? `/banca?${query}` : "/banca";
}

function getStatusTone(status: BankMovementStatus) {
  return {
    pending: "bg-[color:rgba(202,145,34,0.14)] text-[color:#8b5b00]",
    reconciled: "bg-[color:rgba(47,125,50,0.12)] text-[color:var(--color-success)]",
    ignored: "bg-[color:rgba(87,103,109,0.12)] text-[color:var(--color-ink-muted)]",
  }[status];
}

function getDirectionTone(direction: BankMovementDirection) {
  return {
    credit: "bg-[color:rgba(47,125,50,0.12)] text-[color:var(--color-success)]",
    debit: "bg-[color:rgba(179,62,60,0.12)] text-[color:#9f2d2b]",
  }[direction];
}

function getLinkedItemLabel({
  movement,
  invoicesById,
  expensesById,
}: {
  movement: BankMovementRecord;
  invoicesById: Map<string, InvoiceRecord>;
  expensesById: Map<string, ExpenseRecord>;
}) {
  if (movement.matched_invoice_id) {
    const invoice = invoicesById.get(movement.matched_invoice_id);

    if (!invoice) {
      return {
        title: "Factura enlazada",
        detail: "La factura vinculada ya no está disponible en la colección actual.",
        href: "/invoices",
      };
    }

    return {
      title: `Factura ${formatInvoiceNumber(invoice.invoice_number)}`,
      detail: `${invoice.client_name} · ${formatCurrency(toNumber(invoice.grand_total))}`,
      href: "/invoices",
    };
  }

  if (movement.matched_expense_id) {
    const expense = expensesById.get(movement.matched_expense_id);

    if (!expense) {
      return {
        title: "Gasto enlazado",
        detail: "El gasto vinculado ya no está disponible en la colección actual.",
        href: "/gastos",
      };
    }

    return {
      title: expense.vendor_name ?? "Gasto sin proveedor",
      detail: `${expense.source_file_name ?? "Justificante"} · ${formatCurrency(
        expense.total_amount === null ? 0 : toNumber(expense.total_amount),
      )}`,
      href: "/gastos",
    };
  }

  return null;
}

function ReconcileButton({
  movementId,
  actionKind,
  targetId,
  children,
  pendingLabel,
  disabled,
}: {
  movementId: string;
  actionKind: "match_invoice" | "match_expense" | "ignore" | "clear";
  targetId?: string;
  children: React.ReactNode;
  pendingLabel: string;
  disabled?: boolean;
}) {
  return (
    <form action={disabled ? undefined : reconcileBankMovementAction}>
      <input type="hidden" name="movementId" value={movementId} />
      <input type="hidden" name="actionKind" value={actionKind} />
      {targetId ? <input type="hidden" name="targetId" value={targetId} /> : null}
      <SubmitButton
        variant="outline"
        pendingLabel={pendingLabel}
        className="w-full justify-center"
        disabled={disabled}
      >
        {children}
      </SubmitButton>
    </form>
  );
}

function MovementCard({
  movement,
  invoicesById,
  expensesById,
  demoMode,
  suggestions,
}: {
  movement: BankMovementRecord;
  invoicesById: Map<string, InvoiceRecord>;
  expensesById: Map<string, ExpenseRecord>;
  demoMode: boolean;
  suggestions: ReturnType<typeof getBankMatchSuggestionsForMovement>;
}) {
  const linked = getLinkedItemLabel({
    movement,
    invoicesById,
    expensesById,
  });
  const amount = Math.abs(toNumber(movement.amount));

  return (
    <Card className="overflow-hidden border-white/60 bg-white/88">
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <div
                className={cn(
                  "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]",
                  getStatusTone(movement.status),
                )}
              >
                {bankMovementStatusLabels[movement.status]}
              </div>
              <div
                className={cn(
                  "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]",
                  getDirectionTone(movement.direction),
                )}
              >
                {bankMovementDirectionLabels[movement.direction]}
              </div>
              <Badge variant="secondary">{movement.account_label}</Badge>
            </div>
            <div>
              <CardTitle className="text-2xl">{movement.description}</CardTitle>
              <CardDescription className="mt-2">
                {movement.counterparty_name ?? "Contraparte no detectada"} ·{" "}
                {formatDateLong(movement.booking_date)}
                {movement.value_date ? ` · valor ${formatDateShort(movement.value_date)}` : ""}
              </CardDescription>
            </div>
          </div>

          <div className="rounded-[24px] bg-[color:rgba(241,246,243,0.82)] px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Importe
            </p>
            <p
              className={cn(
                "mt-2 text-2xl font-semibold",
                movement.direction === "credit" ? "text-[color:var(--color-success)]" : "text-foreground",
              )}
            >
              {movement.direction === "credit" ? "+" : "-"}
              {formatCurrency(amount)}
            </p>
            {movement.balance !== null ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Saldo: {formatCurrency(toNumber(movement.balance))}
              </p>
            ) : null}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-[24px] bg-[color:rgba(251,247,241,0.72)] p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Archivo</p>
            <p className="mt-2 text-sm font-medium text-foreground">
              {movement.source_file_name ?? "Importación manual"}
            </p>
          </div>
          <div className="rounded-[24px] bg-[color:rgba(251,247,241,0.72)] p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Importado</p>
            <p className="mt-2 text-sm font-medium text-foreground">
              {formatDateShort(movement.imported_at)}
            </p>
          </div>
          <div className="rounded-[24px] bg-[color:rgba(251,247,241,0.72)] p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Moneda</p>
            <p className="mt-2 text-sm font-medium text-foreground">{movement.currency}</p>
          </div>
          <div className="rounded-[24px] bg-[color:rgba(251,247,241,0.72)] p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Estado</p>
            <p className="mt-2 text-sm font-medium text-foreground">
              {movement.status === "pending"
                ? "Sin confirmar todavía"
                : movement.status === "reconciled"
                  ? "Vinculado manualmente"
                  : "Fuera del circuito principal"}
            </p>
          </div>
        </div>

        {linked ? (
          <div className="rounded-[28px] bg-[color:rgba(232,246,242,0.74)] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{linked.title}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{linked.detail}</p>
                {movement.notes ? (
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Nota: {movement.notes}
                  </p>
                ) : null}
              </div>
              <Button variant="outline" asChild>
                <Link href={linked.href}>Abrir módulo relacionado</Link>
              </Button>
            </div>
          </div>
        ) : null}

        {movement.status === "pending" ? (
          <div className="rounded-[28px] bg-[color:rgba(19,45,52,0.04)] p-5">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-1 h-5 w-5 text-[color:var(--color-brand)]" />
              <div className="flex-1">
                <p className="font-semibold text-foreground">
                  Propuestas de conciliación para este movimiento
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  La app cruza importe, fecha y nombre de contraparte con tus facturas o gastos
                  importados. Esta primera entrega no marca cobros automáticamente: siempre
                  confirmas tú el vínculo final.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              {suggestions.length > 0 ? (
                suggestions.map((candidate) => (
                  <div
                    key={`${movement.id}-${candidate.kind}-${candidate.id}`}
                    className="rounded-[24px] bg-white/86 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <Badge>{candidate.kind === "invoice" ? "Factura" : "Gasto"}</Badge>
                          <Badge variant="secondary">Coincidencia {candidate.score}</Badge>
                        </div>
                        <p className="mt-3 text-base font-semibold text-foreground">
                          {candidate.label}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          {candidate.detail} · {formatCurrency(candidate.amount)}
                        </p>
                      </div>
                      <ReconcileButton
                        movementId={movement.id}
                        actionKind={
                          candidate.kind === "invoice" ? "match_invoice" : "match_expense"
                        }
                        targetId={candidate.id}
                        pendingLabel="Conciliando..."
                        disabled={demoMode}
                      >
                        {candidate.kind === "invoice" ? (
                          <>
                            <ReceiptText className="h-4 w-4" />
                            Conciliar con factura
                          </>
                        ) : (
                          <>
                            <Wallet className="h-4 w-4" />
                            Conciliar con gasto
                          </>
                        )}
                      </ReconcileButton>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[24px] bg-white/86 p-4 text-sm leading-6 text-muted-foreground">
                  No hay coincidencias con suficiente confianza todavía. Puedes dejarlo pendiente
                  o ignorarlo si es un movimiento interno que no quieres revisar dentro de FacturaIA.
                </div>
              )}
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          {movement.status !== "ignored" ? (
            <ReconcileButton
              movementId={movement.id}
              actionKind="ignore"
              pendingLabel="Ignorando..."
              disabled={demoMode}
            >
              <Ban className="h-4 w-4" />
              Ignorar movimiento
            </ReconcileButton>
          ) : null}

          {movement.status !== "pending" ? (
            <ReconcileButton
              movementId={movement.id}
              actionKind="clear"
              pendingLabel="Restableciendo..."
              disabled={demoMode}
            >
              <RotateCcw className="h-4 w-4" />
              Volver a pendiente
            </ReconcileButton>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export default async function BancaPage({
  searchParams,
}: {
  searchParams: Promise<{
    created?: string | string[];
    updated?: string | string[];
    error?: string | string[];
    q?: string | string[];
    status?: string | string[];
    direction?: string | string[];
  }>;
}) {
  const user = await requireUser();
  const demoMode = isDemoMode();
  const params = await searchParams;
  const q = getSingleSearchParam(params.q);
  const status = getSingleSearchParam(params.status, "all");
  const direction = getSingleSearchParam(params.direction, "all");
  const created = getSingleSearchParam(params.created);
  const updated = getSingleSearchParam(params.updated);
  const error = getSingleSearchParam(params.error);

  const [movements, matchingData] = await Promise.all([
    getBankMovementsForUser(user.id, {
      query: q,
      status:
        status === "pending" || status === "reconciled" || status === "ignored"
          ? status
          : "all",
      direction: direction === "credit" || direction === "debit" ? direction : "all",
    }),
    getBankMatchingDataForUser(user.id),
  ]);

  const summary = getBankMovementSummary(movements);
  const invoicesById = new Map(matchingData.invoices.map((invoice) => [invoice.id, invoice]));
  const expensesById = new Map(matchingData.expenses.map((expense) => [expense.id, expense]));

  return (
    <div className="space-y-8">
      <RouteToast
        type="success"
        message={
          created ? `Extracto importado correctamente. ${created} movimientos nuevos.` : null
        }
      />
      <RouteToast
        type="success"
        message={updated ? "Movimiento bancario actualizado." : null}
      />
      <RouteToast type="error" message={error || null} />

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr] xl:items-end">
        <div className="max-w-4xl space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge>Conciliación bancaria</Badge>
            <Badge variant="secondary">CSV</Badge>
            {demoMode ? <Badge variant="secondary">Modo demo</Badge> : null}
          </div>

          <div className="space-y-3">
            <p className="section-kicker">Banca y caja</p>
            <h1 className="font-display text-5xl leading-none tracking-tight text-foreground">
              Importa extractos CSV y cruza cada movimiento con tus facturas o gastos.
            </h1>
            <p className="text-lg leading-8 text-muted-foreground">
              Esta primera entrega prioriza claridad y control manual: detecta sugerencias por
              importe, fecha y contraparte, pero no cambia estados de cobro fuera de tu revisión.
            </p>
          </div>
        </div>

        <Card className="overflow-hidden bg-[linear-gradient(150deg,rgba(255,255,255,0.95),rgba(232,246,242,0.88))]">
          <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-[24px] bg-white/82 p-4">
              <p className="text-sm text-muted-foreground">Movimientos</p>
              <p className="mt-2 font-display text-3xl text-foreground">{summary.total}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {summary.accounts} cuentas detectadas en esta vista.
              </p>
            </div>
            <div className="rounded-[24px] bg-white/82 p-4">
              <p className="text-sm text-muted-foreground">Pendientes</p>
              <p className="mt-2 font-display text-3xl text-foreground">{summary.pending}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Requieren decisión manual o pueden ignorarse.
              </p>
            </div>
            <div className="rounded-[24px] bg-white/82 p-4">
              <p className="text-sm text-muted-foreground">Conciliados</p>
              <p className="mt-2 font-display text-3xl text-foreground">{summary.reconciled}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Vínculos ya confirmados con facturas o gastos.
              </p>
            </div>
            <div className="rounded-[24px] bg-white/82 p-4">
              <p className="text-sm text-muted-foreground">Ingresos</p>
              <p className="mt-2 font-display text-3xl text-[color:var(--color-success)]">
                {formatCurrency(summary.incomingTotal)}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">Total visible en esta consulta.</p>
            </div>
            <div className="rounded-[24px] bg-white/82 p-4">
              <p className="text-sm text-muted-foreground">Cargos</p>
              <p className="mt-2 font-display text-3xl text-foreground">
                {formatCurrency(summary.outgoingTotal)}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">Suma de gastos y salidas.</p>
            </div>
            <div className="rounded-[24px] bg-white/82 p-4">
              <p className="text-sm text-muted-foreground">Ignorados</p>
              <p className="mt-2 font-display text-3xl text-foreground">{summary.ignored}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Movimientos internos o fuera del circuito principal.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {demoMode ? (
        <div className="status-banner">
          Estás en modo demo. Puedes revisar el flujo y las sugerencias, pero la importación y la
          conciliación real quedan desactivadas.
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[color:var(--color-brand-soft)] p-3 text-[color:var(--color-brand)]">
                <Upload className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Importar extracto bancario</CardTitle>
                <CardDescription>
                  Primera fase con CSV compatible. Busca cabeceras como fecha, concepto, importe,
                  abono, cargo o saldo.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <form action={demoMode ? undefined : importBankMovementsAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="accountLabel">Alias de cuenta</Label>
                <Input
                  id="accountLabel"
                  name="accountLabel"
                  placeholder="Cuenta principal Caixa / Banco local"
                  disabled={demoMode}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="statement">Extracto CSV</Label>
                <Input
                  id="statement"
                  name="statement"
                  type="file"
                  accept=".csv,text/csv"
                  disabled={demoMode}
                  required
                />
              </div>

              <SubmitButton
                pendingLabel="Importando extracto..."
                className="w-full justify-center"
                disabled={demoMode}
              >
                <Upload className="h-4 w-4" />
                Importar movimientos
              </SubmitButton>
            </form>

            <div className="rounded-[26px] bg-[color:var(--color-panel)] p-5 text-sm leading-7 text-muted-foreground">
              Consejo práctico: exporta primero el extracto con pocas semanas de datos. Así podrás
              validar bien la cabecera de tu banco y el comportamiento de la conciliación antes de
              cargar históricos grandes.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Filtrar y revisar</CardTitle>
            <CardDescription>
              Ajusta la bandeja bancaria para centrarte en pendientes, ingresos o cargos concretos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <form action="/banca" className="grid gap-3 md:grid-cols-[1fr_180px_180px_auto]">
              <div className="space-y-2">
                <Label htmlFor="q">Buscar</Label>
                <Input
                  id="q"
                  name="q"
                  defaultValue={q}
                  placeholder="Contraparte, concepto, fichero..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Estado</Label>
                <select
                  id="status"
                  name="status"
                  defaultValue={status}
                  className="flex h-11 w-full rounded-2xl border border-input bg-background px-4 text-sm"
                >
                  <option value="all">Todos</option>
                  <option value="pending">Pendientes</option>
                  <option value="reconciled">Conciliados</option>
                  <option value="ignored">Ignorados</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="direction">Dirección</Label>
                <select
                  id="direction"
                  name="direction"
                  defaultValue={direction}
                  className="flex h-11 w-full rounded-2xl border border-input bg-background px-4 text-sm"
                >
                  <option value="all">Todas</option>
                  <option value="credit">Ingresos</option>
                  <option value="debit">Cargos</option>
                </select>
              </div>
              <div className="flex items-end gap-3">
                <Button type="submit" className="w-full md:w-auto">
                  Aplicar filtros
                </Button>
                <Button variant="outline" asChild>
                  <Link href={buildBankHref({})}>Limpiar</Link>
                </Button>
              </div>
            </form>

            <div className="grid gap-3 lg:grid-cols-3">
              <div className="rounded-[24px] bg-[color:rgba(232,246,242,0.72)] p-4">
                <div className="flex items-center gap-2 text-[color:var(--color-success)]">
                  <ArrowUpRight className="h-4 w-4" />
                  <p className="text-sm font-semibold">Ingresos</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Se comparan primero contra facturas por importe exacto, fecha cercana y número
                  de factura si aparece en el concepto.
                </p>
              </div>
              <div className="rounded-[24px] bg-[color:rgba(251,247,241,0.82)] p-4">
                <div className="flex items-center gap-2 text-foreground">
                  <ArrowDownLeft className="h-4 w-4" />
                  <p className="text-sm font-semibold">Cargos</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Se cruzan con gastos importados para dejar claro qué salida corresponde a cada
                  justificante o factura de proveedor.
                </p>
              </div>
              <div className="rounded-[24px] bg-[color:rgba(19,45,52,0.04)] p-4">
                <div className="flex items-center gap-2 text-[color:var(--color-brand)]">
                  <Landmark className="h-4 w-4" />
                  <p className="text-sm font-semibold">Cobertura</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Esta entrega cubre CSV. OFX, reglas recurrentes y cuadros de caja llegarán en la
                  siguiente iteración.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="section-kicker">Bandeja bancaria</p>
            <h2 className="text-3xl font-semibold text-foreground">
              {movements.length > 0
                ? `${movements.length} movimientos en esta vista`
                : "Todavía no hay movimientos importados"}
            </h2>
          </div>
          <div className="hidden items-center gap-3 rounded-full bg-white/78 px-4 py-2 text-sm text-muted-foreground md:flex">
            <BadgeCheck className="h-4 w-4 text-[color:var(--color-success)]" />
            Manual primero, automatización después
          </div>
        </div>

        {movements.length > 0 ? (
          movements.map((movement) => (
            <MovementCard
              key={movement.id}
              movement={movement}
              invoicesById={invoicesById}
              expensesById={expensesById}
              demoMode={demoMode}
              suggestions={getBankMatchSuggestionsForMovement(movement, matchingData)}
            />
          ))
        ) : (
          <Card className="border-dashed border-white/70 bg-white/76">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-[color:var(--color-brand-soft)] p-4 text-[color:var(--color-brand)]">
                <Landmark className="h-6 w-6" />
              </div>
              <p className="mt-5 text-xl font-semibold text-foreground">
                No hay movimientos bancarios cargados todavía.
              </p>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
                Exporta un CSV desde tu banco, sube solo unas pocas semanas de datos y revisa cómo
                se enlazan los importes con tus facturas y gastos. La intención es darte una base
                clara antes de pasar a reglas automáticas.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button asChild variant="outline">
                  <Link href="/gastos">
                    <Wallet className="h-4 w-4" />
                    Revisar gastos
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/invoices">
                    <ReceiptText className="h-4 w-4" />
                    Revisar facturas
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
