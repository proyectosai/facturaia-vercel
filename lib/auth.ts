import { cache } from "react";
import type { User } from "@supabase/supabase-js";

import { redirect } from "next/navigation";

import {
  demoAppUser,
  demoProfile,
  demoSubscription,
  isDemoMode,
} from "@/lib/demo";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AppUserRecord, Profile, SubscriptionRecord } from "@/lib/types";

export const getOptionalUser = cache(async () => {
  if (isDemoMode()) {
    return {
      id: demoAppUser.id,
      email: demoAppUser.email,
    } as User;
  }

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return null;
  }

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return user;
  } catch {
    if (process.env.NODE_ENV === "development") {
      return null;
    }

    return null;
  }
});

export const requireUser = cache(async () => {
  if (isDemoMode()) {
    return {
      id: demoAppUser.id,
      email: demoAppUser.email,
    } as User;
  }

  const user = await getOptionalUser();

  if (!user) {
    redirect("/login");
  }

  return user;
});

export const getCurrentProfile = cache(async (): Promise<Profile> => {
  if (isDemoMode()) {
    return demoProfile;
  }

  const user = await requireUser();
  const supabase = await createServerSupabaseClient();

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (existingProfile) {
    return existingProfile as Profile;
  }

  const { data: createdProfile, error } = await supabase
    .from("profiles")
    .upsert({
      id: user.id,
      email: user.email ?? "",
    })
    .select("*")
    .single();

  if (error || !createdProfile) {
    throw new Error("No se pudo preparar el perfil del usuario.");
  }

  return createdProfile as Profile;
});

export const getCurrentAppUser = cache(async (): Promise<AppUserRecord> => {
  if (isDemoMode()) {
    return demoAppUser;
  }

  const user = await requireUser();
  const supabase = await createServerSupabaseClient();

  const { data: existingUser } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (existingUser) {
    return existingUser as AppUserRecord;
  }

  const { data: createdUser, error } = await supabase
    .from("users")
    .upsert({
      id: user.id,
      email: user.email ?? "",
    })
    .select("*")
    .single();

  if (error || !createdUser) {
    throw new Error("No se pudo preparar el registro del usuario.");
  }

  return createdUser as AppUserRecord;
});

export const getCurrentSubscription = cache(
  async (): Promise<SubscriptionRecord | null> => {
    if (isDemoMode()) {
      return demoSubscription;
    }

    const user = await requireUser();
    const supabase = await createServerSupabaseClient();

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .order("current_period_end", { ascending: false })
      .limit(1)
      .maybeSingle();

    return (subscription as SubscriptionRecord | null) ?? null;
  },
);
