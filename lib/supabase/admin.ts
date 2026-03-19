import { createClient } from "@supabase/supabase-js";

import { getPublicEnv, getServiceEnv } from "@/lib/env";

export function createAdminSupabaseClient() {
  const publicEnv = getPublicEnv();
  const serviceEnv = getServiceEnv();

  return createClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    serviceEnv.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
