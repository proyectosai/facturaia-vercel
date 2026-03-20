import "server-only";

import { demoFeedbackEntries, isDemoMode } from "@/lib/demo";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  FeedbackEntryRecord,
  FeedbackSeverity,
  FeedbackSourceType,
  FeedbackStatus,
} from "@/lib/types";

export const feedbackSeverityLabels: Record<FeedbackSeverity, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
};

export const feedbackStatusLabels: Record<FeedbackStatus, string> = {
  open: "Abierta",
  reviewed: "Revisada",
  planned: "Planificada",
  resolved: "Resuelta",
};

export const feedbackSourceLabels: Record<FeedbackSourceType, string> = {
  self: "Interno",
  pilot: "Piloto",
};

export function getFeedbackSummary(entries: FeedbackEntryRecord[]) {
  return {
    total: entries.length,
    open: entries.filter((item) => item.status === "open").length,
    planned: entries.filter((item) => item.status === "planned").length,
    high: entries.filter((item) => item.severity === "high").length,
  };
}

export async function getFeedbackEntriesForUser(userId: string) {
  if (isDemoMode()) {
    return [...demoFeedbackEntries].sort((left, right) =>
      right.created_at.localeCompare(left.created_at),
    );
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("feedback_entries")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("No se ha podido cargar la bandeja de feedback.");
  }

  return (data as FeedbackEntryRecord[] | null) ?? [];
}
