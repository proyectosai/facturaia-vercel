import "server-only";

import {
  demoAiUsage,
  demoInvoices,
  demoMessageConnections,
  demoMessageRecords,
  demoMessageThreads,
  demoProfile,
  isDemoMode,
} from "@/lib/demo";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type {
  InvoiceRecord,
  MessageConnection,
  MessageRecord,
  MessageThread,
  Profile,
} from "@/lib/types";

export type BackupAiUsageRow = {
  user_id: string;
  date: string;
  calls_count: number;
  created_at?: string;
  updated_at?: string;
};

export type FacturaIaBackup = {
  schemaVersion: 1;
  exportedAt: string;
  source: "demo" | "live";
  appUrl: string;
  user: {
    id: string;
    email: string;
  };
  profile: Profile | null;
  invoices: InvoiceRecord[];
  aiUsage: BackupAiUsageRow[];
  messages: {
    connections: MessageConnection[];
    threads: MessageThread[];
    records: MessageRecord[];
  };
};

export type BackupSummary = {
  invoices: number;
  aiUsageRows: number;
  messageConnections: number;
  messageThreads: number;
  messageRecords: number;
};

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export function buildBackupFilename(date = new Date()) {
  return `facturaia-backup-${date.toISOString().slice(0, 10)}.json`;
}

export async function getBackupSummary(userId: string): Promise<BackupSummary> {
  if (isDemoMode()) {
    return {
      invoices: demoInvoices.length,
      aiUsageRows: 1,
      messageConnections: demoMessageConnections.length,
      messageThreads: demoMessageThreads.length,
      messageRecords: demoMessageRecords.length,
    };
  }

  const admin = createAdminSupabaseClient();
  const [invoices, aiUsage, connections, threads, records] = await Promise.all([
    admin.from("invoices").select("*", { count: "exact", head: true }).eq("user_id", userId),
    admin.from("ai_usage").select("*", { count: "exact", head: true }).eq("user_id", userId),
    admin
      .from("message_connections")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    admin.from("message_threads").select("*", { count: "exact", head: true }).eq("user_id", userId),
    admin.from("message_messages").select("*", { count: "exact", head: true }).eq("user_id", userId),
  ]);

  return {
    invoices: invoices.count ?? 0,
    aiUsageRows: aiUsage.count ?? 0,
    messageConnections: connections.count ?? 0,
    messageThreads: threads.count ?? 0,
    messageRecords: records.count ?? 0,
  };
}

export async function exportBackupForUser(
  userId: string,
  email: string,
): Promise<FacturaIaBackup> {
  if (isDemoMode()) {
    return {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      source: "demo",
      appUrl: getAppUrl(),
      user: { id: userId, email },
      profile: demoProfile,
      invoices: demoInvoices,
      aiUsage: [
        {
          user_id: userId,
          date: demoAiUsage.date,
          calls_count: demoAiUsage.used,
        },
      ],
      messages: {
        connections: demoMessageConnections,
        threads: demoMessageThreads,
        records: demoMessageRecords,
      },
    };
  }

  const admin = createAdminSupabaseClient();
  const [profile, invoices, aiUsage, connections, threads, records] = await Promise.all([
    admin.from("profiles").select("*").eq("id", userId).maybeSingle(),
    admin.from("invoices").select("*").eq("user_id", userId).order("issue_date", { ascending: true }),
    admin.from("ai_usage").select("*").eq("user_id", userId).order("date", { ascending: true }),
    admin
      .from("message_connections")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
    admin
      .from("message_threads")
      .select("*")
      .eq("user_id", userId)
      .order("last_message_at", { ascending: false }),
    admin
      .from("message_messages")
      .select("*")
      .eq("user_id", userId)
      .order("received_at", { ascending: true }),
  ]);

  if (profile.error) {
    throw new Error("No se ha podido cargar el perfil para la copia de seguridad.");
  }

  if (invoices.error || aiUsage.error || connections.error || threads.error || records.error) {
    throw new Error("No se han podido reunir todos los datos para la copia de seguridad.");
  }

  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    source: "live",
    appUrl: getAppUrl(),
    user: { id: userId, email },
    profile: (profile.data as Profile | null) ?? null,
    invoices: (invoices.data as InvoiceRecord[] | null) ?? [],
    aiUsage: (aiUsage.data as BackupAiUsageRow[] | null) ?? [],
    messages: {
      connections: (connections.data as MessageConnection[] | null) ?? [],
      threads: (threads.data as MessageThread[] | null) ?? [],
      records: (records.data as MessageRecord[] | null) ?? [],
    },
  };
}

