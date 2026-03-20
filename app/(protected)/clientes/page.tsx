import Link from "next/link";
import {
  Mail,
  MessageSquareText,
  ReceiptText,
  UserRoundPlus,
} from "lucide-react";

import { requireUser } from "@/lib/auth";
import { saveClientAction } from "@/lib/actions/clients";
import {
  clientPriorityLabels,
  clientRelationLabels,
  clientStatusLabels,
  getClientHubData,
} from "@/lib/clients";
import { isDemoMode } from "@/lib/demo";
import type {
  ClientPriority,
  ClientRelationKind,
  ClientStatus,
} from "@/lib/types";
import { cn, formatCurrency, formatDateShort } from "@/lib/utils";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

function buildClientsHref({
  q,
  status,
  priority,
  relation,
  client,
  seedName,
  seedEmail,
  seedPhone,
  seedNif,
  seedRelation,
}: {
  q?: string;
  status?: string;
  priority?: string;
  relation?: string;
  client?: string;
  seedName?: string;
  seedEmail?: string;
  seedPhone?: string;
  seedNif?: string;
  seedRelation?: string;
}) {
  const params = new URLSearchParams();

  if (q?.trim()) {
    params.set("q", q.trim());
  }

  if (status && status !== "all") {
    params.set("status", status);
  }

  if (priority && priority !== "all") {
    params.set("priority", priority);
  }

  if (relation && relation !== "all") {
    params.set("relation", relation);
  }

  if (client) {
    params.set("client", client);
  }

  if (seedName) {
    params.set("seedName", seedName);
  }

  if (seedEmail) {
    params.set("seedEmail", seedEmail);
  }

  if (seedPhone) {
    params.set("seedPhone", seedPhone);
  }

  if (seedNif) {
    params.set("seedNif", seedNif);
  }

  if (seedRelation) {
    params.set("seedRelation", seedRelation);
  }

  const query = params.toString();
  return query ? `/clientes?${query}` : "/clientes";
}

function getPriorityTone(priority: ClientPriority) {
  return {
    low: "bg-[color:rgba(90,125,122,0.12)] text-[color:#355f5b]",
    medium: "bg-[color:rgba(202,145,34,0.14)] text-[color:#8b5b00]",
    high: "bg-[color:rgba(180,68,54,0.14)] text-[color:#8f2f2f]",
  }[priority];
}

function getStatusTone(status: ClientStatus) {
  return {
    lead: "bg-[color:rgba(202,145,34,0.14)] text-[color:#8b5b00]",
    active: "bg-[color:rgba(47,125,50,0.12)] text-[color:var(--color-success)]",
    paused: "bg-[color:rgba(90,125,122,0.12)] text-[color:#355f5b]",
    archived: "bg-[color:rgba(86,95,103,0.14)] text-[color:#47515a]",
  }[status];
}

