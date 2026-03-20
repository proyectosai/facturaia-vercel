import Link from "next/link";
import {
  FilterX,
  Inbox,
  Mail,
  MailCheck,
  RefreshCcw,
  Server,
  Sparkles,
  TriangleAlert,
} from "lucide-react";

import { requireUser } from "@/lib/auth";
import {
  markMailThreadReadAction,
  sendMailTestAction,
  syncInboundMailAction,
} from "@/lib/actions/mail";
import { isDemoMode } from "@/lib/demo";
import {
  getInboundMailStatusSummary,
  getMailMessagesForUser,
  getMailSyncRunsForUser,
  getMailThreadForUser,
  getMailThreadsForUser,
} from "@/lib/inbound-mail";
import { getOutboundMailStatusSummary } from "@/lib/mail";
import type { MailSortKey, MessageUrgency } from "@/lib/types";
import { cn, formatDateTimeShort } from "@/lib/utils";
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

function buildMailHref({
  q,
  urgency,
  sort,
  thread,
}: {
  q?: string;
  urgency?: string;
  sort?: string;
  thread?: string;
}) {
  const params = new URLSearchParams();

  if (q?.trim()) {
    params.set("q", q.trim());
  }

  if (urgency && urgency !== "all") {
    params.set("urgency", urgency);
  }

  if (sort && sort !== "recent") {
    params.set("sort", sort);
  }

  if (thread?.trim()) {
    params.set("thread", thread.trim());
  }

  const query = params.toString();
  return query ? `/mail?${query}` : "/mail";
}

function getSortLabel(sort: MailSortKey) {
  return {
    recent: "Más recientes",
    urgency: "Mayor urgencia",
    name: "Nombre",
    email: "Email",
  }[sort];
}

function getUrgencyLabel(urgency: MessageUrgency) {
  return {
    high: "Alta",
    medium: "Media",
    low: "Baja",
  }[urgency];
}

function getUrgencyTone(urgency: MessageUrgency) {
  return {
    high: "bg-[color:rgba(190,64,48,0.12)] text-[color:#a73d2b]",
    medium: "bg-[color:rgba(202,145,34,0.16)] text-[color:#8b5b00]",
    low: "bg-[color:rgba(47,125,50,0.12)] text-[color:var(--color-success)]",
  }[urgency];
}

