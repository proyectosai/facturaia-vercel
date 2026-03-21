import Link from "next/link";
import {
  Activity,
  Download,
  Filter,
  ShieldCheck,
  ShieldAlert,
  UserRoundCog,
} from "lucide-react";

import { requireUser } from "@/lib/auth";
import { isLocalFileMode } from "@/lib/demo";
import {
  getLocalSecurityPolicy,
  getLocalSecurityReadiness,
  listLocalAuditEventsForUser,
} from "@/lib/local-core";
import type { LocalAuditEventRecord, LocalAuditSource } from "@/lib/types";
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

const auditSourceLabels: Record<LocalAuditSource, string> = {
  auth: "Acceso",
  backup: "Backups",
  system: "Sistema",
  profile: "Perfil",
  clients: "CRM",
  expenses: "Gastos",
  invoices: "Facturas",
  collections: "Cobros",
  signatures: "Firmas",
  banking: "Banca",
  messaging: "Mensajería",
};

function getSingleSearchParam(value: string | string[] | undefined, fallback = "") {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }

  return value ?? fallback;
}

function formatAuditAction(action: string) {
  return action
    .split("_")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function formatAuditDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function matchesAuditQuery(event: LocalAuditEventRecord, query: string) {
  if (!query) {
    return true;
  }

  const haystack = [
    event.action,
    event.entity_type,
    event.entity_id ?? "",
    event.actor_id ?? "",
    JSON.stringify(event.context_json ?? {}),
    JSON.stringify(event.after_json ?? {}),
    JSON.stringify(event.before_json ?? {}),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query.toLowerCase());
}

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
    source?: string | string[];
  }>;
}) {
  const user = await requireUser();
  const localMode = isLocalFileMode();
  const params = await searchParams;
  const query = getSingleSearchParam(params.q).trim();
  const sourceFilter = getSingleSearchParam(params.source).trim() as LocalAuditSource | "";
  const securityReadiness = localMode ? getLocalSecurityReadiness() : { ready: true, issues: [] };
  const securityPolicy = localMode ? getLocalSecurityPolicy() : null;
  const allEvents = localMode ? await listLocalAuditEventsForUser(user.id, 5000) : [];
  const filteredEvents = allEvents.filter((event) => {
    if (sourceFilter && event.source !== sourceFilter) {
      return false;
    }

    return matchesAuditQuery(event, query);
  });
  const last24hThreshold = Date.now() - 24 * 60 * 60 * 1000;
  const recentEvents = allEvents.filter(
    (event) => new Date(event.created_at).getTime() >= last24hThreshold,
  );
  const sourceSummary = Object.entries(auditSourceLabels)
    .map(([source, label]) => ({
      source,
      label,
      count: allEvents.filter((event) => event.source === source).length,
    }))
    .filter((item) => item.count > 0);

  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr] xl:items-end">
        <div className="max-w-4xl space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge>Auditoría</Badge>
            <Badge variant="secondary">Despacho y soporte</Badge>
            {localMode ? <Badge variant="secondary">Modo local</Badge> : null}
          </div>
          <div className="space-y-3">
            <p className="section-kicker">Trazabilidad operativa</p>
            <h1 className="font-display text-5xl leading-none tracking-tight text-foreground">
              Revisa quién hizo qué, cuándo y sobre qué entidad.
            </h1>
            <p className="text-lg leading-8 text-muted-foreground">
              Este registro está pensado para instalaciones privadas de despacho:
              ayuda a revisar cambios de facturas, cobros, firmas, banca y restauraciones.
            </p>
          </div>
        </div>

        <Card className="overflow-hidden bg-[linear-gradient(150deg,rgba(255,255,255,0.95),rgba(232,246,242,0.88))]">
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-[24px] bg-white/82 p-4">
              <p className="text-sm text-muted-foreground">Eventos totales</p>
              <p className="mt-2 font-display text-3xl text-foreground">{allEvents.length}</p>
            </div>
            <div className="rounded-[24px] bg-white/82 p-4">
              <p className="text-sm text-muted-foreground">Últimas 24 horas</p>
              <p className="mt-2 font-display text-3xl text-foreground">{recentEvents.length}</p>
            </div>
            <div className="rounded-[24px] bg-white/82 p-4">
              <p className="text-sm text-muted-foreground">Seguridad local</p>
              <p className="mt-2 text-xl font-semibold text-foreground">
                {securityReadiness.ready ? "Lista" : "Pendiente"}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {localMode
                  ? securityReadiness.ready
                    ? "La instalación cumple los requisitos mínimos para operar cerrada."
                    : securityReadiness.issues[0] ?? "Falta configuración de seguridad."
                  : "La auditoría operativa completa se centra en instalaciones locales."}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
        <Card>
          <CardHeader>
            <CardTitle>Filtro y exportación</CardTitle>
            <CardDescription>
              Acota el rastro operativo por origen o busca una entidad concreta.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <form className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="q">Buscar</Label>
                <Input
                  id="q"
                  name="q"
                  defaultValue={query}
                  placeholder="invoice_created, banco, firma, user_id..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="source">Origen</Label>
                <select
                  id="source"
                  name="source"
                  defaultValue={sourceFilter}
                  className="flex h-11 w-full rounded-2xl border border-input bg-background px-4 text-sm shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <option value="">Todos</option>
                  {Object.entries(auditSourceLabels).map(([source, label]) => (
                    <option key={source} value={source}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit" className="w-full">
                <Filter className="h-4 w-4" />
                Aplicar filtro
              </Button>
            </form>

            <div className="rounded-[26px] bg-[color:var(--color-panel)] p-5">
              <p className="text-sm font-medium text-foreground">Descarga operativa</p>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Exporta el log completo en JSON para soporte interno, revisión de incidencias
                o comprobación después de una restauración.
              </p>
              {localMode ? (
                <Button asChild className="mt-4 w-full">
                  <Link href="/api/auditoria/export">
                    <Download className="h-4 w-4" />
                    Descargar log de auditoría
                  </Link>
                </Button>
              ) : (
                <Button className="mt-4 w-full" disabled>
                  <Download className="h-4 w-4" />
                  Descargar log de auditoría
                </Button>
              )}
            </div>

            <div className="rounded-[26px] bg-[color:var(--color-panel)] p-5">
              <div className="flex items-center gap-3">
                {securityReadiness.ready ? (
                  <ShieldCheck className="h-5 w-5 text-[color:var(--color-brand)]" />
                ) : (
                  <ShieldAlert className="h-5 w-5 text-[color:#a14b3a]" />
                )}
                <p className="font-medium text-foreground">Estado de seguridad</p>
              </div>
              {localMode && securityPolicy ? (
                <div className="mt-4 space-y-2 text-sm leading-7 text-muted-foreground">
                  <p>Sesión local: {securityPolicy.sessionMaxAgeHours} horas</p>
                  <p>Intentos máximos: {securityPolicy.loginMaxAttempts}</p>
                  <p>Bloqueo temporal: {securityPolicy.loginLockoutMinutes} minutos</p>
                  {!securityReadiness.ready ? (
                    <ul className="space-y-1 text-[color:#8f2f2f]">
                      {securityReadiness.issues.map((issue) => (
                        <li key={issue}>• {issue}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : (
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  Este panel se vuelve realmente operativo en instalaciones locales privadas.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Resumen por origen</CardTitle>
              <CardDescription>
                Te ayuda a ver dónde se concentra la actividad reciente.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {sourceSummary.length > 0 ? (
                sourceSummary.map((item) => (
                  <div key={item.source} className="rounded-[24px] bg-[color:var(--color-panel)] p-4">
                    <p className="text-sm text-muted-foreground">{item.label}</p>
                    <p className="mt-2 font-display text-3xl text-foreground">{item.count}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-[24px] bg-[color:var(--color-panel)] p-4 text-sm text-muted-foreground sm:col-span-2 xl:col-span-4">
                  Todavía no hay eventos suficientes para mostrar un reparto por origen.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Log operativo</CardTitle>
              <CardDescription>
                {filteredEvents.length} evento(s) tras aplicar el filtro actual.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {filteredEvents.length > 0 ? (
                filteredEvents.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-[26px] border border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.94),rgba(238,247,244,0.88))] p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary">{auditSourceLabels[event.source]}</Badge>
                          <Badge variant="secondary">{event.entity_type}</Badge>
                          <Badge variant="success">{formatAuditAction(event.action)}</Badge>
                        </div>
                        <h2 className="text-lg font-semibold text-foreground">
                          {event.entity_id ? `${event.entity_type} · ${event.entity_id}` : event.action}
                        </h2>
                        <p className="text-sm leading-7 text-muted-foreground">
                          Actor: {event.actor_id ?? event.actor_type} · {formatAuditDate(event.created_at)}
                        </p>
                      </div>
                      <div className="rounded-[20px] bg-white/75 px-4 py-3 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Activity className="h-3.5 w-3.5" />
                          {event.actor_type}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                      <div className="rounded-[22px] bg-white/78 p-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          Antes
                        </p>
                        <pre className="mt-2 overflow-x-auto text-xs leading-6 text-foreground">
                          <code>{JSON.stringify(event.before_json ?? {}, null, 2)}</code>
                        </pre>
                      </div>
                      <div className="rounded-[22px] bg-white/78 p-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          Después
                        </p>
                        <pre className="mt-2 overflow-x-auto text-xs leading-6 text-foreground">
                          <code>{JSON.stringify(event.after_json ?? event.context_json ?? {}, null, 2)}</code>
                        </pre>
                      </div>
                    </div>

                    {event.context_json && Object.keys(event.context_json).length > 0 ? (
                      <div className="mt-4 rounded-[22px] bg-[color:var(--color-panel)] p-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          Contexto
                        </p>
                        <pre className="mt-2 overflow-x-auto text-xs leading-6 text-foreground">
                          <code>{JSON.stringify(event.context_json, null, 2)}</code>
                        </pre>
                      </div>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="rounded-[26px] bg-[color:var(--color-panel)] p-6 text-sm leading-7 text-muted-foreground">
                  {localMode ? (
                    <>
                      No hay eventos que coincidan con el filtro actual. Prueba con otro origen o
                      quita el texto de búsqueda.
                    </>
                  ) : (
                    <>
                      La auditoría operativa completa está orientada al modo local. Aquí no hay
                      eventos disponibles todavía.
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cuándo usar este panel</CardTitle>
              <CardDescription>
                Casos prácticos para un despacho o autónomo con instalación privada.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              {[
                "Revisar quién marcó una factura como cobrada o la reabrió después.",
                "Comprobar qué solicitud de firma se creó, aceptó, rechazó o revocó.",
                "Entender qué importación o conciliación bancaria alteró un expediente.",
              ].map((item) => (
                <div key={item} className="rounded-[24px] bg-[color:var(--color-panel)] p-4">
                  <div className="flex items-start gap-3">
                    <UserRoundCog className="mt-1 h-4 w-4 text-[color:var(--color-brand)]" />
                    <p className="text-sm leading-7 text-muted-foreground">{item}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
