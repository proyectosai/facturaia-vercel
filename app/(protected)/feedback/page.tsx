import {
  Lightbulb,
  MessageCircleWarning,
  Milestone,
  Sparkles,
} from "lucide-react";

import {
  createFeedbackEntryAction,
  updateFeedbackStatusAction,
} from "@/lib/actions/feedback";
import { requireUser } from "@/lib/auth";
import { isDemoMode } from "@/lib/demo";
import {
  feedbackSeverityLabels,
  feedbackSourceLabels,
  feedbackStatusLabels,
  getFeedbackEntriesForUser,
  getFeedbackSummary,
} from "@/lib/feedback";
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

function getSingleSearchParam(value: string | string[] | undefined, fallback = "") {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }

  return value ?? fallback;
}

export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{
    created?: string | string[];
    updated?: string | string[];
    error?: string | string[];
  }>;
}) {
  const user = await requireUser();
  const demoMode = isDemoMode();
  const params = await searchParams;
  const created = getSingleSearchParam(params.created);
  const updated = getSingleSearchParam(params.updated);
  const error = getSingleSearchParam(params.error);
  const entries = await getFeedbackEntriesForUser(user.id);
  const summary = getFeedbackSummary(entries);

  return (
    <div className="space-y-8">
      <RouteToast
        type="success"
        message={created ? "Entrada de feedback guardada correctamente." : null}
      />
      <RouteToast
        type="success"
        message={updated ? "Estado del feedback actualizado." : null}
      />
      <RouteToast type="error" message={error ? decodeURIComponent(error) : null} />

      <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr] xl:items-end">
        <div className="max-w-4xl space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge>Feedback</Badge>
            <Badge variant="secondary">Pilotos y uso real</Badge>
            {demoMode ? <Badge variant="secondary">Modo demo</Badge> : null}
          </div>
          <div className="space-y-3">
            <p className="section-kicker">Escucha del producto</p>
            <h1 className="font-display text-5xl leading-none tracking-tight text-foreground">
              Convierte observaciones reales en backlog accionable dentro de tu propia instalación.
            </h1>
            <p className="text-lg leading-8 text-muted-foreground">
              Usa esta bandeja para anotar feedback propio o de pilotos, priorizarlo
              y no perder decisiones de producto entre correos, mensajes y llamadas.
            </p>
          </div>
        </div>

        <Card className="overflow-hidden bg-[linear-gradient(150deg,rgba(255,255,255,0.95),rgba(232,246,242,0.88))]">
          <CardContent className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-[24px] bg-white/82 p-4">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="mt-2 font-display text-3xl text-foreground">{summary.total}</p>
            </div>
            <div className="rounded-[24px] bg-white/82 p-4">
              <p className="text-sm text-muted-foreground">Abiertas</p>
              <p className="mt-2 font-display text-3xl text-foreground">{summary.open}</p>
            </div>
            <div className="rounded-[24px] bg-white/82 p-4">
              <p className="text-sm text-muted-foreground">Planificadas</p>
              <p className="mt-2 font-display text-3xl text-foreground">{summary.planned}</p>
            </div>
            <div className="rounded-[24px] bg-white/82 p-4">
              <p className="text-sm text-muted-foreground">Alta prioridad</p>
              <p className="mt-2 font-display text-3xl text-foreground">{summary.high}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <Card>
          <CardHeader>
            <CardTitle>Nueva entrada</CardTitle>
            <CardDescription>
              Anota problemas, fricciones, ideas o peticiones que aparezcan en uso real.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={demoMode ? undefined : createFeedbackEntryAction} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="sourceType">Origen</Label>
                  <select
                    id="sourceType"
                    name="sourceType"
                    defaultValue="pilot"
                    className="flex h-11 w-full rounded-2xl border border-input bg-background px-4 text-sm shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <option value="pilot">Piloto</option>
                    <option value="self">Interno</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="severity">Prioridad</Label>
                  <select
                    id="severity"
                    name="severity"
                    defaultValue="medium"
                    className="flex h-11 w-full rounded-2xl border border-input bg-background px-4 text-sm shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="moduleKey">Área o módulo</Label>
                <Input id="moduleKey" name="moduleKey" placeholder="cobros, facturae, OCR, onboarding..." />
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input id="title" name="title" placeholder="Qué está fallando o qué hace falta" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Detalle</Label>
                <Textarea
                  id="message"
                  name="message"
                  rows={6}
                  placeholder="Describe el contexto, el problema detectado y qué debería ocurrir."
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="reporterName">Nombre del reportero</Label>
                  <Input id="reporterName" name="reporterName" placeholder="Opcional" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Email de contacto</Label>
                  <Input id="contactEmail" name="contactEmail" type="email" placeholder="Opcional" />
                </div>
              </div>

              <SubmitButton
                className="w-full"
                pendingLabel="Guardando feedback..."
                disabled={demoMode}
              >
                <Lightbulb className="h-4 w-4" />
                Guardar feedback
              </SubmitButton>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bandeja de feedback</CardTitle>
            <CardDescription>
              Lista viva de observaciones ya recogidas y su estado actual.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {entries.length > 0 ? (
              entries.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-[26px] border border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.94),rgba(238,247,244,0.88))] p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">{feedbackSourceLabels[entry.source_type]}</Badge>
                        <Badge variant="secondary">{entry.module_key}</Badge>
                        <Badge
                          variant={entry.severity === "high" ? "success" : "secondary"}
                          className={
                            entry.severity === "high"
                              ? "bg-[color:rgba(180,68,54,0.14)] text-[color:#8f2f2f]"
                              : undefined
                          }
                        >
                          {feedbackSeverityLabels[entry.severity]}
                        </Badge>
                        <Badge variant="success">{feedbackStatusLabels[entry.status]}</Badge>
                      </div>
                      <h2 className="text-xl font-semibold text-foreground">{entry.title}</h2>
                      <p className="text-sm leading-7 text-muted-foreground">{entry.message}</p>
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                        {entry.reporter_name ?? "Sin nombre"}{entry.contact_email ? ` · ${entry.contact_email}` : ""}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 sm:min-w-[220px]">
                      <form action={demoMode ? undefined : updateFeedbackStatusAction}>
                        <input type="hidden" name="entryId" value={entry.id} />
                        <input type="hidden" name="status" value="reviewed" />
                        <Button variant="outline" className="w-full" disabled={demoMode || entry.status === "reviewed"}>
                          <MessageCircleWarning className="h-4 w-4" />
                          Marcar revisada
                        </Button>
                      </form>
                      <form action={demoMode ? undefined : updateFeedbackStatusAction}>
                        <input type="hidden" name="entryId" value={entry.id} />
                        <input type="hidden" name="status" value="planned" />
                        <Button variant="outline" className="w-full" disabled={demoMode || entry.status === "planned"}>
                          <Milestone className="h-4 w-4" />
                          Pasar a planificada
                        </Button>
                      </form>
                      <form action={demoMode ? undefined : updateFeedbackStatusAction}>
                        <input type="hidden" name="entryId" value={entry.id} />
                        <input type="hidden" name="status" value="resolved" />
                        <Button variant="outline" className="w-full" disabled={demoMode || entry.status === "resolved"}>
                          <Sparkles className="h-4 w-4" />
                          Marcar resuelta
                        </Button>
                      </form>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[26px] border border-dashed border-border/70 bg-white/70 p-5 text-sm leading-7 text-muted-foreground">
                Todavía no hay feedback registrado. Empieza anotando las fricciones que detectes en uso real para convertirlas en mejoras priorizadas.
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
