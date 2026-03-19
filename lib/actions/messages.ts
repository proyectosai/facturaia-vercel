"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { isDemoMode } from "@/lib/demo";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function getUrgencyScore(urgency: string) {
  return {
    high: 90,
    medium: 60,
    low: 20,
  }[urgency] ?? 50;
}

export async function markThreadReadAction(formData: FormData) {
  const user = await requireUser();
  const threadId = String(formData.get("threadId") ?? "");

  if (!threadId || isDemoMode()) {
    revalidatePath("/messages");
    return;
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("message_threads")
    .update({ unread_count: 0 })
    .eq("id", threadId)
    .eq("user_id", user.id);

  if (error) {
    throw new Error("No se ha podido marcar la conversación como leída.");
  }

  revalidatePath("/messages");
}

export async function setThreadUrgencyAction(formData: FormData) {
  const user = await requireUser();
  const threadId = String(formData.get("threadId") ?? "");
  const urgency = String(formData.get("urgency") ?? "");

  if (!threadId || !["low", "medium", "high"].includes(urgency) || isDemoMode()) {
    revalidatePath("/messages");
    return;
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("message_threads")
    .update({
      urgency,
      urgency_score: getUrgencyScore(urgency),
      urgency_locked: true,
    })
    .eq("id", threadId)
    .eq("user_id", user.id);

  if (error) {
    throw new Error("No se ha podido actualizar la prioridad.");
  }

  revalidatePath("/messages");
}

export async function unlockThreadUrgencyAction(formData: FormData) {
  const user = await requireUser();
  const threadId = String(formData.get("threadId") ?? "");

  if (!threadId || isDemoMode()) {
    revalidatePath("/messages");
    return;
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("message_threads")
    .update({
      urgency_locked: false,
    })
    .eq("id", threadId)
    .eq("user_id", user.id);

  if (error) {
    throw new Error("No se ha podido devolver la prioridad al modo automático.");
  }

  revalidatePath("/messages");
}
