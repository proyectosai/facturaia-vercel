import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  FilePlus2,
  FileSpreadsheet,
  FileText,
  Files,
  ReceiptText,
  Settings2,
  Sparkles,
} from "lucide-react";

import { getCurrentAiUsageSnapshot, getCurrentUsageSnapshot } from "@/lib/billing";
import { demoInvoices, isDemoMode } from "@/lib/demo";
import { getCurrentAppUser, getCurrentProfile, requireUser } from "@/lib/auth";
import {
  getEffectivePlan,
  getPlanLabel,
  hasPlanAccess,
} from "@/lib/plans";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { InvoiceRecord } from "@/lib/types";
import {
  formatCurrency,
  formatDateShort,
  formatInvoiceNumber,
} from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function getUsagePercent(used: number, limit: number | null) {
  if (limit === null || limit === 0) {
    return null;
  }

  return Math.min(100, Math.round((used / limit) * 100));
}

export default async function DashboardPage() {
  const user = await requireUser();
  const appUser = await getCurrentAppUser();
  const profile = await getCurrentProfile();
  const demoMode = isDemoMode();
  const supabase = demoMode ? null : await createServerSupabaseClient();
  const usage = await getCurrentUsageSnapshot(appUser);
  const aiUsage = await getCurrentAiUsageSnapshot(appUser);
  const effectivePlan = getEffectivePlan(appUser);
  const profileChecks = [
    {
      label: "Nombre o razón social",
      complete: Boolean(profile.full_name),
    },
    {
      label: "NIF",
      complete: Boolean(profile.nif),
    },
    {
      label: "Dirección fiscal",
      complete: Boolean(profile.address),
    },
  ];
  const completedProfileFields = profileChecks.filter((item) => item.complete).length;
  const profilePercent = Math.round(
    (completedProfileFields / profileChecks.length) * 100,
  );

  const [
    { count: invoiceCount },
    { data: revenueRows },
    { data: recentInvoices },
  ] = demoMode
    ? [
        { count: demoInvoices.length },
        {
          data: demoInvoices.map((invoice) => ({
            grand_total: invoice.grand_total,
          })),
        },
        {
          data: [...demoInvoices]
            .sort((a, b) => b.issue_date.localeCompare(a.issue_date))
            .slice(0, 5),
        },
      ]
    : await Promise.all([
        supabase!
          .from("invoices")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase!
          .from("invoices")
          .select("grand_total")
          .eq("user_id", user.id),
        supabase!
          .from("invoices")
          .select("*")
          .eq("user_id", user.id)
          .order("issue_date", { ascending: false })
          .limit(5),
      ]);

  const totalBilled = (revenueRows ?? []).reduce(
    (sum, invoice) => sum + Number(invoice.grand_total),
    0,
  );
  const invoiceUsagePercent = getUsagePercent(usage.used, usage.limit);
  const aiUsagePercent = getUsagePercent(aiUsage.used, aiUsage.limit);
  const recommendedAction =
    completedProfileFields < profileChecks.length
      ? {
          title: "Completa tus datos fiscales",
          description:
            "Antes de emitir más facturas, deja tu perfil fiscal redondo para reutilizarlo en todos los PDFs.",
          href: "/profile",
          label: "Ir a Mi Perfil",
        }
      : (invoiceCount ?? 0) === 0
        ? {
            title: "Emite tu primera factura",
            description:
              "Ya tienes la base lista. El siguiente paso natural es generar tu primera factura profesional.",
            href: "/new-invoice",
            label: "Crear factura",
          }
        : effectivePlan === "basic"
          ? {
              title: "Sube a Pro para quitar límites",
              description:
                "Con Pro desbloqueas facturas ilimitadas, más capacidad de IA y una operativa diaria mucho más fluida.",
              href: "/pricing",
              label: "Ver mejora de plan",
            }
          : {
              title: "Mantén el ritmo de este mes",
              description:
                "Tu cuenta ya está operativa. Revisa el historial, reenvía facturas o afina tu perfil cuando lo necesites.",
              href: "/invoices",
              label: "Abrir historial",
            };
  const workflowSteps = [
    {
      step: "01",
      title: "Deja listo tu emisor",
      description:
        completedProfileFields === profileChecks.length
          ? "Tus datos fiscales ya están preparados para reutilizarse en cada factura."
          : "Completa nombre, NIF y dirección para no repetirlos en cada emisión.",
      href: "/profile",
      label:
        completedProfileFields === profileChecks.length
          ? "Revisar perfil"
          : "Completar perfil",
      done: completedProfileFields === profileChecks.length,
    },
    {
      step: "02",
      title: "Emite y valida el flujo",
      description:
        (invoiceCount ?? 0) > 0
          ? "Ya has generado facturas. Usa el historial para descargar, reenviar o revisar importes."
          : "Crea la primera factura para activar de verdad el ciclo operativo y ver métricas reales.",
      href: (invoiceCount ?? 0) > 0 ? "/invoices" : "/new-invoice",
      label: (invoiceCount ?? 0) > 0 ? "Abrir historial" : "Crear primera factura",
      done: (invoiceCount ?? 0) > 0,
    },
    {
      step: "03",
      title: "Sube el nivel de automatización",
      description: hasPlanAccess(appUser, "pro")
        ? "Tu cuenta ya puede apoyarse en IA avanzada y trabajar con un ritmo operativo más alto."
        : "Pro es donde desaparecen los límites de facturas y la IA pasa a ser una ayuda diaria real.",
      href: hasPlanAccess(appUser, "pro") ? "/new-invoice" : "/pricing",
      label: hasPlanAccess(appUser, "pro") ? "Usar IA en facturas" : "Ver mejora a Pro",
      done: hasPlanAccess(appUser, "pro"),
    },
  ];

  return (
    <div className="space-y-8">
      {demoMode ? (
        <div className="status-banner">
          Estás viendo el panel en modo demo local. Puedes revisar interfaz, navegación, PDF y factura pública, pero los cambios no se guardan.
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="overflow-hidden bg-[linear-gradient(155deg,rgba(255,255,255,0.95),rgba(229,245,240,0.92))]">
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Badge
                variant={
                  effectivePlan === "premium"
                    ? "success"
                    : effectivePlan === "pro"
                      ? "default"
                      : "secondary"
                }
              >
                {getPlanLabel(effectivePlan)}
              </Badge>
              <span className="rounded-full bg-white/80 px-4 py-2 text-sm text-muted-foreground">
                Renovación: {formatDateShort(appUser.current_period_end)}
              </span>
            </div>
            <div className="space-y-3">
              <CardTitle className="font-display text-5xl leading-none tracking-tight">
                Hola, {profile.full_name || "autónomo"}.
              </CardTitle>
              <CardDescription className="max-w-2xl text-base leading-7">
                Este panel te dice de un vistazo qué has emitido, cuánto has
                facturado y qué te conviene hacer ahora para mantener la operativa al día.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[26px] bg-white/80 p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">Facturas este mes</p>
                  <p className="text-sm font-semibold text-foreground">
                    {usage.limit === null ? "Sin límite" : `${usage.used}/${usage.limit}`}
                  </p>
                </div>
                {invoiceUsagePercent !== null ? (
                  <>
                    <div className="mt-4 h-2 rounded-full bg-[color:var(--color-panel)]">
                      <div
                        className="h-full rounded-full bg-[color:var(--color-brand)]"
                        style={{ width: `${invoiceUsagePercent}%` }}
                      />
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">
                      Te quedan {usage.remaining} facturas disponibles este mes.
                    </p>
                  </>
                ) : (
                  <p className="mt-4 text-sm text-muted-foreground">
                    Estás en un plan con facturación ilimitada.
                  </p>
                )}
              </div>

              <div className="rounded-[26px] bg-white/80 p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">IA hoy</p>
                  <p className="text-sm font-semibold text-foreground">
                    {aiUsage.limit === null ? "Ilimitada" : `${aiUsage.used}/${aiUsage.limit}`}
                  </p>
                </div>
                {aiUsagePercent !== null ? (
                  <>
                    <div className="mt-4 h-2 rounded-full bg-[color:var(--color-panel)]">
                      <div
                        className="h-full rounded-full bg-[color:var(--color-success)]"
                        style={{ width: `${aiUsagePercent}%` }}
                      />
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">
                      Restan {aiUsage.remaining} mejoras con IA durante el día de hoy.
                    </p>
                  </>
                ) : (
                  <p className="mt-4 text-sm text-muted-foreground">
                    Tu plan actual no limita las mejoras de IA.
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/new-invoice">
                  <FilePlus2 className="h-4 w-4" />
                  Nueva Factura
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/invoices">
                  <Files className="h-4 w-4" />
                  Ver historial
                </Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/documents-ai">
                  <FileText className="h-4 w-4" />
                  Documentos IA
                </Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/pricing">
                  <Sparkles className="h-4 w-4" />
                  Ver planes
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Siguiente paso recomendado</CardTitle>
            <CardDescription>
              FacturaIA prioriza lo que más impacto tiene ahora mismo en tu operativa.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-[26px] bg-[color:var(--color-panel)] p-5">
              <p className="section-kicker">Prioridad</p>
              <h2 className="mt-3 font-display text-3xl text-foreground">
                {recommendedAction.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {recommendedAction.description}
              </p>
              <Button className="mt-5" asChild>
                <Link href={recommendedAction.href}>
                  {recommendedAction.label}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground">
                Estado del perfil fiscal
              </p>
              <div className="h-2 rounded-full bg-[color:var(--color-panel)]">
                <div
                  className="h-full rounded-full bg-[color:var(--color-brand)]"
                  style={{ width: `${profilePercent}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {completedProfileFields} de {profileChecks.length} campos principales completados.
              </p>

              <div className="space-y-2">
                {profileChecks.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 rounded-[22px] bg-white/80 px-4 py-3 text-sm"
                  >
                    {item.complete ? (
                      <CheckCircle2 className="h-4 w-4 text-[color:var(--color-success)]" />
                    ) : (
                      <CircleDashed className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-foreground">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            icon: ReceiptText,
            label: "Facturas emitidas",
            value: String(invoiceCount ?? 0),
            foot: "Acumulado total",
          },
          {
            icon: FileSpreadsheet,
            label: "Importe total",
            value: formatCurrency(totalBilled),
            foot: "Volumen emitido",
          },
          {
            icon: Sparkles,
            label: "IA disponible hoy",
            value:
              aiUsage.limit === null
                ? "Ilimitada"
                : `${aiUsage.remaining}/${aiUsage.limit}`,
            foot: "Capacidad restante",
          },
          {
            icon: Settings2,
            label: "Perfil fiscal",
            value: `${profilePercent}%`,
            foot: "Preparación actual",
          },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <Card key={item.label}>
              <CardContent className="mt-0 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <p className="mt-2 font-display text-4xl text-foreground">
                    {item.value}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">{item.foot}</p>
                </div>
                <div className="rounded-2xl bg-[color:var(--color-brand-soft)] p-3 text-[color:var(--color-brand)]">
                  <Icon className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="section-kicker">Ruta recomendada</p>
            <h2 className="font-display text-4xl text-foreground">
              Una cuenta operativa en tres pasos claros
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Este bloque no resume datos: te ayuda a saber qué hacer a continuación para que FacturaIA se note de verdad en el día a día.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          {workflowSteps.map((item) => (
            <Card
              key={item.step}
              className={
                item.done
                  ? "border-[color:var(--color-brand-soft)] bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(230,245,241,0.9))]"
                  : ""
              }
            >
              <CardContent className="mt-0 space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="rounded-full bg-[color:var(--color-panel)] px-4 py-2 text-sm font-semibold text-foreground">
                    Paso {item.step}
                  </div>
                  {item.done ? (
                    <Badge variant="success">Hecho</Badge>
                  ) : (
                    <Badge variant="secondary">Pendiente</Badge>
                  )}
                </div>

                <div>
                  <h3 className="text-2xl font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {item.description}
                  </p>
                </div>

                <Button
                  variant={item.done ? "outline" : "default"}
                  className="w-full"
                  asChild
                >
                  <Link href={item.href}>
                    {item.label}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <CardHeader>
            <CardTitle>Operativa de la cuenta</CardTitle>
            <CardDescription>
              Resumen simple de lo que ya está listo y lo que sigue pendiente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              {
                title: "Facturación",
                description:
                  usage.limit === null
                    ? "Tu plan permite emitir sin límite mensual."
                    : `Has consumido ${usage.used} de ${usage.limit} facturas este mes.`,
                ready: !usage.blocked,
              },
              {
                title: "Asistente IA",
                description: hasPlanAccess(appUser, "basic")
                  ? aiUsage.limit === null
                    ? "La mejora de descripciones está activa sin límite diario."
                    : `Hoy llevas ${aiUsage.used} mejoras y te restan ${aiUsage.remaining}.`
                  : "Activa al menos un plan Básico para usar la IA local en descripciones.",
                ready: hasPlanAccess(appUser, "basic") && !aiUsage.blocked,
              },
              {
                title: "Perfil de emisor",
                description:
                  completedProfileFields === profileChecks.length
                    ? "Tus datos fiscales principales ya están completos."
                    : "Aún faltan datos fiscales para dejar el flujo más ágil.",
                ready: completedProfileFields === profileChecks.length,
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-[26px] bg-[color:var(--color-panel)] p-5"
              >
                <div className="flex items-start gap-3">
                  {item.ready ? (
                    <CheckCircle2 className="mt-1 h-5 w-5 text-[color:var(--color-success)]" />
                  ) : (
                    <CircleDashed className="mt-1 h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-semibold text-foreground">{item.title}</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <CardTitle>Últimas facturas</CardTitle>
              <CardDescription>
                Revisa actividad reciente y salta al historial completo cuando lo necesites.
              </CardDescription>
            </div>
            <Button variant="ghost" asChild>
              <Link href="/invoices">Ver todas</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {(recentInvoices as InvoiceRecord[] | null)?.length ? (
              (recentInvoices as InvoiceRecord[]).map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex flex-col gap-4 rounded-[28px] border border-white/60 bg-white/75 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm uppercase tracking-[0.16em] text-muted-foreground">
                      {formatInvoiceNumber(invoice.invoice_number)}
                    </p>
                    <h3 className="mt-2 text-xl font-semibold text-foreground">
                      {invoice.client_name}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {invoice.client_email}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="font-display text-3xl text-[color:var(--color-brand)]">
                      {formatCurrency(Number(invoice.grand_total))}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatDateShort(invoice.issue_date)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[28px] bg-[color:var(--color-panel)] p-6">
                <p className="text-muted-foreground">
                  Aún no has emitido ninguna factura. Empieza creando la primera
                  desde el formulario y el panel empezará a darte contexto real.
                </p>
                <Button className="mt-4" asChild>
                  <Link href="/new-invoice">
                    <FilePlus2 className="h-4 w-4" />
                    Crear primera factura
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