export default async function MailPage({
  searchParams,
}: {
  searchParams: Promise<{
    sent?: string | string[];
    error?: string | string[];
    synced?: string | string[];
    info?: string | string[];
    q?: string | string[];
    urgency?: string | string[];
    sort?: string | string[];
    thread?: string | string[];
  }>;
}) {
  const user = await requireUser();
  const demoMode = isDemoMode();
  const outboundStatus = getOutboundMailStatusSummary();
  const inboundStatus = getInboundMailStatusSummary();
  const params = await searchParams;
  const sent = getSingleSearchParam(params.sent);
  const error = getSingleSearchParam(params.error);
  const synced = getSingleSearchParam(params.synced);
  const info = getSingleSearchParam(params.info);
  const q = getSingleSearchParam(params.q);
  const urgency = getSingleSearchParam(params.urgency, "all");
  const sort = getSingleSearchParam(params.sort, "recent") as MailSortKey;
  const selectedThreadId = getSingleSearchParam(params.thread);
  const threads = await getMailThreadsForUser(user.id, {
    q,
    urgency:
      urgency === "high" || urgency === "medium" || urgency === "low"
        ? urgency
        : "all",
    sort:
      sort === "urgency" || sort === "name" || sort === "email"
        ? sort
        : "recent",
  });
  const syncRuns = await getMailSyncRunsForUser(user.id, 4);
  const selectedThread =
    (selectedThreadId
      ? await getMailThreadForUser(user.id, selectedThreadId)
      : threads[0] ?? null) ?? threads[0] ?? null;
  const messages = selectedThread
    ? await getMailMessagesForUser(user.id, selectedThread.id)
    : [];
  const unreadTotal = threads.reduce((sum, thread) => sum + thread.unread_count, 0);
  const urgentThreads = threads.filter((thread) => thread.urgency === "high").length;
  const hasFilters = Boolean(q || (urgency && urgency !== "all") || sort !== "recent");

  return (
    <div className="space-y-8">
      <RouteToast
        type="success"
        message={sent ? `Correo de prueba enviado a ${sent}.` : null}
      />
      <RouteToast
        type="success"
        message={
          synced
            ? `Sincronización IMAP completada: ${synced} correos nuevos importados.`
            : null
        }
      />
      <RouteToast type="info" message={info || null} />
      <RouteToast type="error" message={error || null} />

      <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr] xl:items-end">
        <div className="max-w-4xl space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge>Correo</Badge>
            <Badge variant="success">Módulo activo</Badge>
            {demoMode ? <Badge variant="secondary">Modo demo</Badge> : null}
          </div>

          <div className="space-y-3">
            <p className="section-kicker">Salida e inbox privado</p>
            <h1 className="font-display text-5xl leading-none tracking-tight text-foreground">
              Gestiona salida y entrada de correo desde una única cabina.
            </h1>
            <p className="text-lg leading-8 text-muted-foreground">
              FacturaIA ya cubre el envío de facturas y ahora incorpora una
              primera bandeja IMAP para importar correos entrantes, ordenarlos y
              mantener contexto dentro de tu instalación privada.
            </p>
          </div>
        </div>

        <Card className="overflow-hidden bg-[linear-gradient(150deg,rgba(255,255,255,0.95),rgba(232,246,242,0.9))]">
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-[24px] bg-white/82 p-4">
              <p className="text-sm text-muted-foreground">Salida</p>
              <p className="mt-2 font-display text-3xl text-foreground">
                {outboundStatus.providerLabel}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Facturas y correos de prueba.
              </p>
            </div>
            <div className="rounded-[24px] bg-white/82 p-4">
              <p className="text-sm text-muted-foreground">Entrada</p>
              <p className="mt-2 font-display text-3xl text-foreground">
                {inboundStatus.providerLabel}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Importación IMAP manual a demanda.
              </p>
            </div>
            <div className="rounded-[24px] bg-white/82 p-4">
              <p className="text-sm text-muted-foreground">No leídos</p>
              <p className="mt-2 font-display text-3xl text-foreground">{unreadTotal}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {urgentThreads} hilos con prioridad alta.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {demoMode ? (
        <div className="status-banner">
          Estás viendo el módulo de correo en modo demo. La bandeja entrante y el
          panel de salida son navegables, pero la sincronización IMAP y los envíos reales están desactivados.
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[color:var(--color-brand-soft)] p-3 text-[color:var(--color-brand)]">
                <MailCheck className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Correo saliente</CardTitle>
                <CardDescription>
                  Facturas y correos de prueba usando el proveedor configurado.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[26px] bg-[color:var(--color-panel)] p-5">
              <div className="flex flex-wrap items-center gap-3">
                <p className="font-semibold text-foreground">
                  {outboundStatus.providerLabel}
                </p>
                <Badge variant={outboundStatus.configured ? "success" : "secondary"}>
                  {outboundStatus.configured ? "Configurado" : "Pendiente"}
                </Badge>
              </div>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                {outboundStatus.detail}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[26px] bg-[color:var(--color-panel)] p-5">
                <div className="flex items-start gap-3">
                  <Server className="mt-1 h-5 w-5 text-[color:var(--color-brand)]" />
                  <div>
                    <p className="font-semibold text-foreground">SMTP</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Recomendado para despliegues privados con buzón o relay propio.
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-[26px] bg-[color:var(--color-panel)] p-5">
                <div className="flex items-start gap-3">
                  <Sparkles className="mt-1 h-5 w-5 text-[color:var(--color-brand)]" />
                  <div>
                    <p className="font-semibold text-foreground">Resend</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Alternativa rápida si prefieres proveedor transaccional gestionado.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <form action={sendMailTestAction} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="recipientEmail">Destinatario</Label>
                  <Input
                    id="recipientEmail"
                    name="recipientEmail"
                    type="email"
                    defaultValue={user.email ?? ""}
                    disabled={demoMode || !outboundStatus.configured}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Asunto</Label>
                  <Input
                    id="subject"
                    name="subject"
                    defaultValue="Prueba de correo desde FacturaIA"
                    disabled={demoMode || !outboundStatus.configured}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Mensaje</Label>
                <Textarea
                  id="message"
                  name="message"
                  rows={5}
                  defaultValue="Este es un correo de prueba enviado desde mi instalación privada de FacturaIA para verificar que el módulo de correo saliente funciona correctamente."
                  disabled={demoMode || !outboundStatus.configured}
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <SubmitButton
                  pendingLabel="Enviando prueba..."
                  disabled={demoMode || !outboundStatus.configured}
                >
                  <Mail className="h-4 w-4" />
                  Enviar correo de prueba
                </SubmitButton>
                <Button variant="outline" asChild>
                  <Link href="/invoices">Probar con facturas</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[color:var(--color-panel)] p-3 text-[color:var(--color-brand)]">
                <Inbox className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Correo entrante</CardTitle>
                <CardDescription>
                  Primera entrega del inbox IMAP con importación manual.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-[26px] bg-[color:var(--color-panel)] p-5">
              <div className="flex flex-wrap items-center gap-3">
                <p className="font-semibold text-foreground">
                  {inboundStatus.providerLabel}
                </p>
                <Badge variant={inboundStatus.configured ? "success" : "secondary"}>
                  {inboundStatus.configured ? "Configurado" : "Pendiente"}
                </Badge>
              </div>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                {inboundStatus.detail}
              </p>
            </div>

            {!inboundStatus.configured ? (
              <div className="rounded-[26px] bg-[color:rgba(202,145,34,0.12)] p-5">
                <div className="flex items-start gap-3">
                  <TriangleAlert className="mt-1 h-5 w-5 text-[color:#8b5b00]" />
                  <p className="text-sm leading-7 text-[color:#6d4b00]">
                    Para activar el inbox, añade las variables IMAP en `.env.local` o en
                    tu panel de despliegue. La guía completa está en
                    `docs/modulos/CORREO_ENTRANTE.md`.
                  </p>
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <form action={syncInboundMailAction}>
                <SubmitButton
                  pendingLabel="Sincronizando..."
                  disabled={demoMode || !inboundStatus.configured}
                >
                  <RefreshCcw className="h-4 w-4" />
                  Sincronizar inbox ahora
                </SubmitButton>
              </form>
              <Button variant="outline" asChild>
                <Link href="/modules">Ver catálogo</Link>
              </Button>
            </div>

            <div className="rounded-[26px] bg-white/80 p-5">
              <p className="text-sm font-semibold text-foreground">
                Últimas sincronizaciones
              </p>
              <div className="mt-3 space-y-3">
                {syncRuns.length > 0 ? (
                  syncRuns.map((run) => (
                    <div
                      key={run.id}
                      className="rounded-[20px] bg-[color:var(--color-panel)] p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium text-foreground">
                          {run.status === "success" ? "Correcta" : "Con error"}
                        </p>
                        <span className="text-sm text-muted-foreground">
                          {formatDateTimeShort(run.created_at)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {run.imported_count} importados · {run.detail ?? "Sin detalle"}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm leading-7 text-muted-foreground">
                    Todavía no hay sincronizaciones registradas.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 rounded-[28px] border border-white/60 bg-white/70 p-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="section-kicker">Bandeja importada</p>
            <h2 className="font-display text-4xl text-foreground">
              Correos entrantes ordenados por fecha, urgencia y remitente
            </h2>
          </div>

          <form className="grid gap-3 sm:grid-cols-3 xl:w-[720px]" action="/mail">
            <div className="space-y-2">
              <Label htmlFor="q">Buscar</Label>
              <Input
                id="q"
                name="q"
                defaultValue={q}
                placeholder="Nombre, email, asunto..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="urgency">Urgencia</Label>
              <select
                id="urgency"
                name="urgency"
                defaultValue={urgency}
                className="h-11 w-full rounded-2xl border border-input bg-background px-4 text-sm text-foreground"
              >
                <option value="all">Todas</option>
                <option value="high">Alta</option>
                <option value="medium">Media</option>
                <option value="low">Baja</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sort">Orden</Label>
              <select
                id="sort"
                name="sort"
                defaultValue={sort}
                className="h-11 w-full rounded-2xl border border-input bg-background px-4 text-sm text-foreground"
              >
                <option value="recent">Más recientes</option>
                <option value="urgency">Mayor urgencia</option>
                <option value="name">Nombre</option>
                <option value="email">Email</option>
              </select>
            </div>
            <div className="flex flex-wrap gap-2 sm:col-span-3">
              <Button type="submit" variant="outline">
                Aplicar filtros
              </Button>
              {hasFilters ? (
                <Button variant="ghost" asChild>
                  <Link href="/mail">
                    <FilterX className="h-4 w-4" />
                    Limpiar
                  </Link>
                </Button>
              ) : null}
              <div className="inline-flex items-center rounded-full bg-[color:var(--color-panel)] px-4 py-2 text-sm text-muted-foreground">
                Orden actual: {getSortLabel(sort)}
              </div>
            </div>
          </form>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Card>
            <CardHeader>
              <CardTitle>Hilos importados</CardTitle>
              <CardDescription>
                {threads.length} hilos detectados en el buzón configurado.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {threads.length > 0 ? (
                threads.map((thread) => (
                  <Link
                    key={thread.id}
                    href={buildMailHref({
                      q,
                      urgency,
                      sort,
                      thread: thread.id,
                    })}
                    className={cn(
                      "block rounded-[24px] border border-white/60 bg-white/80 p-4 transition",
                      selectedThread?.id === thread.id
                        ? "border-[color:var(--color-brand)] bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(230,245,241,0.92))] shadow-lg shadow-[color:color-mix(in_oklab,var(--color-brand)_10%,transparent)]"
                        : "hover:border-[color:var(--color-brand-soft)] hover:bg-white",
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{thread.from_email}</Badge>
                      <span
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-medium",
                          getUrgencyTone(thread.urgency),
                        )}
                      >
                        {getUrgencyLabel(thread.urgency)}
                      </span>
                      {thread.unread_count > 0 ? (
                        <Badge variant="default">
                          {thread.unread_count} sin leer
                        </Badge>
                      ) : null}
                    </div>
                    <h3 className="mt-3 text-xl font-semibold text-foreground">
                      {thread.from_name || thread.from_email}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {thread.subject || "Sin asunto"}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      {thread.last_message_preview}
                    </p>
                    <p className="mt-3 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      {formatDateTimeShort(thread.last_message_at)}
                    </p>
                  </Link>
                ))
              ) : (
                <div className="rounded-[24px] bg-[color:var(--color-panel)] p-5 text-sm leading-7 text-muted-foreground">
                  Todavía no hay correos importados. Configura IMAP y ejecuta una
                  sincronización desde la parte superior para poblar esta bandeja.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {selectedThread ? selectedThread.from_name || selectedThread.from_email : "Detalle del hilo"}
              </CardTitle>
              <CardDescription>
                {selectedThread
                  ? selectedThread.subject || "Sin asunto"
                  : "Selecciona un hilo para leer su contenido"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {selectedThread ? (
                <>
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge variant="secondary">{selectedThread.from_email}</Badge>
                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-medium",
                        getUrgencyTone(selectedThread.urgency),
                      )}
                    >
                      {getUrgencyLabel(selectedThread.urgency)}
                    </span>
                    {selectedThread.unread_count > 0 ? (
                      <form action={markMailThreadReadAction}>
                        <input type="hidden" name="threadId" value={selectedThread.id} />
                        <SubmitButton variant="outline" pendingLabel="Marcando...">
                          Marcar como leído
                        </SubmitButton>
                      </form>
                    ) : null}
                  </div>

                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className="rounded-[24px] bg-[color:var(--color-panel)] p-5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-semibold text-foreground">
                              {message.from_name || message.from_email}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {message.subject || "Sin asunto"}
                            </p>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {formatDateTimeShort(message.received_at)}
                          </span>
                        </div>
                        <div className="mt-4 rounded-[20px] bg-white/80 p-4">
                          <p className="whitespace-pre-wrap text-sm leading-7 text-foreground">
                            {message.body_text}
                          </p>
                        </div>
                        {message.to_emails.length > 0 ? (
                          <p className="mt-3 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                            Para: {message.to_emails.join(", ")}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="rounded-[24px] bg-[color:var(--color-panel)] p-5 text-sm leading-7 text-muted-foreground">
                  Cuando haya correos importados podrás abrir aquí cada hilo y
                  revisar el contenido completo sin salir de FacturaIA.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
