import "server-only";

import {
  demoAiUsage,
  demoBankMovements,
  demoClients,
  demoCommercialDocuments,
  demoDocumentSignatureRequests,
  demoExpenses,
  demoInvoices,
  demoInvoiceReminders,
  demoMailMessages,
  demoMailSyncRuns,
  demoMailThreads,
  demoMessageConnections,
  demoMessageRecords,
  demoMessageThreads,
  demoProfile,
  isDemoMode,
} from "@/lib/demo";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type {
  BankMovementRecord,
  ClientRecord,
  CommercialDocumentRecord,
  DocumentSignatureRequestRecord,
  ExpenseRecord,
  InvoiceRecord,
  InvoiceReminderRecord,
  MailMessage,
  MailSyncRun,
  MailThread,
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
  clients: ClientRecord[];
  invoices: InvoiceRecord[];
  invoiceReminders: InvoiceReminderRecord[];
  commercialDocuments: CommercialDocumentRecord[];
  documentSignatureRequests: DocumentSignatureRequestRecord[];
  expenses: ExpenseRecord[];
  bankMovements: BankMovementRecord[];
  aiUsage: BackupAiUsageRow[];
  messages: {
    connections: MessageConnection[];
    threads: MessageThread[];
    records: MessageRecord[];
  };
  mail: {
    threads: MailThread[];
    messages: MailMessage[];
    syncRuns: MailSyncRun[];
  };
};

