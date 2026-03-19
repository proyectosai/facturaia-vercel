"use client";

import { useState } from "react";

import { PLAN_ORDER, getEffectivePlan } from "@/lib/plans";
import type { AppUserRecord, BillingInterval } from "@/lib/types";
import { PricingCard } from "@/components/pricing-card";
import { Toggle } from "@/components/ui/toggle";

export function PricingGrid({
  user,
}: {
  user: AppUserRecord | null;
}) {
  const [billingInterval, setBillingInterval] =
    useState<BillingInterval>("monthly");
  const currentPlan = getEffectivePlan(user);

  return (
    <div className="space-y-8">
      <div className="flex justify-center">
        <div className="relative inline-flex rounded-full bg-[color:var(--color-panel)] p-1">
          <div
            className={`absolute inset-y-1 w-[calc(50%-0.25rem)] rounded-full bg-white shadow-sm transition-transform duration-300 ${
              billingInterval === "monthly"
                ? "translate-x-1"
                : "translate-x-[calc(100%+0.25rem)]"
            }`}
          />
          <Toggle
            pressed={billingInterval === "monthly"}
            onPressedChange={() => setBillingInterval("monthly")}
            className="relative z-10 min-w-32"
          >
            Mensual
          </Toggle>
          <Toggle
            pressed={billingInterval === "yearly"}
            onPressedChange={() => setBillingInterval("yearly")}
            className="relative z-10 min-w-32"
          >
            Anual
          </Toggle>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        {PLAN_ORDER.map((planKey) => (
          <PricingCard
            key={`${planKey}-${billingInterval}`}
            planKey={planKey}
            billingInterval={billingInterval}
            isLoggedIn={Boolean(user)}
            currentPlan={currentPlan}
            isCurrentPlan={currentPlan === planKey}
          />
        ))}
      </div>
    </div>
  );
}
