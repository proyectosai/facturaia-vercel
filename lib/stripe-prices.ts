import { getStripeEnv } from "@/lib/env";
import {
  PLAN_DEFINITIONS,
  PLAN_ORDER,
  getStripePriceEnvKey,
} from "@/lib/plans";
import type { BillingInterval, PlanKey } from "@/lib/types";

export function getPriceIdForPlan(
  plan: Exclude<PlanKey, "free">,
  interval: BillingInterval,
) {
  const stripeEnv = getStripeEnv();
  return stripeEnv[getStripePriceEnvKey(plan, interval)];
}

export function getPlanByPriceId(priceId: string | null | undefined) {
  if (!priceId) {
    return null;
  }

  const stripeEnv = getStripeEnv();

  return (
    PLAN_ORDER.find((plan) => {
      const definition = PLAN_DEFINITIONS[plan];
      return (
        stripeEnv[definition.monthlyPriceKey] === priceId ||
        stripeEnv[definition.yearlyPriceKey] === priceId
      );
    }) ?? null
  );
}

export function getIntervalByPriceId(
  priceId: string | null | undefined,
): BillingInterval | null {
  if (!priceId) {
    return null;
  }

  const stripeEnv = getStripeEnv();

  for (const plan of PLAN_ORDER) {
    const definition = PLAN_DEFINITIONS[plan];

    if (stripeEnv[definition.monthlyPriceKey] === priceId) {
      return "monthly";
    }

    if (stripeEnv[definition.yearlyPriceKey] === priceId) {
      return "yearly";
    }
  }

  return null;
}
