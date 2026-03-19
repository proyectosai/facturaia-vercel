import type {
  AppUserRecord,
  BillingInterval,
  PlanKey,
  SubscriptionStatus,
} from "@/lib/types";

type PlanDefinition = {
  key: Exclude<PlanKey, "free">;
  name: string;
  description: string;
  idealFor: string;
  monthlyPrice: number;
  yearlyPrice: number;
  monthlyPriceKey: StripePriceEnvKey;
  yearlyPriceKey: StripePriceEnvKey;
  invoiceLimit: number | null;
  tone:
    | "default"
    | "secondary"
    | "success";
  blurb: string;
  features: string[];
};

export type StripePriceEnvKey =
  | "STRIPE_PRICE_BASIC_MONTHLY"
  | "STRIPE_PRICE_BASIC_YEARLY"
  | "STRIPE_PRICE_PRO_MONTHLY"
  | "STRIPE_PRICE_PRO_YEARLY"
  | "STRIPE_PRICE_PREMIUM_MONTHLY"
  | "STRIPE_PRICE_PREMIUM_YEARLY";

export const PLAN_ORDER: Exclude<PlanKey, "free">[] = [
  "basic",
  "pro",
  "premium",
];

export const PLAN_DEFINITIONS: Record<
  Exclude<PlanKey, "free">,
  PlanDefinition
> = {
  basic: {
    key: "basic",
    name: "Básico",
    description: "Para autónomos que quieren emitir y cobrar sin complicaciones.",
    idealFor: "Volumen contenido, pocos clientes al mes y necesidad de un flujo limpio.",
    monthlyPrice: 9,
    yearlyPrice: 89,
    monthlyPriceKey: "STRIPE_PRICE_BASIC_MONTHLY",
    yearlyPriceKey: "STRIPE_PRICE_BASIC_YEARLY",
    invoiceLimit: 20,
    tone: "secondary",
    blurb: "20 facturas al mes y 5 mejoras IA al día.",
    features: [
      "20 facturas/mes",
      "PDF básico",
      "5 mejoras IA/día para descripciones y borradores",
      "Historial de facturas",
    ],
  },
  pro: {
    key: "pro",
    name: "Pro",
    description: "El punto ideal para operar a diario con automatización real.",
    idealFor: "Freelancers y autónomos con trabajo recurrente y necesidad de velocidad.",
    monthlyPrice: 15,
    yearlyPrice: 149,
    monthlyPriceKey: "STRIPE_PRICE_PRO_MONTHLY",
    yearlyPriceKey: "STRIPE_PRICE_PRO_YEARLY",
    invoiceLimit: null,
    tone: "default",
    blurb: "Facturas ilimitadas y 50 mejoras IA al día.",
    features: [
      "Facturas ilimitadas",
      "50 mejoras IA/día para descripciones y documentos",
      "IA para contratos y presupuestos",
      "Recordatorios automáticos",
      "Export XML VeriFactu básico",
    ],
  },
  premium: {
    key: "premium",
    name: "Premium",
    description: "Para quienes quieren delegar más trabajo operativo en la IA.",
    idealFor: "Perfiles intensivos, alto ritmo mensual y prioridad en soporte.",
    monthlyPrice: 29,
    yearlyPrice: 279,
    monthlyPriceKey: "STRIPE_PRICE_PREMIUM_MONTHLY",
    yearlyPriceKey: "STRIPE_PRICE_PREMIUM_YEARLY",
    invoiceLimit: null,
    tone: "success",
    blurb: "Todo Pro, más IA ilimitada y soporte prioritario.",
    features: [
      "Todo Pro",
      "IA ilimitada para documentos",
      "Contratos inteligentes",
      "Soporte prioritario",
    ],
  },
};

const PLAN_RANK: Record<PlanKey, number> = {
  free: 0,
  basic: 1,
  pro: 2,
  premium: 3,
};

const ACTIVE_STATUSES: SubscriptionStatus[] = ["active", "trialing", "past_due"];

export function isSubscriptionActive(status: string | null | undefined) {
  return ACTIVE_STATUSES.includes((status ?? "inactive") as SubscriptionStatus);
}

export function getEffectivePlan(user: AppUserRecord | null | undefined): PlanKey {
  if (!user) {
    return "free";
  }

  return isSubscriptionActive(user.plan_status) ? user.current_plan : "free";
}

export function getPlanLabel(plan: PlanKey) {
  return {
    free: "Sin plan",
    basic: "Básico",
    pro: "Pro",
    premium: "Premium",
  }[plan];
}

export function getPlanRank(plan: PlanKey) {
  return PLAN_RANK[plan];
}

export function hasPlanAccess(
  user: AppUserRecord | null | undefined,
  requiredPlan: Exclude<PlanKey, "free">,
) {
  return getPlanRank(getEffectivePlan(user)) >= PLAN_RANK[requiredPlan];
}

export function getInvoiceLimit(user: AppUserRecord | null | undefined) {
  const plan = getEffectivePlan(user);

  if (plan === "free") {
    return 0;
  }

  return PLAN_DEFINITIONS[plan].invoiceLimit;
}

export function getPlanPrice(
  plan: Exclude<PlanKey, "free">,
  interval: BillingInterval,
) {
  return interval === "monthly"
    ? PLAN_DEFINITIONS[plan].monthlyPrice
    : PLAN_DEFINITIONS[plan].yearlyPrice;
}

export function getYearlySavings(plan: Exclude<PlanKey, "free">) {
  const { monthlyPrice, yearlyPrice } = PLAN_DEFINITIONS[plan];
  return monthlyPrice * 12 - yearlyPrice;
}

export function getStripePriceEnvKey(
  plan: Exclude<PlanKey, "free">,
  interval: BillingInterval,
) {
  const definition = PLAN_DEFINITIONS[plan];
  return interval === "monthly"
    ? definition.monthlyPriceKey
    : definition.yearlyPriceKey;
}

export function getUpgradeCopy(requiredPlan: Exclude<PlanKey, "free">) {
  return {
    title: requiredPlan === "basic" ? "Activa un plan para seguir" : "Actualiza a Pro",
    description:
      requiredPlan === "basic"
        ? "Necesitas un plan activo para emitir facturas y usar la IA local en FacturaIA."
        : "Esta funcionalidad está reservada para usuarios Pro o Premium.",
  };
}
