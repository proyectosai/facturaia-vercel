import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentAppUser } from "@/lib/auth";
import { demoAiUsage, demoInvoices, isDemoMode } from "@/lib/demo";
import { getEffectivePlan, getInvoiceLimit, hasPlanAccess } from "@/lib/plans";
import type { AppUserRecord, PlanKey } from "@/lib/types";

function getMonthStartIso() {
  const now = new Date();
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0),
  );

  return monthStart.toISOString().slice(0, 10);
}

function getTodayUtcIso() {
  return new Date().toISOString().slice(0, 10);
}

export async function getMonthlyInvoiceUsage(userId: string) {
  if (isDemoMode()) {
    return demoInvoices.filter(
      (invoice) =>
        invoice.user_id === userId && invoice.issue_date >= getMonthStartIso(),
    ).length;
  }

  const supabase = await createServerSupabaseClient();
  const { count } = await supabase
    .from("invoices")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("issue_date", getMonthStartIso());

  return count ?? 0;
}

export async function getCurrentUsageSnapshot(user?: AppUserRecord | null) {
  const currentUser = user ?? (await getCurrentAppUser());
  const used = await getMonthlyInvoiceUsage(currentUser.id);
  const limit = getInvoiceLimit(currentUser);

  return {
    used,
    limit,
    remaining: limit === null ? null : Math.max(limit - used, 0),
    blocked: limit !== null && used >= limit,
    effectivePlan: getEffectivePlan(currentUser),
  };
}

export function getAiDailyLimit(user?: AppUserRecord | null) {
  const effectivePlan = getEffectivePlan(user);

  if (effectivePlan === "premium") {
    return null;
  }

  if (effectivePlan === "pro") {
    return 50;
  }

  if (effectivePlan === "basic") {
    return 5;
  }

  return 0;
}

export async function getDailyAiUsage(
  userId: string,
  usageDate = getTodayUtcIso(),
) {
  if (isDemoMode()) {
    return userId === demoInvoices[0]?.user_id && usageDate === demoAiUsage.date
      ? demoAiUsage.used
      : 0;
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("ai_usage")
    .select("calls_count")
    .eq("user_id", userId)
    .eq("date", usageDate)
    .maybeSingle();

  if (error) {
    throw new Error("No se ha podido comprobar el uso diario de IA.");
  }

  return Number(data?.calls_count ?? 0);
}

export async function getCurrentAiUsageSnapshot(user?: AppUserRecord | null) {
  const currentUser = user ?? (await getCurrentAppUser());
  const usageDate = getTodayUtcIso();
  const used = await getDailyAiUsage(currentUser.id, usageDate);
  const limit = getAiDailyLimit(currentUser);

  return {
    date: usageDate,
    used,
    limit,
    remaining: limit === null ? null : Math.max(limit - used, 0),
    blocked: limit !== null && used >= limit,
    effectivePlan: getEffectivePlan(currentUser),
  };
}

export async function incrementDailyAiUsage(
  userId: string,
  limit: number | null,
  usageDate = getTodayUtcIso(),
) {
  if (isDemoMode()) {
    if (userId !== demoInvoices[0]?.user_id || usageDate !== demoAiUsage.date) {
      return 1;
    }

    if (limit !== null && demoAiUsage.used >= limit) {
      return null;
    }

    return demoAiUsage.used + 1;
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("increment_ai_usage_if_allowed", {
    p_user_id: userId,
    p_usage_date: usageDate,
    p_limit: limit,
  });

  if (error) {
    throw new Error("No se ha podido registrar el uso diario de IA.");
  }

  return data === null ? null : Number(data);
}

export async function requireFeatureAccess(
  feature: "create_invoices" | "ai_descriptions" | "ai_contracts",
) {
  const user = await getCurrentAppUser();
  const effectivePlan = getEffectivePlan(user);

  if (feature === "create_invoices" && effectivePlan === "free") {
    throw new Error("Activa al menos el plan Básico para emitir facturas.");
  }

  if (feature === "ai_descriptions" && effectivePlan === "free") {
    throw new Error("Activa al menos el plan Básico para usar la IA local en descripciones.");
  }

  if (feature === "ai_contracts" && !hasPlanAccess(user, "pro")) {
    throw new Error(
      "Esta función está reservada a usuarios Pro o Premium con generación documental asistida.",
    );
  }

  if (feature === "create_invoices") {
    const usage = await getCurrentUsageSnapshot(user);

    if (usage.blocked) {
      throw new Error(
        "Has alcanzado el límite mensual de facturas de tu plan Básico.",
      );
    }

    return { user, usage };
  }

  return { user };
}

export function canAccessPlan(
  user: AppUserRecord | null | undefined,
  requiredPlan: Exclude<PlanKey, "free">,
) {
  return hasPlanAccess(user, requiredPlan);
}
