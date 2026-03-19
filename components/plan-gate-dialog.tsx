"use client";

import { Crown, Sparkles, Zap } from "lucide-react";

import { createCheckoutSessionAction } from "@/lib/actions/stripe";
import { PLAN_DEFINITIONS, getUpgradeCopy } from "@/lib/plans";
import type { BillingInterval, PlanKey } from "@/lib/types";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function PlanGateDialog({
  open,
  onOpenChange,
  requiredPlan,
  billingInterval = "monthly",
  reason,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requiredPlan: Exclude<PlanKey, "free">;
  billingInterval?: BillingInterval;
  reason?: string;
}) {
  const copy = getUpgradeCopy(requiredPlan);
  const plan = PLAN_DEFINITIONS[requiredPlan];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <Badge className="w-fit" variant={plan.tone}>
            Función bloqueada
          </Badge>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>
            {reason || copy.description}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 rounded-[28px] bg-[color:var(--color-panel)] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-display text-3xl text-foreground">{plan.name}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {plan.blurb}
              </p>
            </div>
            <div className="rounded-2xl bg-white/80 p-3 text-[color:var(--color-brand)]">
              {requiredPlan === "premium" ? (
                <Crown className="h-5 w-5" />
              ) : requiredPlan === "pro" ? (
                <Sparkles className="h-5 w-5" />
              ) : (
                <Zap className="h-5 w-5" />
              )}
            </div>
          </div>

          <ul className="mt-5 space-y-2 text-sm text-foreground/90">
            {plan.features.map((feature) => (
              <li key={feature}>- {feature}</li>
            ))}
          </ul>
        </div>

        <DialogFooter>
          <Button variant="ghost" type="button" onClick={() => onOpenChange(false)}>
            Seguir más tarde
          </Button>
          <form action={createCheckoutSessionAction}>
            <input type="hidden" name="planKey" value={requiredPlan} />
            <input type="hidden" name="billingInterval" value={billingInterval} />
            <SubmitButton pendingLabel="Abriendo Stripe...">
              Elegir plan
            </SubmitButton>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
