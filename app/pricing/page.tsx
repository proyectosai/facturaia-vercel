import Link from "next/link";
import { ArrowRight, Crown, Sparkles } from "lucide-react";

import { getCurrentAppUser, getOptionalUser } from "@/lib/auth";
import { demoAppUser, isDemoMode } from "@/lib/demo";
import { getEffectivePlan, getPlanLabel } from "@/lib/plans";
import { PricingComparison } from "@/components/pricing-comparison";
import { PricingFaq } from "@/components/pricing-faq";
import { PricingGrid } from "@/components/pricing-grid";
import { RouteToast } from "@/components/route-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; plan?: string; error?: string }>;
}) {
  const demoMode = isDemoMode();
  const user = demoMode ? { id: demoAppUser.id } : await getOptionalUser();
  const appUser = demoMode ? demoAppUser : user ? await getCurrentAppUser() : null;
  const { checkout, plan, error } = await searchParams;
  const currentPlan = getEffectivePlan(appUser);
  const planLabel =
    plan === "basic" || plan === "pro" || plan === "premium"
      ? getPlanLabel(plan)
      : "seleccionado";

  return (
    <main className="page-shell px-2 py-10 sm:py-14">
      <RouteToast
        type="success"
        message={
          checkout === "success"
            ? `Has vuelto desde Stripe. Estamos sincronizando tu suscripción al plan ${planLabel}.`
            : null
        }
      />
      <RouteToast
        type="error"
        message={error ? decodeURIComponent(error) : null}
      />

      <section className="space-y-10">
        {demoMode ? (
          <div className="status-banner">
            Estás viendo los planes en modo demo local. El checkout de Stripe está desactivado hasta conectar las credenciales reales.
          </div>
        ) : null}

        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div className="space-y-5">
            <Badge className="w-fit">Planes 2026</Badge>
            <p className="section-kicker">Precios</p>
            <h1 className="font-display text-5xl leading-none tracking-tight text-foreground sm:text-6xl">
              Tres planes claros para el ciclo real de un autónomo español.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
              Checkout por suscripción con Stripe, modalidad mensual o anual y
              separación real entre Básico, Pro y Premium.
            </p>

            <div className="flex flex-wrap gap-2">
              {[
                "Sin permanencia técnica",
                "Cambio de plan inmediato",
                "Billing unificado en Stripe",
              ].map((item) => (
                <span
                  key={item}
                  className="rounded-full bg-white/75 px-4 py-2 text-sm text-muted-foreground"
                >
                  {item}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href={user ? "/profile?tab=billing" : "/login"}>
                  {user ? "Gestionar mi suscripción" : "Entrar para suscribirme"}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/">Volver al inicio</Link>
              </Button>
            </div>
          </div>

          <Card className="overflow-hidden bg-[linear-gradient(150deg,rgba(255,255,255,0.94),rgba(238,247,244,0.9))]">
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[26px] bg-white/75 p-5">
                <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Sparkles className="h-4 w-4 text-[color:var(--color-brand)]" />
                  Pro
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  IA para descripciones, recordatorios automáticos y XML VeriFactu básico.
                </p>
              </div>
              <div className="rounded-[26px] bg-white/75 p-5">
                <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Crown className="h-4 w-4 text-[color:var(--color-success)]" />
                  Premium
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  IA ilimitada, contratos inteligentes y soporte prioritario.
                </p>
              </div>
              {appUser ? (
                <div className="rounded-[26px] bg-white/75 p-5 md:col-span-2">
                  <p className="text-sm text-muted-foreground">Tu situación actual</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">
                    Plan {getPlanLabel(currentPlan)}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Si cambias de plan desde aquí, la suscripción se actualiza en Stripe
                    y FacturaIA sincroniza el estado después del webhook.
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <PricingGrid user={appUser} />
        <PricingComparison />
        <PricingFaq />
      </section>
    </main>
  );
}