function getRelationTone(relation: ClientRelationKind) {
  return {
    client: "bg-[color:rgba(16,115,112,0.14)] text-[color:#0f5f63]",
    supplier: "bg-[color:rgba(109,78,150,0.14)] text-[color:#5c4696]",
    mixed: "bg-[color:rgba(180,68,54,0.14)] text-[color:#8f2f2f]",
  }[relation];
}

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{
    created?: string | string[];
    updated?: string | string[];
    error?: string | string[];
    q?: string | string[];
    status?: string | string[];
    priority?: string | string[];
    relation?: string | string[];
    client?: string | string[];
    seedName?: string | string[];
    seedEmail?: string | string[];
    seedPhone?: string | string[];
    seedNif?: string | string[];
    seedRelation?: string | string[];
  }>;
}) {
  const user = await requireUser();
  const demoMode = isDemoMode();
  const params = await searchParams;
  const q = getSingleSearchParam(params.q);
  const status = getSingleSearchParam(params.status, "all");
  const priority = getSingleSearchParam(params.priority, "all");
  const relation = getSingleSearchParam(params.relation, "all");
  const selectedClientId = getSingleSearchParam(params.client);
  const created = getSingleSearchParam(params.created);
  const updated = getSingleSearchParam(params.updated);
  const error = getSingleSearchParam(params.error);
  const seedName = getSingleSearchParam(params.seedName);
  const seedEmail = getSingleSearchParam(params.seedEmail);
  const seedPhone = getSingleSearchParam(params.seedPhone);
  const seedNif = getSingleSearchParam(params.seedNif);
  const seedRelation = getSingleSearchParam(params.seedRelation, "client");

  const { clients, selectedClient, selectedSnapshot, detectedSuggestions, summary } =
    await getClientHubData(
      user.id,
      {
        query: q,
        status:
          status === "lead" ||
          status === "active" ||
          status === "paused" ||
          status === "archived"
            ? status
            : "all",
        priority:
          priority === "low" || priority === "medium" || priority === "high"
            ? priority
            : "all",
        relation:
          relation === "client" || relation === "supplier" || relation === "mixed"
            ? relation
            : "all",
      },
      selectedClientId,
    );

  return (
    <div className="space-y-8">
      <RouteToast
        type="success"
        message={created ? "Ficha creada correctamente." : null}
      />
      <RouteToast
        type="success"
        message={updated ? "Ficha actualizada correctamente." : null}
      />
      <RouteToast type="error" message={error || null} />

      <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr] xl:items-end">
        <div className="max-w-4xl space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge>CRM ligero</Badge>
            <Badge variant="secondary">Primera entrega</Badge>
            {demoMode ? <Badge variant="secondary">Modo demo</Badge> : null}
          </div>

          <div className="space-y-3">
            <p className="section-kicker">Clientes y operativa</p>
            <h1 className="font-display text-5xl leading-none tracking-tight text-foreground">
              Centraliza cada cliente y cada proveedor en una ficha útil, sin salir del panel.
            </h1>
            <p className="text-lg leading-8 text-muted-foreground">
              Este módulo une facturas, presupuestos, mensajes, correos y gastos
              alrededor de una ficha ligera. Está pensado para instalaciones
              privadas que necesitan orden operativo, no complejidad de CRM corporativo.
            </p>
          </div>
        </div>

        <Card className="overflow-hidden bg-[linear-gradient(155deg,rgba(255,255,255,0.95),rgba(232,246,242,0.9))]">
          <CardContent className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-[24px] bg-white/82 p-4">
              <p className="text-sm text-muted-foreground">Fichas guardadas</p>
              <p className="mt-2 font-display text-3xl text-foreground">
                {summary.savedClients}
              </p>
            </div>
            <div className="rounded-[24px] bg-white/82 p-4">
              <p className="text-sm text-muted-foreground">Detectadas</p>
              <p className="mt-2 font-display text-3xl text-foreground">
                {summary.detectedSuggestions}
              </p>
            </div>
            <div className="rounded-[24px] bg-white/82 p-4">
              <p className="text-sm text-muted-foreground">Activas</p>
              <p className="mt-2 font-display text-3xl text-foreground">
                {summary.activeClients}
              </p>
            </div>
            <div className="rounded-[24px] bg-white/82 p-4">
              <p className="text-sm text-muted-foreground">Prioridad alta</p>
              <p className="mt-2 font-display text-3xl text-foreground">
                {summary.highPriorityClients}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <Card className="overflow-hidden border-white/60 bg-white/90">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[color:var(--color-brand-soft)] p-3 text-[color:var(--color-brand)]">
                <UserRoundPlus className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Nueva ficha</CardTitle>
                <CardDescription>
                  Crea una ficha manual o aprovecha los datos detectados en el resto de módulos.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form action={demoMode ? undefined : saveClientAction} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Nombre visible</Label>
                  <Input
                    id="displayName"
                    name="displayName"
                    defaultValue={seedName}
                    placeholder="Nexo Digital S.L."
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyName">Empresa o razón social</Label>
                  <Input
                    id="companyName"
                    name="companyName"
                    defaultValue={seedName}
                    placeholder="Empresa o proyecto"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    defaultValue={seedEmail}
                    placeholder="correo@cliente.es"
                    type="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    name="phone"
                    defaultValue={seedPhone}
                    placeholder="+34 600 00 00 00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nif">NIF</Label>
                  <Input
                    id="nif"
                    name="nif"
                    defaultValue={seedNif}
                    placeholder="B12345678"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="relationKind">Relación</Label>
                  <select
                    id="relationKind"
                    name="relationKind"
                    defaultValue={
                      seedRelation === "supplier" || seedRelation === "mixed"
                        ? seedRelation
                        : "client"
                    }
                    className="flex h-11 w-full items-center rounded-2xl border border-border bg-white/85 px-4 text-sm text-foreground shadow-sm outline-none transition"
                  >
                    <option value="client">Cliente</option>
                    <option value="supplier">Proveedor</option>
                    <option value="mixed">Mixto</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="status">Estado</Label>
                  <select
                    id="status"
                    name="status"
                    defaultValue="lead"
                    className="flex h-11 w-full items-center rounded-2xl border border-border bg-white/85 px-4 text-sm text-foreground shadow-sm outline-none transition"
                  >
                    <option value="lead">Lead</option>
                    <option value="active">Activo</option>
                    <option value="paused">Pausado</option>
                    <option value="archived">Archivado</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Prioridad</Label>
                  <select
                    id="priority"
                    name="priority"
                    defaultValue="medium"
                    className="flex h-11 w-full items-center rounded-2xl border border-border bg-white/85 px-4 text-sm text-foreground shadow-sm outline-none transition"
                  >
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Etiquetas</Label>
                <Input
                  id="tags"
                  name="tags"
                  placeholder="mensual, prioritario, legal"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notas internas</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Resumen de acuerdos, observaciones o próximos pasos."
                  rows={5}
                />
              </div>

              <SubmitButton
                pendingLabel="Guardando ficha..."
                disabled={demoMode}
                className="w-full sm:w-auto"
              >
                Guardar ficha
              </SubmitButton>
            </form>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-white/60 bg-[radial-gradient(circle_at_top_left,rgba(233,244,240,0.96),rgba(255,255,255,0.92)_40%,rgba(244,233,215,0.76)_100%)]">
          <CardHeader>
            <CardTitle className="font-display text-3xl">Qué unifica este módulo</CardTitle>
            <CardDescription className="max-w-3xl text-base leading-7">
              FacturaIA ya tiene los datos dispersos entre facturas, correos, chats,
              documentos y gastos. El CRM ligero pone esa información al lado de cada
              ficha para que veas contexto, urgencia y operativa en un solo vistazo.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[26px] bg-white/82 p-5">
              <p className="text-sm font-semibold text-foreground">Incluye hoy</p>
              <div className="mt-3 space-y-2 text-sm leading-7 text-muted-foreground">
                <p>Fichas manuales de cliente o proveedor.</p>
                <p>Detección de contactos a partir de actividad real.</p>
                <p>Timeline básica con accesos a correo, mensajes y documentos.</p>
                <p>Prioridad, estado, etiquetas y notas internas.</p>
              </div>
            </div>
            <div className="rounded-[26px] bg-white/82 p-5">
              <p className="text-sm font-semibold text-foreground">Siguiente paso natural</p>
              <div className="mt-3 space-y-2 text-sm leading-7 text-muted-foreground">
                <p>Enlace automático de fichas al crear facturas y presupuestos.</p>
                <p>Notas con historial en vez de un único bloque de texto.</p>
                <p>Recordatorios y acciones de seguimiento.</p>
                <p>Filtro operativo por clientes sin respuesta o sin cobro.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="border-white/60 bg-white/88">
        <CardContent className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr] xl:items-end">
          <form action="/clientes" className="space-y-2">
            <Label htmlFor="q">Buscar ficha</Label>
            <Input
              id="q"
              name="q"
              defaultValue={q}
              placeholder="Nombre, email, NIF, etiqueta..."
            />
          </form>

          <form action="/clientes" className="space-y-2">
            <input type="hidden" name="q" value={q} />
            <input type="hidden" name="priority" value={priority} />
            <input type="hidden" name="relation" value={relation} />
            <Label htmlFor="statusFilter">Estado</Label>
            <select
              id="statusFilter"
              name="status"
              defaultValue={status}
              className="flex h-11 w-full items-center rounded-2xl border border-border bg-white/85 px-4 text-sm text-foreground shadow-sm outline-none transition"
            >
              <option value="all">Todos</option>
              <option value="lead">Lead</option>
              <option value="active">Activo</option>
              <option value="paused">Pausado</option>
              <option value="archived">Archivado</option>
            </select>
          </form>

          <form action="/clientes" className="space-y-2">
            <input type="hidden" name="q" value={q} />
            <input type="hidden" name="status" value={status} />
            <input type="hidden" name="relation" value={relation} />
            <Label htmlFor="priorityFilter">Prioridad</Label>
            <select
              id="priorityFilter"
              name="priority"
              defaultValue={priority}
              className="flex h-11 w-full items-center rounded-2xl border border-border bg-white/85 px-4 text-sm text-foreground shadow-sm outline-none transition"
            >
              <option value="all">Todas</option>
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
            </select>
          </form>

          <form action="/clientes" className="space-y-2">
            <input type="hidden" name="q" value={q} />
            <input type="hidden" name="status" value={status} />
            <input type="hidden" name="priority" value={priority} />
            <Label htmlFor="relationFilter">Relación</Label>
            <select
              id="relationFilter"
              name="relation"
              defaultValue={relation}
              className="flex h-11 w-full items-center rounded-2xl border border-border bg-white/85 px-4 text-sm text-foreground shadow-sm outline-none transition"
            >
              <option value="all">Todas</option>
              <option value="client">Cliente</option>
              <option value="supplier">Proveedor</option>
              <option value="mixed">Mixto</option>
            </select>
          </form>
        </CardContent>
      </Card>

      <section className="grid gap-6 xl:grid-cols-[0.76fr_1.24fr]">
        <Card className="overflow-hidden border-white/60 bg-white/90">
          <CardHeader>
            <CardTitle>Fichas guardadas</CardTitle>
            <CardDescription>
              Selecciona una ficha para ver actividad, editar notas y revisar el contexto.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {clients.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-border bg-[color:var(--color-panel)] p-6 text-sm leading-7 text-muted-foreground">
                No hay fichas guardadas todavía. Puedes crear una manualmente o
                partir de los contactos detectados más abajo.
              </div>
            ) : null}

            {clients.map((client) => {
              const active = selectedClient?.id === client.id;

              return (
                <Link
                  key={client.id}
                  href={buildClientsHref({
                    q,
                    status,
                    priority,
                    relation,
                    client: client.id,
                  })}
                  className={cn(
                    "block rounded-[28px] border px-5 py-4 transition",
                    active
                      ? "border-[color:var(--color-brand)] bg-[color:rgba(241,246,243,0.88)] shadow-[0_18px_40px_rgba(18,79,73,0.08)]"
                      : "border-white/60 bg-[color:rgba(251,247,241,0.72)] hover:border-[color:rgba(18,79,73,0.18)] hover:bg-white/92",
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]",
                            getRelationTone(client.relation_kind),
                          )}
                        >
                          {clientRelationLabels[client.relation_kind]}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]",
                            getStatusTone(client.status),
                          )}
                        >
                          {clientStatusLabels[client.status]}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]",
                            getPriorityTone(client.priority),
                          )}
                        >
                          Prioridad {clientPriorityLabels[client.priority]}
                        </span>
                      </div>
                      <p className="text-xl font-semibold text-foreground">
                        {client.display_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {client.email || client.phone || client.nif || "Sin identificador principal"}
                      </p>
                    </div>

                    <div className="text-right text-sm text-muted-foreground">
                      <p>Última actividad</p>
                      <p className="mt-2 font-medium text-foreground">
                        {formatDateShort(client.metrics.lastActivityAt)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-4">
                    <div className="rounded-2xl bg-white/80 px-3 py-2">
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                        Facturación
                      </p>
                      <p className="mt-2 text-sm font-medium text-foreground">
                        {client.metrics.invoices} facturas
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white/80 px-3 py-2">
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                        Canales
                      </p>
                      <p className="mt-2 text-sm font-medium text-foreground">
                        {client.metrics.messages + client.metrics.mails} hilos
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white/80 px-3 py-2">
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                        Emitido
                      </p>
                      <p className="mt-2 text-sm font-medium text-foreground">
                        {formatCurrency(client.metrics.totalBilled)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white/80 px-3 py-2">
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                        Pendiente
                      </p>
                      <p className="mt-2 text-sm font-medium text-foreground">
                        {formatCurrency(client.metrics.outstandingAmount)}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-white/60 bg-white/90">
          <CardHeader>
            <CardTitle>
              {selectedClient ? selectedClient.display_name : "Detalle de ficha"}
            </CardTitle>
            <CardDescription>
              {selectedClient
                ? "Contexto operativo unido alrededor de la ficha seleccionada."
                : "Selecciona una ficha guardada para ver su historial unificado."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedClient && selectedSnapshot ? (
              <Tabs defaultValue="summary" className="w-full">
                <TabsList>
                  <TabsTrigger value="summary">Resumen</TabsTrigger>
                  <TabsTrigger value="activity">Actividad</TabsTrigger>
                  <TabsTrigger value="edit">Editar</TabsTrigger>
                </TabsList>

                <TabsContent value="summary" className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                    <div className="rounded-[26px] bg-[color:rgba(241,246,243,0.82)] p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                        Facturación emitida
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">
                        {formatCurrency(selectedSnapshot.metrics.totalBilled)}
                      </p>
                    </div>
                    <div className="rounded-[26px] bg-[color:rgba(241,246,243,0.82)] p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                        Pipeline documental
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">
                        {formatCurrency(selectedSnapshot.metrics.pipelineAmount)}
                      </p>
                    </div>
                    <div className="rounded-[26px] bg-[color:rgba(241,246,243,0.82)] p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                        Saldo pendiente
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">
                        {formatCurrency(selectedSnapshot.metrics.outstandingAmount)}
                      </p>
                    </div>
                    <div className="rounded-[26px] bg-[color:rgba(241,246,243,0.82)] p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                        Facturas vencidas
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">
                        {selectedSnapshot.metrics.overdueInvoices}
                      </p>
                    </div>
                    <div className="rounded-[26px] bg-[color:rgba(241,246,243,0.82)] p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                        Hilos abiertos
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">
                        {selectedSnapshot.metrics.messages + selectedSnapshot.metrics.mails}
                      </p>
                    </div>
                    <div className="rounded-[26px] bg-[color:rgba(241,246,243,0.82)] p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                        Último movimiento
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">
                        {formatDateShort(selectedSnapshot.metrics.lastActivityAt)}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
                    <div className="space-y-4">
                      <div className="rounded-[28px] bg-[color:rgba(251,247,241,0.72)] p-5">
                        <p className="text-sm font-semibold text-foreground">
                          Identificadores
                        </p>
                        <div className="mt-3 space-y-2 text-sm leading-7 text-muted-foreground">
                          <p>Email: {selectedClient.email || "Pendiente"}</p>
                          <p>Teléfono: {selectedClient.phone || "Pendiente"}</p>
                          <p>NIF: {selectedClient.nif || "Pendiente"}</p>
                          <p>Dirección: {selectedClient.address || "Pendiente"}</p>
                        </div>
                      </div>

                      <div className="rounded-[28px] bg-[color:rgba(251,247,241,0.72)] p-5">
                        <p className="text-sm font-semibold text-foreground">Etiquetas</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {selectedClient.tags.length > 0 ? (
                            selectedClient.tags.map((tag) => (
                              <Badge key={tag} variant="secondary">
                                {tag}
                              </Badge>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              Sin etiquetas todavía.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[28px] bg-[color:rgba(255,255,255,0.9)] p-5">
                      <p className="text-sm font-semibold text-foreground">
                        Nota interna actual
                      </p>
                      <p className="mt-3 text-sm leading-7 text-muted-foreground">
                        {selectedClient.notes ||
                          "Todavía no has guardado observaciones internas para esta ficha."}
                      </p>

                      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        <div className="rounded-2xl bg-[color:var(--color-panel)] p-4">
                          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <ReceiptText className="h-4 w-4" />
                            Documentos
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {selectedSnapshot.metrics.documents} presupuestos / albaranes
                          </p>
                        </div>
                        <div className="rounded-2xl bg-[color:var(--color-panel)] p-4">
                          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <MessageSquareText className="h-4 w-4" />
                            Mensajes
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {selectedSnapshot.metrics.messages} conversaciones
                          </p>
                        </div>
                        <div className="rounded-2xl bg-[color:var(--color-panel)] p-4">
                          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <Mail className="h-4 w-4" />
                            Correo
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {selectedSnapshot.metrics.mails} hilos detectados
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="activity" className="space-y-4">
                  {selectedSnapshot.timeline.length === 0 ? (
                    <div className="rounded-[28px] border border-dashed border-border bg-[color:var(--color-panel)] p-6 text-sm leading-7 text-muted-foreground">
                      Esta ficha todavía no tiene actividad enlazada automáticamente.
                    </div>
                  ) : (
                    selectedSnapshot.timeline.map((item) => (
                      <Link
                        key={item.id}
                        href={item.href}
                        className="block rounded-[26px] border border-white/60 bg-[color:rgba(251,247,241,0.72)] p-5 transition hover:bg-white/92"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-base font-semibold text-foreground">
                              {item.title}
                            </p>
                            <p className="text-sm leading-7 text-muted-foreground">
                              {item.detail}
                            </p>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {formatDateShort(item.at)}
                          </p>
                        </div>
                      </Link>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="edit">
                  <form action={demoMode ? undefined : saveClientAction} className="space-y-5">
                    <input type="hidden" name="clientId" value={selectedClient.id} />
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="editDisplayName">Nombre visible</Label>
                        <Input
                          id="editDisplayName"
                          name="displayName"
                          defaultValue={selectedClient.display_name}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="editCompanyName">Empresa</Label>
                        <Input
                          id="editCompanyName"
                          name="companyName"
                          defaultValue={selectedClient.company_name ?? ""}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="editFirstName">Nombre</Label>
                        <Input
                          id="editFirstName"
                          name="firstName"
                          defaultValue={selectedClient.first_name ?? ""}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="editLastName">Apellidos</Label>
                        <Input
                          id="editLastName"
                          name="lastName"
                          defaultValue={selectedClient.last_name ?? ""}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="editEmail">Email</Label>
                        <Input
                          id="editEmail"
                          name="email"
                          defaultValue={selectedClient.email ?? ""}
                          type="email"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="editPhone">Teléfono</Label>
                        <Input
                          id="editPhone"
                          name="phone"
                          defaultValue={selectedClient.phone ?? ""}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="editNif">NIF</Label>
                        <Input
                          id="editNif"
                          name="nif"
                          defaultValue={selectedClient.nif ?? ""}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="editRelationKind">Relación</Label>
                        <select
                          id="editRelationKind"
                          name="relationKind"
                          defaultValue={selectedClient.relation_kind}
                          className="flex h-11 w-full items-center rounded-2xl border border-border bg-white/85 px-4 text-sm text-foreground shadow-sm outline-none transition"
                        >
                          <option value="client">Cliente</option>
                          <option value="supplier">Proveedor</option>
                          <option value="mixed">Mixto</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="editStatus">Estado</Label>
                        <select
                          id="editStatus"
                          name="status"
                          defaultValue={selectedClient.status}
                          className="flex h-11 w-full items-center rounded-2xl border border-border bg-white/85 px-4 text-sm text-foreground shadow-sm outline-none transition"
                        >
                          <option value="lead">Lead</option>
                          <option value="active">Activo</option>
                          <option value="paused">Pausado</option>
                          <option value="archived">Archivado</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="editPriority">Prioridad</Label>
                        <select
                          id="editPriority"
                          name="priority"
                          defaultValue={selectedClient.priority}
                          className="flex h-11 w-full items-center rounded-2xl border border-border bg-white/85 px-4 text-sm text-foreground shadow-sm outline-none transition"
                        >
                          <option value="low">Baja</option>
                          <option value="medium">Media</option>
                          <option value="high">Alta</option>
                        </select>
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="editAddress">Dirección</Label>
                        <Input
                          id="editAddress"
                          name="address"
                          defaultValue={selectedClient.address ?? ""}
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="editTags">Etiquetas</Label>
                        <Input
                          id="editTags"
                          name="tags"
                          defaultValue={selectedClient.tags.join(", ")}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="editNotes">Notas internas</Label>
                      <Textarea
                        id="editNotes"
                        name="notes"
                        defaultValue={selectedClient.notes ?? ""}
                        rows={6}
                      />
                    </div>

                    <SubmitButton
                      pendingLabel="Guardando cambios..."
                      disabled={demoMode}
                      className="w-full sm:w-auto"
                    >
                      Actualizar ficha
                    </SubmitButton>
                  </form>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="rounded-[28px] border border-dashed border-border bg-[color:var(--color-panel)] p-8 text-sm leading-7 text-muted-foreground">
                Crea tu primera ficha o selecciona una de la lista para revisar actividad,
                notas internas y contexto operativo.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div>
          <p className="section-kicker">Contactos detectados</p>
          <h2 className="font-display text-4xl text-foreground">
            Sugerencias creadas a partir de actividad real
          </h2>
          <p className="mt-2 max-w-3xl text-base leading-7 text-muted-foreground">
            FacturaIA analiza tus facturas, chats, correos, documentos y gastos para
            proponerte fichas nuevas. Así puedes empezar el CRM sin cargar todo a mano.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          {detectedSuggestions.length === 0 ? (
            <Card className="xl:col-span-3">
              <CardContent className="rounded-[28px] bg-[color:var(--color-panel)] p-6 text-sm leading-7 text-muted-foreground">
                No hay sugerencias nuevas con los filtros actuales o ya has guardado las fichas detectadas.
              </CardContent>
            </Card>
          ) : null}

          {detectedSuggestions.map((candidate) => (
            <Card key={candidate.key} className="border-white/60 bg-white/88">
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]",
                        getRelationTone(candidate.relationKind),
                      )}
                    >
                      {clientRelationLabels[candidate.relationKind]}
                    </span>
                    <p className="text-xl font-semibold text-foreground">
                      {candidate.displayName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {candidate.email || candidate.phone || candidate.nif || "Sin identificador principal"}
                    </p>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    {formatDateShort(candidate.lastActivityAt)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {candidate.sourceLabels.map((label) => (
                    <Badge key={label} variant="secondary">
                      {label}
                    </Badge>
                  ))}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-[color:var(--color-panel)] px-3 py-3 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">Actividad detectada</p>
                    <p className="mt-2">
                      {candidate.counts.invoices} facturas · {candidate.counts.documents} documentos
                    </p>
                    <p>
                      {candidate.counts.messages} chats · {candidate.counts.mails} correos · {candidate.counts.expenses} gastos
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[color:var(--color-panel)] px-3 py-3 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">Siguiente acción</p>
                    <p className="mt-2 leading-6">
                      Guarda la ficha con un clic y completa prioridad, notas y etiquetas.
                    </p>
                  </div>
                </div>

                <Button asChild className="w-full">
                  <Link
                    href={buildClientsHref({
                      q,
                      status,
                      priority,
                      relation,
                      seedName: candidate.displayName,
                      seedEmail: candidate.email ?? undefined,
                      seedPhone: candidate.phone ?? undefined,
                      seedNif: candidate.nif ?? undefined,
                      seedRelation: candidate.relationKind,
                    })}
                  >
                    Cargar datos en el formulario
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
