"use client";

import Link from "next/link";
import { CheckCircle2, Sparkles } from "lucide-react";

import { createCheckoutSessionAction } from "@/lib/actions/stripe";
import { PLAN_DEFINITIONS, getPlanPrice, getYearlySavings } from "@/lib/plans";
import type { BillingInterval, PlanKey } from "@/lib/types";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function PricingCard({
  planKey,
  billingInterval,
  isLoggedIn,
  currentPlan,
  isCurrentPlan,
}: {
  planKey: Exclude<PlanKey, "free">;
  billingInterval: BillingInterval;
  isLoggedIn: boolean;
  currentPlan: PlanKey;
  isCurrentPlan: boolean;
}) {
  const plan = PLAN_DEFINITIONS[planKey];
  const amount = getPlanPrice(planKey, billingInterval);
  const savings = getYearlySavings(planKey);
  const isHighlighted = planKey === "pro";
  const monthlyEquivalent =
    billingInterval === "yearly" ? (amount / 12).toFixed(2) : null;

  return (
    <Card
      className={
        isHighlighted
          ? "relative overflow-hidden border-[color:var(--color-brand-soft)] bg-[linear-gradient(160deg,rgba(255,255,255,0.96),rgba(230,245,241,0.92))]"
          : "relative overflow-hidden"
      }
    >
      {isHighlighted ? (
        <div className="absolute right-4 top-4">
          <Badge>Más elegido</Badge>
        </div>
      ) : null}

      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>{plan.name}</CardTitle>
            <CardDescription className="mt-2">{plan.description}</CardDescription>
          </div>
          <Badge variant={plan.tone}>{plan.blurb}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="flex items-end gap-2">
          <span className="font-display text-6xl text-foreground">{amount}€</span>
          <span className="pb-2 text-sm text-muted-foreground">
            /{billingInterval === "monthly" ? "mes" : "año"}
          </span>
        </div>

        {monthlyEquivalent ? (
          <p className="text-sm text-muted-foreground">
            Equivale a {monthlyEquivalent}€/mes con pago anual.
          </p>
        ) : null}

        {billingInterval === "yearly" ? (
          <div className="rounded-full bg-[color:var(--color-success-soft)] px-4 py-2 text-sm font-semibold text-[color:var(--color-success)]">
            Ahorra {savings}€
          </div>
        ) : null}

        <div className="rounded-[24px] bg-[color:var(--color-panel)] px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Ideal para
          </p>
          <p className="mt-2 text-sm leading-6 text-foreground/90">
            {plan.idealFor}
          </p>
        </div>

        <ul className="space-y-3 text-sm leading-6 text-foreground/90">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-[color:var(--color-success)]" />
              {feature}
            </li>
          ))}
        </ul>

        {currentPlan !== "free" && isCurrentPlan ? (
          <div className="rounded-[24px] bg-[color:var(--color-panel)] px-4 py-3 text-sm text-muted-foreground">
            Este es tu plan actual.
          </div>
        ) : null}

        <div className="rounded-[24px] border border-dashed border-[color:var(--color-brand-soft)] bg-white/70 px-4 py-3 text-sm text-muted-foreground">
          Sin permanencia anual forzosa y gestión posterior desde Stripe.
        </div>
      </CardContent>

      <CardFooter className="flex-col items-stretch gap-3">
        {isLoggedIn ? (
          isCurrentPlan ? (
            <div className="inline-flex items-center justify-center gap-2 rounded-full bg-[color:var(--color-brand)] px-5 py-3 text-sm font-semibold text-[color:var(--color-brand-foreground)]">
              <Sparkles className="h-4 w-4" />
              Plan activo
            </div>
          ) : (
            <form action={createCheckoutSessionAction} className="w-full">
              <input type="hidden" name="planKey" value={planKey} />
              <input type="hidden" name="billingInterval" value={billingInterval} />
              <SubmitButton className="w-full" pendingLabel="Abriendo Stripe...">
                Elegir plan
              </SubmitButton>
            </form>
          )
        ) : (
          <Link
            href="/login"
            className="inline-flex h-11 items-center justify-center rounded-full bg-[color:var(--color-brand)] px-5 text-sm font-semibold text-[color:var(--color-brand-foreground)]"
          >
            Entrar para suscribirme
          </Link>
        )}
      </CardFooter>
    </Card>
  );
}
