import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentAppUser } from "@/lib/auth";
import { demoAiUsage, demoInvoices, isDemoMode, isLocalFileMode } from "@/lib/demo";
import {
  getLocalDailyAiUsage,
  getLocalMonthlyInvoiceUsage,
  incrementLocalDailyAiUsage,
} from "@/lib/local-core";
import type { AppUserRecord } from "@/lib/types";

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

  if (isLocalFileMode()) {
    return getLocalMonthlyInvoiceUsage(userId, getMonthStartIso());
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

  return {
    used,
    limit: null,
    remaining: null,
    blocked: false,
    effectivePlan: "premium" as const,
  };
}

export function getAiDailyLimit() {
  return null;
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

  if (isLocalFileMode()) {
    return getLocalDailyAiUsage(userId, usageDate);
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

  return {
    date: usageDate,
    used,
    limit: null,
    remaining: null,
    blocked: false,
    effectivePlan: "premium" as const,
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

  if (isLocalFileMode()) {
    return incrementLocalDailyAiUsage(userId, usageDate, limit);
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
  if (feature === "create_invoices") {
    return {
      user,
      usage: {
        used: await getMonthlyInvoiceUsage(user.id),
        limit: null,
        remaining: null,
        blocked: false,
        effectivePlan: "premium" as const,
      },
    };
  }

  return { user };
}
