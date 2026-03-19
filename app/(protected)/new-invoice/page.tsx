import { getCurrentAppUser, getCurrentProfile } from "@/lib/auth";
import { getCurrentAiUsageSnapshot, getCurrentUsageSnapshot } from "@/lib/billing";
import { isDemoMode } from "@/lib/demo";
import { getEffectivePlan, getPlanLabel } from "@/lib/plans";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { InvoiceLegalReference } from "@/components/invoices/invoice-legal-reference";
import { RouteToast } from "@/components/route-toast";
import { InvoiceForm } from "@/components/invoices/invoice-form";
import { NewInvoiceChecklist } from "@/components/invoices/new-invoice-checklist";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const appUser = await getCurrentAppUser();
  const profile = await getCurrentProfile();
  const demoMode = isDemoMode();
  const usage = await getCurrentUsageSnapshot(appUser);
  const aiUsage = await getCurrentAiUsageSnapshot(appUser);
  const effectivePlan = getEffectivePlan(appUser);
  const { error } = await searchParams;
  type StatusMessage = {
    tone: "default" | "error";
    message: string;
  };
  const statusMessages = [
    demoMode
      ? {
          tone: "default" as const,
          message:
            "Estás en modo demo local. Puedes editar el formulario, probar la mejora con IA y revisar la vista previa, pero la factura no se guardará.",
        }
      : null,
    error
      ? {
          tone: "error" as const,
          message: decodeURIComponent(error),
        }
      : null,
    effectivePlan === "free"
      ? {
          tone: "error" as const,
          message: "Necesitas al menos un plan Básico activo para emitir facturas.",
        }
      : null,
    usage.blocked
      ? {
          tone: "error" as const,
          message:
            "Has alcanzado el límite mensual de tu plan actual. Actualiza a Pro o Premium para seguir.",
        }
      : null,
    aiUsage.blocked
      ? {
          tone: "error" as const,
          message:
            "Has alcanzado el límite diario de mejoras con IA de tu plan actual. Vuelve mañana o actualiza tu suscripción.",
        }
      : null,
  ].filter((item): item is StatusMessage => Boolean(item));

  return (
    <div className="space-y-8">
      <RouteToast
        type="error"
        message={error ? decodeURIComponent(error) : null}
      />

      <div className="max-w-4xl space-y-3">
        <p className="section-kicker">Nueva factura</p>
        <h1 className="font-display text-5xl leading-none tracking-tight text-foreground">
          Emite una factura mejor presentada y con menos dudas en el camino.
        </h1>
        <p className="text-lg leading-8 text-muted-foreground">
          El flujo sigue guardando el emisor en tu perfil y generando numeración automática, pero ahora separa mejor edición, checklist operativo y referencias legales oficiales.
        </p>
      </div>

      <Card className="overflow-hidden border-white/60 bg-[radial-gradient(circle_at_top_left,rgba(233,244,240,0.96),rgba(255,255,255,0.93)_40%,rgba(244,233,215,0.76)_100%)]">
        <CardContent className="grid gap-6 p-6 sm:p-8 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge>Cabina de emisión</Badge>
              <Badge variant="secondary">
                {effectivePlan === "free" ? "Sin plan" : getPlanLabel(effectivePlan)}
              </Badge>
              {demoMode ? <Badge variant="secondary">Modo demo</Badge> : null}
            </div>
            <h2 className="font-display text-4xl leading-none tracking-tight text-foreground">
              Un espacio más claro para redactar, revisar y validar antes de enviar.
            </h2>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground">
              Usa la pestaña de edición para construir la factura, la de checklist para repasar el flujo y la de legislación para abrir fuentes oficiales sin salir a buscar a ciegas.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-3">
            <div className="rounded-[26px] bg-white/82 p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Facturas este mes
              </p>
              <p className="mt-3 text-3xl font-semibold text-foreground">
                {usage.used}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {usage.limit === null
                  ? "Sin límite por plan."
                  : `${usage.remaining} restantes en el periodo actual.`}
              </p>
            </div>

            <div className="rounded-[26px] bg-white/82 p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                IA hoy
              </p>
              <p className="mt-3 text-3xl font-semibold text-foreground">
                {aiUsage.used}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {aiUsage.limit === null
                  ? "Capacidad ilimitada."
                  : `${aiUsage.remaining} mejoras disponibles hoy.`}
              </p>
            </div>

            <div className="rounded-[26px] bg-[color:rgba(19,45,52,0.94)] p-4 text-white shadow-lg">
              <p className="text-xs uppercase tracking-[0.16em] text-white/70">
                Estado
              </p>
              <p className="mt-3 text-xl font-semibold text-white">
                {statusMessages.length === 0 ? "Todo listo" : `${statusMessages.length} aviso${statusMessages.length > 1 ? "s" : ""}`}
              </p>
              <p className="mt-2 text-sm leading-6 text-white/82">
                Aquí tendrás visibles los bloqueos de plan, demo o capacidad antes de generar.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="editor" className="space-y-6">
        <TabsList className="grid w-full max-w-3xl grid-cols-1 gap-1 rounded-[28px] sm:grid-cols-3">
          <TabsTrigger value="editor">Editor de factura</TabsTrigger>
          <TabsTrigger value="checklist">Checklist</TabsTrigger>
          <TabsTrigger value="legal">Legislación oficial</TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="space-y-4">
          {statusMessages.map((item) => (
            <div
              key={item.message}
              className={item.tone === "error" ? "status-banner error" : "status-banner"}
            >
              {item.message}
            </div>
          ))}

          <InvoiceForm
            appUser={appUser}
            profile={profile}
            usage={usage}
            aiUsage={aiUsage}
            demoMode={demoMode}
          />
        </TabsContent>

        <TabsContent value="checklist">
          <NewInvoiceChecklist />
        </TabsContent>

        <TabsContent value="legal">
          <InvoiceLegalReference />
        </TabsContent>
      </Tabs>
    </div>
  );
}