export async function restoreBackupForUser(
  userId: string,
  email: string,
  backup: FacturaIaBackup,
) {
  if (isDemoMode()) {
    throw new Error("La restauración está desactivada en modo demo.");
  }

  const admin = createAdminSupabaseClient();

  const userUpsert = await admin.from("users").upsert(
    {
      id: userId,
      email,
    },
    { onConflict: "id" },
  );

  if (userUpsert.error) {
    throw new Error("No se ha podido preparar el usuario antes de restaurar.");
  }

  const cleanupSteps = [
    admin.from("message_messages").delete().eq("user_id", userId),
    admin.from("message_threads").delete().eq("user_id", userId),
    admin.from("message_connections").delete().eq("user_id", userId),
    admin.from("ai_usage").delete().eq("user_id", userId),
    admin.from("invoices").delete().eq("user_id", userId),
  ];

  const cleanupResults = await Promise.all(cleanupSteps);

  if (cleanupResults.some((result) => result.error)) {
    throw new Error("No se ha podido limpiar el estado actual antes de restaurar.");
  }

  const profilePayload = backup.profile
    ? {
        id: userId,
        email,
        full_name: backup.profile.full_name,
        nif: backup.profile.nif,
        address: backup.profile.address,
        logo_path: backup.profile.logo_path,
        logo_url: backup.profile.logo_url,
      }
    : {
        id: userId,
        email,
      };

  const profileUpsert = await admin
    .from("profiles")
    .upsert(profilePayload, { onConflict: "id" });

  if (profileUpsert.error) {
    throw new Error("No se ha podido restaurar el perfil del usuario.");
  }

  if (backup.aiUsage.length > 0) {
    const aiInsert = await admin.from("ai_usage").insert(
      backup.aiUsage.map((row) => ({
        user_id: userId,
        date: row.date,
        calls_count: row.calls_count,
        created_at: row.created_at,
        updated_at: row.updated_at,
      })),
    );

    if (aiInsert.error) {
      throw new Error("No se ha podido restaurar el histórico de IA.");
    }
  }

  if (backup.messages.connections.length > 0) {
    const connectionsInsert = await admin.from("message_connections").insert(
      backup.messages.connections.map((row) => ({
        ...row,
        user_id: userId,
      })),
    );

    if (connectionsInsert.error) {
      throw new Error("No se han podido restaurar las conexiones de mensajería.");
    }
  }

  if (backup.messages.threads.length > 0) {
    const threadsInsert = await admin.from("message_threads").insert(
      backup.messages.threads.map((row) => ({
        ...row,
        user_id: userId,
      })),
    );

    if (threadsInsert.error) {
      throw new Error("No se han podido restaurar los hilos de mensajería.");
    }
  }

  if (backup.messages.records.length > 0) {
    const recordsInsert = await admin.from("message_messages").insert(
      backup.messages.records.map((row) => ({
        ...row,
        user_id: userId,
      })),
    );

    if (recordsInsert.error) {
      throw new Error("No se han podido restaurar los mensajes.");
    }
  }

  if (backup.invoices.length > 0) {
    const invoicesInsert = await admin.from("invoices").insert(
      backup.invoices.map((row) => ({
        ...row,
        user_id: userId,
      })),
    );

    if (invoicesInsert.error) {
      throw new Error("No se han podido restaurar las facturas.");
    }
  }

  const syncSequence = await admin.rpc("sync_invoice_number_sequence");

  if (syncSequence.error) {
    throw new Error("La restauración terminó, pero no se pudo resincronizar la numeración.");
  }

  return {
    invoices: backup.invoices.length,
    aiUsageRows: backup.aiUsage.length,
    messageConnections: backup.messages.connections.length,
    messageThreads: backup.messages.threads.length,
    messageRecords: backup.messages.records.length,
  };
}
