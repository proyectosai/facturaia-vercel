import "server-only";

import { createHash } from "node:crypto";

import {
  demoAiUsage,
  demoBankMovements,
  demoClients,
  demoCommercialDocuments,
  demoDocumentSignatureRequests,
  demoExpenses,
  demoFeedbackEntries,
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
  isLocalFileMode,
} from "@/lib/demo";
import {
  exportStudyDocumentsForUser,
  replaceStudyDocumentsForUser,
} from "@/lib/document-study";
import {
  getLocalCoreSnapshot,
  recordLocalAuditEvent,
  replaceLocalUserData,
} from "@/lib/local-core";
import { readStructuredLocalCoreSlices } from "@/lib/local-db";
import {
  decryptEncryptedEnvelope,
  encryptTextForScope,
  isBackupEncryptionRequested,
  tryParseEncryptedEnvelope,
} from "@/lib/local-encryption";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type {
  BankMovementRecord,
  ClientRecord,
  CommercialDocumentRecord,
  DocumentSignatureRequestRecord,
  ExpenseRecord,
  FeedbackEntryRecord,
  InvoiceRecord,
  InvoiceReminderRecord,
  LocalAuditEventRecord,
  MailMessage,
  MailSyncRun,
  MailThread,
  MessageConnection,
  MessageRecord,
  MessageThread,
  Profile,
  StudyDocumentBackupRecord,
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
  feedbackEntries: FeedbackEntryRecord[];
  auditEvents: LocalAuditEventRecord[];
  invoices: InvoiceRecord[];
  invoiceReminders: InvoiceReminderRecord[];
  commercialDocuments: CommercialDocumentRecord[];
  documentSignatureRequests: DocumentSignatureRequestRecord[];
  studyDocuments: StudyDocumentBackupRecord[];
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

export type FacturaIaBackupManifest = {
  schemaVersion: 1;
  appVersion: string;
  exportedAt: string;
  source: "demo" | "live";
  appUrl: string;
  checksumAlgorithm: "sha256";
  modulesIncluded: string[];
  counts: BackupSummary;
};

export type FacturaIaBackupEnvelope = {
  manifest: FacturaIaBackupManifest;
  payload: FacturaIaBackup;
  checksum: string;
};

export type BackupContentMismatch = {
  field: string;
  expected: string | number | boolean;
  actual: string | number | boolean;
};

export type BackupContentComparison = {
  matches: boolean;
  mismatches: BackupContentMismatch[];
};

export type BackupSummary = {
  clients: number;
  feedbackEntries: number;
  auditEvents: number;
  invoices: number;
  invoiceReminders: number;
  commercialDocuments: number;
  documentSignatureRequests: number;
  studyDocuments: number;
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

function getAppVersion() {
  return process.env.npm_package_version ?? "0.1.0";
}

function computePayloadChecksum(payload: FacturaIaBackup) {
  return createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");
}

function getBackupCounts(backup: FacturaIaBackup): BackupSummary {
  return {
    clients: backup.clients.length,
    feedbackEntries: backup.feedbackEntries.length,
    auditEvents: backup.auditEvents.length,
    invoices: backup.invoices.length,
    invoiceReminders: backup.invoiceReminders.length,
    commercialDocuments: backup.commercialDocuments.length,
    documentSignatureRequests: backup.documentSignatureRequests.length,
    studyDocuments: backup.studyDocuments.length,
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

async function getLocalBackupView(userId: string) {
  const [snapshot, structured] = await Promise.all([
    getLocalCoreSnapshot(),
    readStructuredLocalCoreSlices(),
  ]);

  return {
    snapshot,
    profile:
      structured?.profiles.find((candidate) => candidate.id === userId) ??
      snapshot.profiles.find((candidate) => candidate.id === userId) ??
      null,
    clients:
      structured?.clients.filter((candidate) => candidate.user_id === userId) ??
      snapshot.clients.filter((candidate) => candidate.user_id === userId),
    feedbackEntries:
      structured?.feedbackEntries.filter(
        (candidate) => candidate.user_id === userId,
      ) ?? snapshot.feedbackEntries.filter((candidate) => candidate.user_id === userId),
    auditEvents:
      structured?.auditEvents.filter((candidate) => candidate.user_id === userId) ??
      snapshot.auditEvents.filter((candidate) => candidate.user_id === userId),
    invoices:
      structured?.invoices.filter((candidate) => candidate.user_id === userId) ??
      snapshot.invoices.filter((candidate) => candidate.user_id === userId),
    invoiceReminders:
      structured?.invoiceReminders.filter(
        (candidate) => candidate.user_id === userId,
      ) ?? snapshot.invoiceReminders.filter((candidate) => candidate.user_id === userId),
    snapshotOnly: {
      bankMovements: snapshot.bankMovements.filter(
        (candidate) => candidate.user_id === userId,
      ),
      commercialDocuments: snapshot.commercialDocuments.filter(
        (candidate) => candidate.user_id === userId,
      ),
      documentSignatureRequests: snapshot.documentSignatureRequests.filter(
        (candidate) => candidate.user_id === userId,
      ),
      expenses: snapshot.expenses.filter((candidate) => candidate.user_id === userId),
      aiUsage: snapshot.aiUsage.filter((candidate) => candidate.user_id === userId),
      messageConnections: snapshot.messageConnections.filter(
        (candidate) => candidate.user_id === userId,
      ),
      messageThreads: snapshot.messageThreads.filter(
        (candidate) => candidate.user_id === userId,
      ),
      messageRecords: snapshot.messageRecords.filter(
        (candidate) => candidate.user_id === userId,
      ),
      mailThreads: snapshot.mailThreads.filter((candidate) => candidate.user_id === userId),
      mailMessages: snapshot.mailMessages.filter(
        (candidate) => candidate.user_id === userId,
      ),
      mailSyncRuns: snapshot.mailSyncRuns.filter((candidate) => candidate.user_id === userId),
    },
  };
}

function getBackupModulesIncluded(backup: FacturaIaBackup) {
  const modules = ["core"];

  if (backup.clients.length > 0) modules.push("crm");
  if (backup.feedbackEntries.length > 0) modules.push("feedback");
  if (backup.auditEvents.length > 0) modules.push("security");
  if (backup.commercialDocuments.length > 0) modules.push("commercial-documents");
  if (backup.documentSignatureRequests.length > 0) modules.push("signatures");
  if (backup.studyDocuments.length > 0) modules.push("document-study");
  if (backup.expenses.length > 0) modules.push("expenses");
  if (backup.bankMovements.length > 0) modules.push("banking");
  if (backup.aiUsage.length > 0) modules.push("ai");
  if (backup.messages.connections.length > 0 || backup.messages.threads.length > 0) {
    modules.push("messaging");
  }
  if (backup.mail.threads.length > 0 || backup.mail.messages.length > 0) {
    modules.push("mail");
  }

  return modules;
}

function sortByJsonValue<T>(items: T[]) {
  return [...items].sort((left, right) =>
    JSON.stringify(left).localeCompare(JSON.stringify(right)),
  );
}

function getComparableAuditEvents(auditEvents: LocalAuditEventRecord[]) {
  return auditEvents.filter((event) => event.action !== "backup_restore_completed");
}

function normalizeBackupForComparison(backup: FacturaIaBackup) {
  return {
    schemaVersion: backup.schemaVersion,
    source: backup.source,
    appUrl: backup.appUrl,
    user: backup.user,
    profile: backup.profile,
    clients: sortByJsonValue(backup.clients),
    feedbackEntries: sortByJsonValue(backup.feedbackEntries),
    auditEvents: sortByJsonValue(getComparableAuditEvents(backup.auditEvents)),
    invoices: sortByJsonValue(backup.invoices),
    invoiceReminders: sortByJsonValue(backup.invoiceReminders),
    commercialDocuments: sortByJsonValue(backup.commercialDocuments),
    documentSignatureRequests: sortByJsonValue(backup.documentSignatureRequests),
    studyDocuments: sortByJsonValue(backup.studyDocuments),
    expenses: sortByJsonValue(backup.expenses),
    bankMovements: sortByJsonValue(backup.bankMovements),
    aiUsage: sortByJsonValue(backup.aiUsage),
    messages: {
      connections: sortByJsonValue(backup.messages.connections),
      threads: sortByJsonValue(backup.messages.threads),
      records: sortByJsonValue(backup.messages.records),
    },
    mail: {
      threads: sortByJsonValue(backup.mail.threads),
      messages: sortByJsonValue(backup.mail.messages),
      syncRuns: sortByJsonValue(backup.mail.syncRuns),
    },
  };
}

function pushEntityMismatch(
  mismatches: BackupContentMismatch[],
  field: string,
  expected: string | number | boolean | null | undefined,
  actual: string | number | boolean | null | undefined,
) {
  if (expected === actual) {
    return;
  }

  mismatches.push({
    field,
    expected: expected ?? false,
    actual: actual ?? false,
  });
}

export function compareBackupContents(
  expected: FacturaIaBackup,
  actual: FacturaIaBackup,
): BackupContentComparison {
  const normalizedExpected = normalizeBackupForComparison(expected);
  const normalizedActual = normalizeBackupForComparison(actual);
  const mismatches: BackupContentMismatch[] = [];

  const expectedJson = JSON.stringify(normalizedExpected);
  const actualJson = JSON.stringify(normalizedActual);

  if (expectedJson === actualJson) {
    return {
      matches: true,
      mismatches,
    };
  }

  const summaryFields: Array<keyof BackupSummary> = [
    "clients",
    "feedbackEntries",
    "auditEvents",
    "invoices",
    "invoiceReminders",
    "commercialDocuments",
    "documentSignatureRequests",
    "studyDocuments",
    "expenses",
    "bankMovements",
    "aiUsageRows",
    "messageConnections",
    "messageThreads",
    "messageRecords",
    "mailThreads",
    "mailMessages",
  ];

  const expectedSummary = getBackupCounts(expected);
  const actualSummary = getBackupCounts(actual);
  expectedSummary.auditEvents = getComparableAuditEvents(expected.auditEvents).length;
  actualSummary.auditEvents = getComparableAuditEvents(actual.auditEvents).length;

  for (const field of summaryFields) {
    if (expectedSummary[field] !== actualSummary[field]) {
      mismatches.push({
        field: `counts.${field}`,
        expected: expectedSummary[field],
        actual: actualSummary[field],
      });
    }
  }

  if (expected.profile?.id !== actual.profile?.id) {
    mismatches.push({
      field: "profile.id",
      expected: expected.profile?.id ?? false,
      actual: actual.profile?.id ?? false,
    });
  }

  if (expected.user.email !== actual.user.email) {
    mismatches.push({
      field: "user.email",
      expected: expected.user.email,
      actual: actual.user.email,
    });
  }

  const expectedInvoices = new Map(expected.invoices.map((invoice) => [invoice.id, invoice]));
  const actualInvoices = new Map(actual.invoices.map((invoice) => [invoice.id, invoice]));

  for (const [invoiceId, expectedInvoice] of expectedInvoices) {
    const actualInvoice = actualInvoices.get(invoiceId);

    if (!actualInvoice) {
      mismatches.push({
        field: `invoices.${invoiceId}`,
        expected: "present",
        actual: "missing",
      });
      continue;
    }

    pushEntityMismatch(
      mismatches,
      `invoices.${invoiceId}.payment_status`,
      expectedInvoice.payment_status,
      actualInvoice.payment_status,
    );
    pushEntityMismatch(
      mismatches,
      `invoices.${invoiceId}.amount_paid`,
      expectedInvoice.amount_paid,
      actualInvoice.amount_paid,
    );
    pushEntityMismatch(
      mismatches,
      `invoices.${invoiceId}.invoice_number`,
      expectedInvoice.invoice_number,
      actualInvoice.invoice_number,
    );
    pushEntityMismatch(
      mismatches,
      `invoices.${invoiceId}.reminder_count`,
      expectedInvoice.reminder_count,
      actualInvoice.reminder_count,
    );
    pushEntityMismatch(
      mismatches,
      `invoices.${invoiceId}.due_date`,
      expectedInvoice.due_date,
      actualInvoice.due_date,
    );
  }

  const expectedReminders = new Map(
    expected.invoiceReminders.map((reminder) => [reminder.id, reminder]),
  );
  const actualReminders = new Map(
    actual.invoiceReminders.map((reminder) => [reminder.id, reminder]),
  );

  for (const [reminderId, expectedReminder] of expectedReminders) {
    const actualReminder = actualReminders.get(reminderId);

    if (!actualReminder) {
      mismatches.push({
        field: `invoiceReminders.${reminderId}`,
        expected: "present",
        actual: "missing",
      });
      continue;
    }

    pushEntityMismatch(
      mismatches,
      `invoiceReminders.${reminderId}.trigger_mode`,
      expectedReminder.trigger_mode,
      actualReminder.trigger_mode,
    );
    pushEntityMismatch(
      mismatches,
      `invoiceReminders.${reminderId}.batch_key`,
      expectedReminder.batch_key,
      actualReminder.batch_key,
    );
    pushEntityMismatch(
      mismatches,
      `invoiceReminders.${reminderId}.recipient_email`,
      expectedReminder.recipient_email,
      actualReminder.recipient_email,
    );
  }

  if (mismatches.length === 0) {
    mismatches.push({
      field: "payload",
      expected: "snapshot-equal",
      actual: "snapshot-different",
    });
  }

  return {
    matches: false,
    mismatches,
  };
}

export function buildBackupEnvelope(backup: FacturaIaBackup): FacturaIaBackupEnvelope {
  return {
    manifest: {
      schemaVersion: backup.schemaVersion,
      appVersion: getAppVersion(),
      exportedAt: backup.exportedAt,
      source: backup.source,
      appUrl: backup.appUrl,
      checksumAlgorithm: "sha256",
      modulesIncluded: getBackupModulesIncluded(backup),
      counts: getBackupCounts(backup),
    },
    payload: backup,
    checksum: computePayloadChecksum(backup),
  };
}

function isBackupEnvelope(value: unknown): value is FacturaIaBackupEnvelope {
  return Boolean(
    value &&
      typeof value === "object" &&
      "manifest" in value &&
      "payload" in value &&
      "checksum" in value,
  );
}

export function inspectBackupPayload(raw: string): FacturaIaBackupEnvelope {
  const encryptedEnvelope = tryParseEncryptedEnvelope(raw);
  const decrypted = encryptedEnvelope
    ? decryptEncryptedEnvelope(encryptedEnvelope, "backup")
    : raw;
  const parsed = JSON.parse(decrypted) as FacturaIaBackup | FacturaIaBackupEnvelope;

  if (!isBackupEnvelope(parsed)) {
    const payload = parsed as FacturaIaBackup;
    return buildBackupEnvelope(payload);
  }

  const actualChecksum = computePayloadChecksum(parsed.payload);

  if (parsed.checksum !== actualChecksum) {
    throw new Error("La copia de seguridad está dañada o ha sido modificada.");
  }

  if (parsed.manifest.schemaVersion !== parsed.payload.schemaVersion) {
    throw new Error("La copia de seguridad tiene un manifest incoherente.");
  }

  return parsed;
}

export function buildBackupFilename(date = new Date()) {
  const suffix = isBackupEncryptionRequested() ? "-encrypted" : "";
  return `facturaia-backup-${date.toISOString().slice(0, 10)}${suffix}.json`;
}

export function serializeBackupPayload(backup: FacturaIaBackup) {
  const serialized = JSON.stringify(buildBackupEnvelope(backup), null, 2);

  if (!isBackupEncryptionRequested()) {
    return serialized;
  }

  return JSON.stringify(encryptTextForScope(serialized, "backup"), null, 2);
}

export function parseBackupPayload(raw: string) {
  return inspectBackupPayload(raw).payload;
}

export async function getBackupSummary(userId: string): Promise<BackupSummary> {
  if (isDemoMode()) {
    return {
      clients: demoClients.length,
      feedbackEntries: demoFeedbackEntries.length,
      auditEvents: 0,
      invoices: demoInvoices.length,
      invoiceReminders: demoInvoiceReminders.length,
      commercialDocuments: demoCommercialDocuments.length,
      documentSignatureRequests: demoDocumentSignatureRequests.length,
      studyDocuments: 0,
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

  if (isLocalFileMode()) {
    const localView = await getLocalBackupView(userId);
    return {
      clients: localView.clients.length,
      feedbackEntries: localView.feedbackEntries.length,
      auditEvents: localView.auditEvents.length,
      invoices: localView.invoices.length,
      invoiceReminders: localView.invoiceReminders.length,
      bankMovements: localView.snapshotOnly.bankMovements.length,
      commercialDocuments: localView.snapshotOnly.commercialDocuments.length,
      documentSignatureRequests: localView.snapshotOnly.documentSignatureRequests.length,
      studyDocuments: (await exportStudyDocumentsForUser(userId)).length,
      expenses: localView.snapshotOnly.expenses.length,
      aiUsageRows: localView.snapshotOnly.aiUsage.length,
      messageConnections: localView.snapshotOnly.messageConnections.length,
      messageThreads: localView.snapshotOnly.messageThreads.length,
      messageRecords: localView.snapshotOnly.messageRecords.length,
      mailThreads: localView.snapshotOnly.mailThreads.length,
      mailMessages: localView.snapshotOnly.mailMessages.length,
    };
  }

  const admin = createAdminSupabaseClient();
  const [
    clients,
    feedbackEntries,
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
    admin.from("feedback_entries").select("*", { count: "exact", head: true }).eq("user_id", userId),
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
    feedbackEntries: feedbackEntries.count ?? 0,
    auditEvents: 0,
    invoices: invoices.count ?? 0,
    invoiceReminders: invoiceReminders.count ?? 0,
    commercialDocuments: commercialDocuments.count ?? 0,
    documentSignatureRequests: documentSignatureRequests.count ?? 0,
    studyDocuments: (await exportStudyDocumentsForUser(userId)).length,
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
      feedbackEntries: demoFeedbackEntries,
      auditEvents: [],
      invoices: demoInvoices,
      invoiceReminders: demoInvoiceReminders,
      commercialDocuments: demoCommercialDocuments,
      documentSignatureRequests: demoDocumentSignatureRequests,
      studyDocuments: [],
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

  if (isLocalFileMode()) {
    const localView = await getLocalBackupView(userId);
    const invoices = localView.invoices
      .sort((left, right) => left.issue_date.localeCompare(right.issue_date));
    const invoiceReminders = localView.invoiceReminders
      .sort((left, right) => right.sent_at.localeCompare(left.sent_at));
    const aiUsage = localView.snapshotOnly.aiUsage
      .map((entry) => ({
        user_id: entry.user_id,
        date: entry.date,
        calls_count: entry.calls_count,
      }));
    const studyDocuments = await exportStudyDocumentsForUser(userId);

    return {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      source: "live",
      appUrl: getAppUrl(),
      user: { id: userId, email },
      profile: localView.profile,
      clients: localView.clients,
      feedbackEntries: localView.feedbackEntries,
      auditEvents: localView.auditEvents,
      invoices,
      invoiceReminders,
      bankMovements: localView.snapshotOnly.bankMovements,
      commercialDocuments: localView.snapshotOnly.commercialDocuments,
      documentSignatureRequests: localView.snapshotOnly.documentSignatureRequests,
      studyDocuments,
      expenses: localView.snapshotOnly.expenses,
      aiUsage,
      messages: {
        connections: localView.snapshotOnly.messageConnections,
        threads: localView.snapshotOnly.messageThreads,
        records: localView.snapshotOnly.messageRecords,
      },
      mail: {
        threads: localView.snapshotOnly.mailThreads,
        messages: localView.snapshotOnly.mailMessages,
        syncRuns: localView.snapshotOnly.mailSyncRuns,
      },
    };
  }

  const admin = createAdminSupabaseClient();
  const [
    profile,
    clients,
    feedbackEntries,
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
    studyDocuments,
  ] = await Promise.all([
    admin.from("profiles").select("*").eq("id", userId).maybeSingle(),
    admin.from("clients").select("*").eq("user_id", userId).order("updated_at", { ascending: false }),
    admin
      .from("feedback_entries")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
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
    exportStudyDocumentsForUser(userId),
  ]);

  if (profile.error) {
    throw new Error("No se ha podido cargar el perfil para la copia de seguridad.");
  }

  if (
    clients.error ||
    feedbackEntries.error ||
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
    feedbackEntries: (feedbackEntries.data as FeedbackEntryRecord[] | null) ?? [],
    auditEvents: [],
    invoices: (invoices.data as InvoiceRecord[] | null) ?? [],
    invoiceReminders: (invoiceReminders.data as InvoiceReminderRecord[] | null) ?? [],
    commercialDocuments:
      (commercialDocuments.data as CommercialDocumentRecord[] | null) ?? [],
    documentSignatureRequests:
      (documentSignatureRequests.data as DocumentSignatureRequestRecord[] | null) ?? [],
    studyDocuments,
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

  if (isLocalFileMode()) {
    await replaceLocalUserData({
      userId,
      email,
      profile: backup.profile
        ? {
            ...backup.profile,
            id: userId,
            email,
          }
        : null,
      clients: backup.clients.map((client) => ({
        ...client,
        user_id: userId,
      })),
      feedbackEntries: backup.feedbackEntries.map((entry) => ({
        ...entry,
        user_id: userId,
      })),
      auditEvents: backup.auditEvents.map((event) => ({
        ...event,
        user_id: userId,
      })),
      invoices: backup.invoices.map((invoice) => ({
        ...invoice,
        user_id: userId,
      })),
      invoiceReminders: backup.invoiceReminders.map((reminder) => ({
        ...reminder,
        user_id: userId,
      })),
      bankMovements: backup.bankMovements.map((movement) => ({
        ...movement,
        user_id: userId,
      })),
      messageConnections: backup.messages.connections.map((connection) => ({
        ...connection,
        user_id: userId,
      })),
      messageThreads: backup.messages.threads.map((thread) => ({
        ...thread,
        user_id: userId,
      })),
      messageRecords: backup.messages.records.map((record) => ({
        ...record,
        user_id: userId,
      })),
      mailThreads: backup.mail.threads.map((thread) => ({
        ...thread,
        user_id: userId,
      })),
      mailMessages: backup.mail.messages.map((message) => ({
        ...message,
        user_id: userId,
      })),
      mailSyncRuns: backup.mail.syncRuns.map((run) => ({
        ...run,
        user_id: userId,
      })),
      commercialDocuments: backup.commercialDocuments.map((document) => ({
        ...document,
        user_id: userId,
      })),
      documentSignatureRequests: backup.documentSignatureRequests.map((request) => ({
        ...request,
        user_id: userId,
      })),
      expenses: backup.expenses.map((expense) => ({
        ...expense,
        user_id: userId,
      })),
      aiUsage: backup.aiUsage.map((entry) => ({
        user_id: userId,
        date: entry.date,
        calls_count: entry.calls_count,
      })),
    });
    await replaceStudyDocumentsForUser(
      userId,
      backup.studyDocuments.map((document) => ({
        ...document,
        user_id: userId,
      })),
    );

    await recordLocalAuditEvent({
      userId,
      actorType: "system",
      actorId: "restore",
      source: "backup",
      action: "backup_restore_completed",
      entityType: "backup",
      entityId: null,
      afterJson: {
        schemaVersion: backup.schemaVersion,
        invoices: backup.invoices.length,
        auditEvents: backup.auditEvents.length,
        studyDocuments: backup.studyDocuments.length,
      },
      contextJson: {
        appUrl: backup.appUrl,
        exportedAt: backup.exportedAt,
      },
    });

    return getBackupCounts(backup);
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
    admin.from("feedback_entries").delete().eq("user_id", userId),
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

  if (backup.feedbackEntries.length > 0) {
    const feedbackInsert = await admin.from("feedback_entries").insert(
      backup.feedbackEntries.map((row) => ({
        ...row,
        user_id: userId,
      })),
    );

    if (feedbackInsert.error) {
      throw new Error("No se ha podido restaurar la bandeja de feedback.");
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

  await replaceStudyDocumentsForUser(
    userId,
    backup.studyDocuments.map((document) => ({
      ...document,
      user_id: userId,
    })),
  );

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

  return getBackupCounts(backup);
}