export type BackupSummary = {
  clients: number;
  invoices: number;
  invoiceReminders: number;
  commercialDocuments: number;
  documentSignatureRequests: number;
  expenses: number;
  bankMovements: number;
  aiUsageRows: number;
  messageConnections: number;
  messageThreads: number;
  messageRecords: number;
  mailThreads: number;
  mailMessages: number;
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
      clients: demoClients.length,
      invoices: demoInvoices.length,
      invoiceReminders: demoInvoiceReminders.length,
      commercialDocuments: demoCommercialDocuments.length,
      documentSignatureRequests: demoDocumentSignatureRequests.length,
      expenses: demoExpenses.length,
      bankMovements: demoBankMovements.length,
      aiUsageRows: 1,
      messageConnections: demoMessageConnections.length,
      messageThreads: demoMessageThreads.length,
      messageRecords: demoMessageRecords.length,
      mailThreads: demoMailThreads.length,
      mailMessages: demoMailMessages.length,
    };
  }

  const admin = createAdminSupabaseClient();
  const [
    clients,
    invoices,
    invoiceReminders,
    commercialDocuments,
    documentSignatureRequests,
    expenses,
    bankMovements,
    aiUsage,
    connections,
    threads,
    records,
    mailThreads,
    mailMessages,
  ] = await Promise.all([
    admin.from("clients").select("*", { count: "exact", head: true }).eq("user_id", userId),
    admin.from("invoices").select("*", { count: "exact", head: true }).eq("user_id", userId),
    admin
      .from("invoice_reminders")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    admin
      .from("commercial_documents")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    admin
      .from("document_signature_requests")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    admin.from("expenses").select("*", { count: "exact", head: true }).eq("user_id", userId),
    admin.from("bank_movements").select("*", { count: "exact", head: true }).eq("user_id", userId),
    admin.from("ai_usage").select("*", { count: "exact", head: true }).eq("user_id", userId),
    admin
      .from("message_connections")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    admin.from("message_threads").select("*", { count: "exact", head: true }).eq("user_id", userId),
    admin.from("message_messages").select("*", { count: "exact", head: true }).eq("user_id", userId),
    admin.from("mail_threads").select("*", { count: "exact", head: true }).eq("user_id", userId),
    admin.from("mail_messages").select("*", { count: "exact", head: true }).eq("user_id", userId),
  ]);

  return {
    clients: clients.count ?? 0,
    invoices: invoices.count ?? 0,
    invoiceReminders: invoiceReminders.count ?? 0,
    commercialDocuments: commercialDocuments.count ?? 0,
    documentSignatureRequests: documentSignatureRequests.count ?? 0,
    expenses: expenses.count ?? 0,
    bankMovements: bankMovements.count ?? 0,
    aiUsageRows: aiUsage.count ?? 0,
    messageConnections: connections.count ?? 0,
    messageThreads: threads.count ?? 0,
    messageRecords: records.count ?? 0,
    mailThreads: mailThreads.count ?? 0,
    mailMessages: mailMessages.count ?? 0,
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
      clients: demoClients,
      invoices: demoInvoices,
      invoiceReminders: demoInvoiceReminders,
      commercialDocuments: demoCommercialDocuments,
      documentSignatureRequests: demoDocumentSignatureRequests,
      expenses: demoExpenses,
      bankMovements: demoBankMovements,
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
      mail: {
        threads: demoMailThreads,
        messages: demoMailMessages,
        syncRuns: demoMailSyncRuns,
      },
    };
  }

  const admin = createAdminSupabaseClient();
  const [
    profile,
    clients,
    invoices,
    invoiceReminders,
    commercialDocuments,
    documentSignatureRequests,
    expenses,
    bankMovements,
    aiUsage,
    connections,
    threads,
    records,
    mailThreads,
    mailMessages,
    mailSyncRuns,
  ] = await Promise.all([
    admin.from("profiles").select("*").eq("id", userId).maybeSingle(),
    admin.from("clients").select("*").eq("user_id", userId).order("updated_at", { ascending: false }),
    admin.from("invoices").select("*").eq("user_id", userId).order("issue_date", { ascending: true }),
    admin
      .from("invoice_reminders")
      .select("*")
      .eq("user_id", userId)
      .order("sent_at", { ascending: false }),
    admin
      .from("commercial_documents")
      .select("*")
      .eq("user_id", userId)
      .order("issue_date", { ascending: true }),
    admin
      .from("document_signature_requests")
      .select("*")
      .eq("user_id", userId)
      .order("requested_at", { ascending: false }),
    admin.from("expenses").select("*").eq("user_id", userId).order("expense_date", { ascending: true }),
    admin
      .from("bank_movements")
      .select("*")
      .eq("user_id", userId)
      .order("booking_date", { ascending: true }),
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
    admin.from("mail_threads").select("*").eq("user_id", userId).order("last_message_at", { ascending: false }),
    admin.from("mail_messages").select("*").eq("user_id", userId).order("received_at", { ascending: true }),
    admin.from("mail_sync_runs").select("*").eq("user_id", userId).order("created_at", { ascending: true }),
  ]);

  if (profile.error) {
    throw new Error("No se ha podido cargar el perfil para la copia de seguridad.");
  }

  if (
    clients.error ||
    invoices.error ||
    invoiceReminders.error ||
    commercialDocuments.error ||
    documentSignatureRequests.error ||
    expenses.error ||
    bankMovements.error ||
    aiUsage.error ||
    connections.error ||
    threads.error ||
    records.error ||
    mailThreads.error ||
    mailMessages.error ||
    mailSyncRuns.error
  ) {
    throw new Error("No se han podido reunir todos los datos para la copia de seguridad.");
  }

  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    source: "live",
    appUrl: getAppUrl(),
    user: { id: userId, email },
    profile: (profile.data as Profile | null) ?? null,
    clients: (clients.data as ClientRecord[] | null) ?? [],
    invoices: (invoices.data as InvoiceRecord[] | null) ?? [],
    invoiceReminders: (invoiceReminders.data as InvoiceReminderRecord[] | null) ?? [],
    commercialDocuments:
      (commercialDocuments.data as CommercialDocumentRecord[] | null) ?? [],
    documentSignatureRequests:
      (documentSignatureRequests.data as DocumentSignatureRequestRecord[] | null) ?? [],
    expenses: (expenses.data as ExpenseRecord[] | null) ?? [],
    bankMovements: (bankMovements.data as BankMovementRecord[] | null) ?? [],
    aiUsage: (aiUsage.data as BackupAiUsageRow[] | null) ?? [],
    messages: {
      connections: (connections.data as MessageConnection[] | null) ?? [],
      threads: (threads.data as MessageThread[] | null) ?? [],
      records: (records.data as MessageRecord[] | null) ?? [],
    },
    mail: {
      threads: (mailThreads.data as MailThread[] | null) ?? [],
      messages: (mailMessages.data as MailMessage[] | null) ?? [],
      syncRuns: (mailSyncRuns.data as MailSyncRun[] | null) ?? [],
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
    admin.from("mail_messages").delete().eq("user_id", userId),
    admin.from("mail_threads").delete().eq("user_id", userId),
    admin.from("mail_sync_runs").delete().eq("user_id", userId),
    admin.from("document_signature_requests").delete().eq("user_id", userId),
    admin.from("invoice_reminders").delete().eq("user_id", userId),
    admin.from("clients").delete().eq("user_id", userId),
    admin.from("message_messages").delete().eq("user_id", userId),
    admin.from("message_threads").delete().eq("user_id", userId),
    admin.from("message_connections").delete().eq("user_id", userId),
    admin.from("ai_usage").delete().eq("user_id", userId),
    admin.from("bank_movements").delete().eq("user_id", userId),
    admin.from("expenses").delete().eq("user_id", userId),
    admin.from("commercial_documents").delete().eq("user_id", userId),
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

  if (backup.clients.length > 0) {
    const clientsInsert = await admin.from("clients").insert(
      backup.clients.map((row) => ({
        ...row,
        user_id: userId,
      })),
    );

    if (clientsInsert.error) {
      throw new Error("No se han podido restaurar las fichas del CRM.");
    }
  }

  if (backup.documentSignatureRequests.length > 0) {
    const signaturesInsert = await admin.from("document_signature_requests").insert(
      backup.documentSignatureRequests.map((row) => ({
        ...row,
        user_id: userId,
      })),
    );

    if (signaturesInsert.error) {
      throw new Error("No se han podido restaurar las solicitudes de firma.");
    }
  }

  if (backup.commercialDocuments.length > 0) {
    const documentsInsert = await admin.from("commercial_documents").insert(
      backup.commercialDocuments.map((row) => ({
        ...row,
        user_id: userId,
      })),
    );

    if (documentsInsert.error) {
      throw new Error("No se han podido restaurar los presupuestos y albaranes.");
    }
  }

  if (backup.expenses.length > 0) {
    const expensesInsert = await admin.from("expenses").insert(
      backup.expenses.map((row) => ({
        ...row,
        user_id: userId,
      })),
    );

    if (expensesInsert.error) {
      throw new Error("No se han podido restaurar los gastos.");
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

  if (backup.mail.threads.length > 0) {
    const threadsInsert = await admin.from("mail_threads").insert(
      backup.mail.threads.map((row) => ({
        ...row,
        user_id: userId,
      })),
    );

    if (threadsInsert.error) {
      throw new Error("No se han podido restaurar los hilos de correo.");
    }
  }

  if (backup.mail.messages.length > 0) {
    const messagesInsert = await admin.from("mail_messages").insert(
      backup.mail.messages.map((row) => ({
        ...row,
        user_id: userId,
      })),
    );

    if (messagesInsert.error) {
      throw new Error("No se han podido restaurar los mensajes de correo.");
    }
  }

  if (backup.mail.syncRuns.length > 0) {
    const runsInsert = await admin.from("mail_sync_runs").insert(
      backup.mail.syncRuns.map((row) => ({
        ...row,
        user_id: userId,
      })),
    );

    if (runsInsert.error) {
      throw new Error("No se ha podido restaurar el historial IMAP.");
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

  if (backup.invoiceReminders.length > 0) {
    const remindersInsert = await admin.from("invoice_reminders").insert(
      backup.invoiceReminders.map((row) => ({
        ...row,
        user_id: userId,
      })),
    );

    if (remindersInsert.error) {
      throw new Error("No se ha podido restaurar el historial de recordatorios.");
    }
  }

  if (backup.bankMovements.length > 0) {
    const bankMovementsInsert = await admin.from("bank_movements").insert(
      backup.bankMovements.map((row) => ({
        ...row,
        user_id: userId,
      })),
    );

    if (bankMovementsInsert.error) {
      throw new Error("No se han podido restaurar los movimientos bancarios.");
    }
  }

  const syncSequence = await admin.rpc("sync_invoice_number_sequence");

  if (syncSequence.error) {
    throw new Error("La restauración terminó, pero no se pudo resincronizar la numeración.");
  }

  return {
    clients: backup.clients.length,
    invoices: backup.invoices.length,
    invoiceReminders: backup.invoiceReminders.length,
    commercialDocuments: backup.commercialDocuments.length,
    documentSignatureRequests: backup.documentSignatureRequests.length,
    expenses: backup.expenses.length,
    bankMovements: backup.bankMovements.length,
    aiUsageRows: backup.aiUsage.length,
    messageConnections: backup.messages.connections.length,
    messageThreads: backup.messages.threads.length,
    messageRecords: backup.messages.records.length,
    mailThreads: backup.mail.threads.length,
    mailMessages: backup.mail.messages.length,
  };
}
