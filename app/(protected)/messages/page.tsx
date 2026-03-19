import Link from "next/link";
import {
  BellRing,
  FilterX,
  MessageSquareDashed,
  MessagesSquare,
  Phone,
  Send,
  TriangleAlert,
  UserRound,
} from "lucide-react";

import {
  requireUser,
} from "@/lib/auth";
import { isDemoMode } from "@/lib/demo";
import {
  buildMessagingWebhookUrl,
  ensureMessageConnections,
  getChannelLabel,
  getCurrentMessageConnections,
  getMessageThreadsForUser,
  getThreadForUser,
  getThreadMessagesForUser,
  getUrgencyLabel,
} from "@/lib/messages";
import type {
  MessageSortKey,
  MessageThread,
  MessageUrgency,
} from "@/lib/types";
import { cn, formatDateTimeShort } from "@/lib/utils";
import {
  markThreadReadAction,
  setThreadUrgencyAction,
  unlockThreadUrgencyAction,
} from "@/lib/actions/messages";
import { CopyLinkButton } from "@/components/copy-link-button";
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

function getSingleSearchParam(
  value: string | string[] | undefined,
  fallback = "",
) {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }

  return value ?? fallback;
}

function buildMessagesHref({
  q,
  channel,
  urgency,
  sort,
  thread,
}: {
  q?: string;
  channel?: string;
  urgency?: string;
  sort?: string;
  thread?: string;
}) {
  const params = new URLSearchParams();

  if (q?.trim()) {
    params.set("q", q.trim());
  }

  if (channel && channel !== "all") {
    params.set("channel", channel);
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
  return query ? `/messages?${query}` : "/messages";
}

function getUrgencyTone(urgency: MessageUrgency) {
  return {
    high: "bg-[color:rgba(190,64,48,0.12)] text-[color:#a73d2b]",
    medium: "bg-[color:rgba(202,145,34,0.16)] text-[color:#8b5b00]",
    low: "bg-[color:rgba(47,125,50,0.12)] text-[color:var(--color-success)]",
  }[urgency];
}

function getSortLabel(sort: MessageSortKey) {
  return {
    recent: "Más recientes",
    urgency: "Mayor urgencia",
    name: "Nombre",
    surname: "Apellidos",
  }[sort];
}

function getChannelTone(channel: MessageThread["channel"]) {
  return channel === "whatsapp"
    ? "bg-[color:rgba(37,211,102,0.16)] text-[color:#167b45]"
    : "bg-[color:rgba(39,132,232,0.14)] text-[color:#1560a8]";
}

function getThreadHref(
  threadId: string,
  filters: {
    q: string;
    channel: string;
    urgency: string;
    sort: string;
  },
) {
  return buildMessagesHref({
    ...filters,
    thread: threadId,
  });
}

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
    channel?: string | string[];
    urgency?: string | string[];
    sort?: string | string[];
    thread?: string | string[];
  }>;
}) {
  const user = await requireUser();
  const demoMode = isDemoMode();
  const params = await searchParams;
  const q = getSingleSearchParam(params.q);
  const channel = getSingleSearchParam(params.channel, "all");
  const urgency = getSingleSearchParam(params.urgency, "all");
  const sort = getSingleSearchParam(params.sort, "recent") as MessageSortKey;
  const selectedThreadId = getSingleSearchParam(params.thread);
  const filters = {
    q,
    channel,
    urgency,
    sort,
  };
  const threads = await getMessageThreadsForUser(user.id, {
    q,
    channel:
      channel === "whatsapp" || channel === "telegram" ? channel : "all",
    urgency:
      urgency === "high" || urgency === "medium" || urgency === "low"
        ? urgency
        : "all",
    sort:
      sort === "urgency" || sort === "name" || sort === "surname"
        ? sort
        : "recent",
  });
  await ensureMessageConnections(user.id);
  const connections = await getCurrentMessageConnections(user.id);
  const selectedThread =
    (selectedThreadId
      ? await getThreadForUser(user.id, selectedThreadId)
      : threads[0] ?? null) ?? threads[0] ?? null;
  const messages = selectedThread
    ? await getThreadMessagesForUser(user.id, selectedThread.id)
    : [];
  const unreadTotal = threads.reduce((sum, thread) => sum + thread.unread_count, 0);
  const urgentThreads = threads.filter((thread) => thread.urgency === "high").length;
  const whatsappUrl = buildMessagingWebhookUrl(
    "whatsapp",
    connections.whatsapp.inbound_key,
  );
  const telegramUrl = buildMessagingWebhookUrl(
    "telegram",
    connections.telegram.inbound_key,
  );

  return (
    <div className="space-y-8">
      {demoMode ? (
        <div className="status-banner">
          Estás viendo el módulo de mensajería en modo demo local. La bandeja es navegable y enseña cómo quedarán ordenados WhatsApp y Telegram cuando configures los webhooks reales.
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr] xl:items-end">
        <div className="max-w-3xl space-y-4">
          <p className="section-kicker">Mensajería opcional</p>
          <h1 className="font-display text-5xl leading-none tracking-tight text-foreground">
            Una bandeja única para ordenar clientes por fecha, urgencia y nombre.
          </h1>
          <p className="text-lg leading-8 text-muted-foreground">
            Este módulo opcional recoge mensajes entrantes del WhatsApp Business
            oficial y del bot de Telegram de tu negocio. La idea es clara:
            centralizar conversaciones, detectar urgencia y no perder contexto
            cuando un cliente escribe por distintos canales.
          </p>

          <div className="flex flex-wrap gap-3">
            <Badge variant="default">{threads.length} conversaciones</Badge>
            <Badge variant="secondary">{unreadTotal} sin leer</Badge>
            <Badge variant={urgentThreads > 0 ? "default" : "success"}>
              {urgentThreads} urgentes
            </Badge>
            <Badge variant="success">Módulo opcional</Badge>
          </div>
        </div>

        <Card className="overflow-hidden bg-[linear-gradient(150deg,rgba(255,255,255,0.95),rgba(232,246,242,0.9))]">
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-[24px] bg-white/82 p-4">
              <p className="text-sm text-muted-foreground">Orden actual</p>
              <p className="mt-2 font-display text-3xl text-foreground">
                {getSortLabel(sort)}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Cambia la vista según fecha, prioridad o datos del cliente.
              </p>
            </div>
            <div className="rounded-[24px] bg-white/82 p-4">
              <p className="text-sm text-muted-foreground">Canales activos</p>
              <p className="mt-2 font-display text-3xl text-foreground">2</p>
              <p className="mt-2 text-sm text-muted-foreground">
                WhatsApp Business y Telegram bajo el mismo panel.
              </p>
            </div>
            <div className="rounded-[24px] bg-white/82 p-4">
              <p className="text-sm text-muted-foreground">Próximo paso</p>
              <p className="mt-2 font-display text-3xl text-foreground">Webhook</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Copia las URLs de abajo y termina la conexión oficial en cada canal.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  WhatsApp Business
                </CardTitle>
                <CardDescription>
                  Conecta el número oficial del negocio y deja que Meta envíe
                  los mensajes entrantes a este endpoint.
                </CardDescription>
              </div>
              <Badge
                variant={
                  connections.whatsapp.status === "active" ? "success" : "secondary"
                }
              >
                {connections.whatsapp.status === "active" ? "Activo" : "Pendiente"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[24px] bg-[color:var(--color-panel)] p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Webhook URL
              </p>
              <p className="mt-2 break-all text-sm font-medium text-foreground">
                {whatsappUrl}
              </p>
            </div>
            <div className="rounded-[24px] bg-[color:var(--color-panel)] p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Verify token
              </p>
              <p className="mt-2 break-all text-sm font-medium text-foreground">
                {connections.whatsapp.verify_token}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <CopyLinkButton value={whatsappUrl} label="Copiar webhook" />
              <CopyLinkButton
                value={connections.whatsapp.verify_token}
                label="Copiar verify token"
                variant="secondary"
              />
            </div>
            <p className="text-sm leading-7 text-muted-foreground">
              Límite importante: aquí hablamos del <strong>canal oficial de tu negocio</strong>,
              no del WhatsApp personal de cada cliente. El webhook recoge los mensajes que te
              envían a tu cuenta Business y los ordena dentro de FacturaIA.
            </p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Telegram
                </CardTitle>
                <CardDescription>
                  Crea un bot de Telegram para clientes y apunta su webhook a esta URL.
                </CardDescription>
              </div>
              <Badge
                variant={
                  connections.telegram.status === "active" ? "success" : "secondary"
                }
              >
                {connections.telegram.status === "active" ? "Activo" : "Pendiente"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[24px] bg-[color:var(--color-panel)] p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Webhook URL
              </p>
              <p className="mt-2 break-all text-sm font-medium text-foreground">
                {telegramUrl}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <CopyLinkButton value={telegramUrl} label="Copiar webhook" />
            </div>
            <p className="text-sm leading-7 text-muted-foreground">
              Para Telegram, la configuración habitual es simple: creas un bot,
              defines el webhook y dejas que cada mensaje entrante caiga aquí.
              El panel detecta nombre, apellidos, usuario, fecha, prioridad y
              último mensaje visible.
            </p>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellRing className="h-4 w-4" />
            Filtros y orden
          </CardTitle>
          <CardDescription>
            Busca por nombre, apellidos, teléfono, alias o último mensaje. También puedes ver
            solo un canal o una urgencia concreta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_auto]">
            <div className="space-y-2">
              <Label htmlFor="messages-q">Buscar cliente o contenido</Label>
              <Input
                id="messages-q"
                name="q"
                placeholder="Marina Serrano, +34..., propuesta..."
                defaultValue={q}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="messages-channel">Canal</Label>
              <select
                id="messages-channel"
                name="channel"
                defaultValue={channel}
                className="flex h-11 w-full rounded-2xl border border-border bg-white px-4 text-sm text-foreground outline-none transition focus:border-[color:var(--color-brand)]"
              >
                <option value="all">Todos</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="telegram">Telegram</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="messages-urgency">Urgencia</Label>
              <select
                id="messages-urgency"
                name="urgency"
                defaultValue={urgency}
                className="flex h-11 w-full rounded-2xl border border-border bg-white px-4 text-sm text-foreground outline-none transition focus:border-[color:var(--color-brand)]"
              >
                <option value="all">Todas</option>
                <option value="high">Alta</option>
                <option value="medium">Media</option>
                <option value="low">Baja</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="messages-sort">Ordenar</Label>
              <select
                id="messages-sort"
                name="sort"
                defaultValue={sort}
                className="flex h-11 w-full rounded-2xl border border-border bg-white px-4 text-sm text-foreground outline-none transition focus:border-[color:var(--color-brand)]"
              >
                <option value="recent">Más recientes</option>
                <option value="urgency">Mayor urgencia</option>
                <option value="name">Nombre</option>
                <option value="surname">Apellidos</option>
              </select>
            </div>
            <div className="flex items-end gap-3">
              <Button type="submit">Aplicar</Button>
              {q || channel !== "all" || urgency !== "all" || sort !== "recent" ? (
                <Button type="button" variant="outline" asChild>
                  <Link href="/messages">
                    <FilterX className="h-4 w-4" />
                    Limpiar
                  </Link>
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessagesSquare className="h-4 w-4" />
              Bandeja unificada
            </CardTitle>
            <CardDescription>
              Ordenada por {getSortLabel(sort).toLowerCase()}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {threads.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-border bg-[color:var(--color-panel)] p-8 text-center">
                <MessageSquareDashed className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-4 font-medium text-foreground">
                  Aún no hay conversaciones recibidas.
                </p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  Cuando conectes los webhooks de WhatsApp y Telegram, los mensajes
                  entrantes aparecerán aquí ordenados automáticamente.
                </p>
              </div>
            ) : (
              threads.map((thread) => {
                const active = selectedThread?.id === thread.id;

                return (
                  <Link
                    key={thread.id}
                    href={getThreadHref(thread.id, filters)}
                    className={cn(
                      "block rounded-[28px] border p-4 transition",
                      active
                        ? "border-[color:var(--color-brand)] bg-[color:rgba(231,245,240,0.8)] shadow-[0_18px_50px_rgba(34,84,61,0.08)]"
                        : "border-border/70 bg-white hover:border-[color:var(--color-brand-soft)] hover:bg-[color:rgba(255,255,255,0.92)]",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-base font-semibold text-foreground">
                            {thread.full_name}
                          </span>
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]",
                              getChannelTone(thread.channel),
                            )}
                          >
                            {getChannelLabel(thread.channel)}
                          </span>
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]",
                              getUrgencyTone(thread.urgency),
                            )}
                          >
                            {getUrgencyLabel(thread.urgency)}
                          </span>
                        </div>
                        <p className="mt-2 truncate text-sm text-muted-foreground">
                          {thread.last_message_preview || "Sin contenido reciente"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          {formatDateTimeShort(thread.last_message_at)}
                        </p>
                        {thread.unread_count > 0 ? (
                          <div className="mt-2 inline-flex min-w-8 items-center justify-center rounded-full bg-[color:var(--color-brand)] px-2 py-1 text-xs font-semibold text-[color:var(--color-brand-foreground)]">
                            {thread.unread_count}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3 text-sm text-muted-foreground">
                      {thread.phone ? <span>{thread.phone}</span> : null}
                      {thread.telegram_username ? (
                        <span>@{thread.telegram_username}</span>
                      ) : null}
                      {thread.urgency_locked ? (
                        <span>Prioridad fijada manualmente</span>
                      ) : (
                        <span>Prioridad automática</span>
                      )}
                    </div>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Detalle de conversación</CardTitle>
            <CardDescription>
              Vista pensada para no perder el contexto de cada cliente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!selectedThread ? (
              <div className="rounded-[28px] border border-dashed border-border bg-[color:var(--color-panel)] p-8 text-center">
                <UserRound className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-4 font-medium text-foreground">
                  Selecciona una conversación para verla completa.
                </p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  Aquí aparecerán los mensajes, el canal, la prioridad y los datos del cliente.
                </p>
              </div>
            ) : (
              <>
                <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                  <div className="rounded-[28px] bg-[linear-gradient(145deg,rgba(255,255,255,0.96),rgba(233,244,240,0.86))] p-5">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="font-display text-3xl text-foreground">
                        {selectedThread.full_name}
                      </h2>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]",
                          getChannelTone(selectedThread.channel),
                        )}
                      >
                        {getChannelLabel(selectedThread.channel)}
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]",
                          getUrgencyTone(selectedThread.urgency),
                        )}
                      >
                        {getUrgencyLabel(selectedThread.urgency)}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                      <p>Último mensaje: {formatDateTimeShort(selectedThread.last_message_at)}</p>
                      <p>Sin leer: {selectedThread.unread_count}</p>
                      <p>Teléfono: {selectedThread.phone || "No disponible"}</p>
                      <p>
                        Alias Telegram:{" "}
                        {selectedThread.telegram_username
                          ? `@${selectedThread.telegram_username}`
                          : "No disponible"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4 rounded-[28px] bg-[color:var(--color-panel)] p-5">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Acciones rápidas
                      </p>
                      <div className="mt-3 flex flex-wrap gap-3">
                        <form action={markThreadReadAction}>
                          <input type="hidden" name="threadId" value={selectedThread.id} />
                          <Button variant="outline" size="sm">
                            Marcar como leído
                          </Button>
                        </form>
                        {selectedThread.urgency_locked ? (
                          <form action={unlockThreadUrgencyAction}>
                            <input type="hidden" name="threadId" value={selectedThread.id} />
                            <Button variant="ghost" size="sm">
                              Volver a automático
                            </Button>
                          </form>
                        ) : null}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Fijar prioridad
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(["high", "medium", "low"] as const).map((level) => (
                          <form key={level} action={setThreadUrgencyAction}>
                            <input type="hidden" name="threadId" value={selectedThread.id} />
                            <input type="hidden" name="urgency" value={level} />
                            <Button
                              variant={selectedThread.urgency === level ? "default" : "outline"}
                              size="sm"
                            >
                              {getUrgencyLabel(level)}
                            </Button>
                          </form>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[20px] bg-white/80 p-4 text-sm leading-7 text-muted-foreground">
                      Este módulo está pensado para entrada y organización de mensajes.
                      La respuesta saliente se puede añadir después, pero la prioridad ahora es
                      que no se te escape ningún cliente.
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {messages.length === 0 ? (
                    <div className="rounded-[24px] border border-dashed border-border bg-[color:var(--color-panel)] p-6 text-sm text-muted-foreground">
                      Aún no hay mensajes almacenados en esta conversación.
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          "rounded-[26px] px-5 py-4",
                          message.direction === "inbound"
                            ? "mr-6 bg-[color:rgba(255,255,255,0.92)]"
                            : "ml-6 bg-[color:rgba(231,245,240,0.88)]",
                        )}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-foreground">
                            {message.sender_name || selectedThread.full_name}
                          </p>
                          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                            {formatDateTimeShort(message.received_at)}
                          </p>
                        </div>
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-foreground">
                          {message.body}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                <div className="rounded-[28px] border border-[color:rgba(182,117,41,0.14)] bg-[color:rgba(255,248,238,0.9)] p-5">
                  <div className="flex items-start gap-3">
                    <TriangleAlert className="mt-0.5 h-5 w-5 text-[color:#b57529]" />
                    <div className="space-y-2 text-sm leading-7 text-[color:#6f4b14]">
                      <p className="font-semibold">Límite importante del módulo</p>
                      <p>
                        Esta integración organiza los mensajes que llegan al canal
                        oficial de tu negocio. No accede al WhatsApp privado del cliente
                        ni al historial personal de Telegram fuera del bot configurado.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
