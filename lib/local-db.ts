import "server-only";

import { randomUUID } from "node:crypto";
import path from "node:path";
import { promises as fs } from "node:fs";

import initSqlJs, { type Database, type SqlJsStatic } from "sql.js";
import type {
  AppUserRecord,
  BankMovementRecord,
  ClientRecord,
  CommercialDocumentRecord,
  DocumentSignatureRequestRecord,
  ExpenseRecord,
  FeedbackEntryRecord,
  InvoiceRecord,
  InvoiceReminderRecord,
  LocalAuditEventRecord,
  LocalAuthRateLimitRecord,
  MailMessage,
  MailSyncRun,
  MailThread,
  MessageConnection,
  MessageRecord,
  MessageThread,
  Profile,
} from "@/lib/types";
import { getLocalRuntimeEnv } from "@/lib/env";

let sqlJsPromise: Promise<SqlJsStatic> | null = null;
let localDbWriteQueue: Promise<void> = Promise.resolve();

const STRUCTURED_MIRROR_SCHEMA_VERSION = 1;

function runLocalDbWrite<T>(operation: () => Promise<T>): Promise<T> {
  const next = localDbWriteQueue.then(operation, operation);
  localDbWriteQueue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

type StructuredSnapshot = {
  version: number;
  users: Record<string, unknown>[];
  profiles: Record<string, unknown>[];
  clients: Record<string, unknown>[];
  feedbackEntries: Record<string, unknown>[];
  auditEvents: Record<string, unknown>[];
  authRateLimits: Record<string, unknown>[];
  invoices: Record<string, unknown>[];
  invoiceReminders: Record<string, unknown>[];
  bankMovements: Record<string, unknown>[];
  messageConnections: Record<string, unknown>[];
  messageThreads: Record<string, unknown>[];
  messageRecords: Record<string, unknown>[];
  mailThreads: Record<string, unknown>[];
  mailMessages: Record<string, unknown>[];
  mailSyncRuns: Record<string, unknown>[];
  commercialDocuments: Record<string, unknown>[];
  documentSignatureRequests: Record<string, unknown>[];
  expenses: Record<string, unknown>[];
  aiUsage: Record<string, unknown>[];
  counters: {
    invoice_number: number;
    quote_number: number;
    delivery_note_number: number;
  };
};

export type LocalStructuredMirrorSummary = {
  schemaVersion: number | null;
  snapshotVersion: number | null;
  lastSyncedAt: string | null;
  status: "ready" | "disabled_encrypted" | "empty";
  counts: {
    users: number;
    profiles: number;
    clients: number;
    feedbackEntries: number;
    auditEvents: number;
    authRateLimits: number;
    invoices: number;
    invoiceReminders: number;
    bankMovements: number;
    messageConnections: number;
    messageThreads: number;
    messageRecords: number;
    mailThreads: number;
    mailMessages: number;
    mailSyncRuns: number;
    commercialDocuments: number;
    documentSignatureRequests: number;
    expenses: number;
    aiUsage: number;
    counters: number;
  };
};

type StructuredMirrorStatus = "ready" | "disabled_encrypted" | "empty";
export type StructuredAiUsageRow = {
  user_id: string;
  date: string;
  calls_count: number;
};
export type StructuredMirrorSection =
  | "clients"
  | "auditEvents"
  | "bankMovements"
  | "invoices"
  | "invoiceReminders"
  | "messageConnections"
  | "messageThreads"
  | "messageRecords"
  | "mailThreads"
  | "mailMessages"
  | "mailSyncRuns"
  | "expenses"
  | "aiUsage"
  | "counters";
export type StructuredMirrorMutation = {
  users?: Array<AppUserRecord & { password_hash: string }>;
  profiles?: Profile[];
  clients?: ClientRecord[];
  authRateLimits?: LocalAuthRateLimitRecord[];
  feedbackEntries?: FeedbackEntryRecord[];
  auditEvents?: LocalAuditEventRecord[];
  invoices?: InvoiceRecord[];
  invoiceReminders?: InvoiceReminderRecord[];
  bankMovements?: BankMovementRecord[];
  messageConnections?: MessageConnection[];
  messageThreads?: MessageThread[];
  messageRecords?: MessageRecord[];
  mailThreads?: MailThread[];
  mailMessages?: MailMessage[];
  mailSyncRuns?: MailSyncRun[];
  commercialDocuments?: CommercialDocumentRecord[];
  documentSignatureRequests?: DocumentSignatureRequestRecord[];
  expenses?: ExpenseRecord[];
  aiUsage?: StructuredAiUsageRow[];
  counters?: StructuredSnapshot["counters"];
};

export type StructuredLocalCoreSlices = {
  users: Array<AppUserRecord & { password_hash: string }>;
  profiles: Profile[];
  feedbackEntries: FeedbackEntryRecord[];
  clients: ClientRecord[];
  auditEvents: LocalAuditEventRecord[];
  authRateLimits: LocalAuthRateLimitRecord[];
  invoices: InvoiceRecord[];
  invoiceReminders: InvoiceReminderRecord[];
  bankMovements: BankMovementRecord[];
  messageConnections: MessageConnection[];
  messageThreads: MessageThread[];
  messageRecords: MessageRecord[];
  mailThreads: MailThread[];
  mailMessages: MailMessage[];
  mailSyncRuns: MailSyncRun[];
  commercialDocuments: CommercialDocumentRecord[];
  documentSignatureRequests: DocumentSignatureRequestRecord[];
  expenses: ExpenseRecord[];
  aiUsage: StructuredAiUsageRow[];
  counters: StructuredSnapshot["counters"];
};

const STRUCTURED_MIRROR_TABLES = [
  "local_users",
  "local_profiles",
  "local_clients",
  "local_feedback_entries",
  "local_audit_events",
  "local_auth_rate_limits",
  "local_invoices",
  "local_invoice_reminders",
  "local_bank_movements",
  "local_message_connections",
  "local_message_threads",
  "local_message_records",
  "local_mail_threads",
  "local_mail_messages",
  "local_mail_sync_runs",
  "local_commercial_documents",
  "local_document_signature_requests",
  "local_expenses",
  "local_ai_usage",
  "local_counters",
] as const;

const STRUCTURED_MIRROR_TABLE_NAMES = new Set<string>(STRUCTURED_MIRROR_TABLES);

type StatementParams = Parameters<Database["prepare"]>[1];

function getSqlJs() {
  if (!sqlJsPromise) {
    const wasmFilePath = path.join(
      process.cwd(),
      "node_modules",
      "sql.js",
      "dist",
      "sql-wasm.wasm",
    );

    sqlJsPromise = initSqlJs({
      locateFile: () => wasmFilePath,
    });
  }

  return sqlJsPromise;
}

export function getLocalDataDir() {
  return getLocalRuntimeEnv().FACTURAIA_DATA_DIR || path.join(process.cwd(), ".facturaia-local");
}

export function getLocalDatabaseFilePath() {
  return path.join(getLocalDataDir(), "core.sqlite");
}

export function getLegacyLocalJsonFilePath() {
  return path.join(getLocalDataDir(), "core.json");
}

async function ensureLocalDataDir() {
  await fs.mkdir(getLocalDataDir(), { recursive: true });
}

function initializeSchema(db: Database) {
  db.run(`
    CREATE TABLE IF NOT EXISTS local_state (
      state_key TEXT PRIMARY KEY,
      payload_text TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS local_schema_info (
      info_key TEXT PRIMARY KEY,
      info_value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS local_users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS local_profiles (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      full_name TEXT,
      nif TEXT,
      address TEXT,
      logo_path TEXT,
      logo_url TEXT,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS local_clients (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      relation_kind TEXT NOT NULL,
      status TEXT NOT NULL,
      priority TEXT NOT NULL,
      display_name TEXT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      company_name TEXT,
      email TEXT,
      phone TEXT,
      nif TEXT,
      address TEXT,
      notes TEXT,
      tags_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS local_feedback_entries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      source_type TEXT NOT NULL,
      module_key TEXT NOT NULL,
      severity TEXT NOT NULL,
      status TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      reporter_name TEXT,
      contact_email TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS local_audit_events (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      actor_type TEXT NOT NULL,
      actor_id TEXT,
      source TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      before_json TEXT,
      after_json TEXT,
      context_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS local_auth_rate_limits (
      id TEXT PRIMARY KEY,
      scope TEXT NOT NULL,
      email_key TEXT NOT NULL,
      ip_address TEXT,
      failed_attempts INTEGER NOT NULL,
      last_failed_at TEXT,
      locked_until TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS local_invoices (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      public_id TEXT NOT NULL,
      invoice_number INTEGER NOT NULL,
      issue_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      issuer_name TEXT NOT NULL,
      issuer_nif TEXT NOT NULL,
      issuer_address TEXT NOT NULL,
      issuer_logo_url TEXT,
      client_name TEXT NOT NULL,
      client_nif TEXT NOT NULL,
      client_address TEXT NOT NULL,
      client_email TEXT NOT NULL,
      line_items_json TEXT NOT NULL,
      subtotal REAL NOT NULL,
      vat_total REAL NOT NULL,
      irpf_rate REAL NOT NULL,
      irpf_amount REAL NOT NULL,
      grand_total REAL NOT NULL,
      amount_paid REAL NOT NULL,
      payment_status TEXT NOT NULL,
      paid_at TEXT,
      last_reminder_at TEXT,
      reminder_count INTEGER NOT NULL,
      collection_notes TEXT,
      vat_breakdown_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS local_invoice_reminders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      invoice_id TEXT NOT NULL,
      delivery_channel TEXT NOT NULL,
      trigger_mode TEXT NOT NULL,
      batch_key TEXT,
      recipient_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      status TEXT NOT NULL,
      error_message TEXT,
      sent_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS local_bank_movements (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      account_label TEXT,
      booking_date TEXT NOT NULL,
      value_date TEXT,
      description TEXT NOT NULL,
      counterparty_name TEXT,
      amount REAL NOT NULL,
      currency TEXT NOT NULL,
      direction TEXT NOT NULL,
      balance REAL,
      status TEXT NOT NULL,
      matched_invoice_id TEXT,
      matched_expense_id TEXT,
      notes TEXT,
      source_file_name TEXT,
      source_hash TEXT,
      raw_row_json TEXT NOT NULL,
      imported_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS local_message_connections (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      channel TEXT NOT NULL,
      label TEXT NOT NULL,
      status TEXT NOT NULL,
      inbound_key TEXT NOT NULL,
      verify_token TEXT NOT NULL,
      metadata_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS local_message_threads (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      connection_id TEXT,
      channel TEXT NOT NULL,
      external_chat_id TEXT NOT NULL,
      external_contact_id TEXT,
      first_name TEXT,
      last_name TEXT,
      full_name TEXT NOT NULL,
      phone TEXT,
      telegram_username TEXT,
      urgency TEXT NOT NULL,
      urgency_score INTEGER NOT NULL,
      urgency_locked INTEGER NOT NULL,
      unread_count INTEGER NOT NULL,
      last_message_preview TEXT,
      last_message_direction TEXT NOT NULL,
      last_message_at TEXT NOT NULL,
      metadata_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS local_message_records (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      thread_id TEXT NOT NULL,
      channel TEXT NOT NULL,
      external_message_id TEXT,
      direction TEXT NOT NULL,
      sender_name TEXT,
      body TEXT NOT NULL,
      message_type TEXT NOT NULL,
      received_at TEXT NOT NULL,
      raw_payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS local_mail_threads (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      source TEXT NOT NULL,
      external_thread_key TEXT NOT NULL,
      from_name TEXT,
      from_email TEXT NOT NULL,
      subject TEXT,
      urgency TEXT NOT NULL,
      urgency_score INTEGER NOT NULL,
      unread_count INTEGER NOT NULL,
      last_message_preview TEXT,
      last_message_at TEXT NOT NULL,
      metadata_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS local_mail_messages (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      thread_id TEXT NOT NULL,
      source TEXT NOT NULL,
      external_message_id TEXT NOT NULL,
      from_name TEXT,
      from_email TEXT NOT NULL,
      to_emails_json TEXT NOT NULL,
      subject TEXT,
      body_text TEXT NOT NULL,
      body_html TEXT,
      received_at TEXT NOT NULL,
      raw_headers_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS local_mail_sync_runs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      source TEXT NOT NULL,
      status TEXT NOT NULL,
      imported_count INTEGER NOT NULL,
      detail TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS local_commercial_documents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      document_type TEXT NOT NULL,
      status TEXT NOT NULL,
      public_id TEXT NOT NULL,
      document_number INTEGER NOT NULL,
      issue_date TEXT NOT NULL,
      valid_until TEXT,
      issuer_name TEXT NOT NULL,
      issuer_nif TEXT NOT NULL,
      issuer_address TEXT NOT NULL,
      issuer_logo_url TEXT,
      client_name TEXT NOT NULL,
      client_nif TEXT NOT NULL,
      client_address TEXT NOT NULL,
      client_email TEXT NOT NULL,
      line_items_json TEXT NOT NULL,
      vat_breakdown_json TEXT NOT NULL,
      subtotal REAL NOT NULL,
      vat_total REAL NOT NULL,
      irpf_rate REAL NOT NULL,
      irpf_amount REAL NOT NULL,
      grand_total REAL NOT NULL,
      notes TEXT,
      converted_invoice_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS local_document_signature_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      document_id TEXT NOT NULL,
      document_type TEXT NOT NULL,
      request_kind TEXT NOT NULL,
      public_token TEXT NOT NULL,
      status TEXT NOT NULL,
      request_note TEXT,
      requested_at TEXT NOT NULL,
      expires_at TEXT,
      responded_at TEXT,
      viewed_at TEXT,
      revoked_at TEXT,
      signer_name TEXT,
      signer_email TEXT,
      signer_nif TEXT,
      signer_message TEXT,
      accepted_terms INTEGER NOT NULL,
      evidence_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS local_expenses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expense_kind TEXT NOT NULL,
      review_status TEXT NOT NULL,
      vendor_name TEXT,
      vendor_nif TEXT,
      expense_date TEXT,
      currency TEXT NOT NULL,
      base_amount REAL,
      vat_amount REAL,
      total_amount REAL,
      notes TEXT,
      source_file_name TEXT,
      source_file_path TEXT,
      source_file_mime_type TEXT,
      text_extraction_method TEXT NOT NULL,
      raw_text TEXT,
      extracted_payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS local_ai_usage (
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      calls_count INTEGER NOT NULL,
      PRIMARY KEY (user_id, date)
    );

    CREATE TABLE IF NOT EXISTS local_counters (
      counter_key TEXT PRIMARY KEY,
      counter_value INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_local_clients_user_updated
    ON local_clients(user_id, updated_at DESC, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_local_feedback_entries_user_updated
    ON local_feedback_entries(user_id, updated_at DESC, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_local_audit_events_user_created
    ON local_audit_events(user_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_local_audit_events_entity
    ON local_audit_events(entity_type, entity_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_local_auth_rate_limits_scope_email
    ON local_auth_rate_limits(scope, email_key);

    CREATE INDEX IF NOT EXISTS idx_local_auth_rate_limits_locked_until
    ON local_auth_rate_limits(locked_until);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_local_invoices_public_id
    ON local_invoices(public_id);

    CREATE INDEX IF NOT EXISTS idx_local_invoices_user_issue_created
    ON local_invoices(user_id, issue_date DESC, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_local_invoices_user_number
    ON local_invoices(user_id, invoice_number DESC);

    CREATE INDEX IF NOT EXISTS idx_local_invoice_reminders_user_sent
    ON local_invoice_reminders(user_id, sent_at DESC, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_local_invoice_reminders_invoice
    ON local_invoice_reminders(invoice_id, sent_at DESC);

    CREATE INDEX IF NOT EXISTS idx_local_bank_movements_user_booking
    ON local_bank_movements(user_id, booking_date DESC, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_local_message_threads_user_last_message
    ON local_message_threads(user_id, last_message_at DESC);

    CREATE INDEX IF NOT EXISTS idx_local_message_records_thread_received
    ON local_message_records(thread_id, received_at DESC);

    CREATE INDEX IF NOT EXISTS idx_local_mail_threads_user_last_message
    ON local_mail_threads(user_id, last_message_at DESC);

    CREATE INDEX IF NOT EXISTS idx_local_mail_messages_thread_received
    ON local_mail_messages(thread_id, received_at DESC);

    CREATE INDEX IF NOT EXISTS idx_local_commercial_documents_user_issue
    ON local_commercial_documents(user_id, issue_date DESC, created_at DESC);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_local_document_signature_requests_token
    ON local_document_signature_requests(public_token);

    CREATE INDEX IF NOT EXISTS idx_local_document_signature_requests_document
    ON local_document_signature_requests(document_id, requested_at DESC);

    CREATE INDEX IF NOT EXISTS idx_local_expenses_user_date
    ON local_expenses(user_id, expense_date DESC, created_at DESC);
  `);
}

function isStructuredMirrorEnabled() {
  return !getLocalRuntimeEnv().FACTURAIA_ENCRYPT_LOCAL_DATA;
}

function normalizeStructuredSnapshot(parsed: unknown): StructuredSnapshot {
  const candidate = (parsed && typeof parsed === "object" ? parsed : {}) as Record<string, unknown>;

  return {
    version: 1,
    users: Array.isArray(candidate.users) ? (candidate.users as Record<string, unknown>[]) : [],
    profiles: Array.isArray(candidate.profiles)
      ? (candidate.profiles as Record<string, unknown>[])
      : [],
    clients: Array.isArray(candidate.clients) ? (candidate.clients as Record<string, unknown>[]) : [],
    feedbackEntries: Array.isArray(candidate.feedbackEntries)
      ? (candidate.feedbackEntries as Record<string, unknown>[])
      : [],
    auditEvents: Array.isArray(candidate.auditEvents)
      ? (candidate.auditEvents as Record<string, unknown>[])
      : [],
    authRateLimits: Array.isArray(candidate.authRateLimits)
      ? (candidate.authRateLimits as Record<string, unknown>[])
      : [],
    invoices: Array.isArray(candidate.invoices)
      ? (candidate.invoices as Record<string, unknown>[])
      : [],
    invoiceReminders: Array.isArray(candidate.invoiceReminders)
      ? (candidate.invoiceReminders as Record<string, unknown>[])
      : [],
    bankMovements: Array.isArray(candidate.bankMovements)
      ? (candidate.bankMovements as Record<string, unknown>[])
      : [],
    messageConnections: Array.isArray(candidate.messageConnections)
      ? (candidate.messageConnections as Record<string, unknown>[])
      : [],
    messageThreads: Array.isArray(candidate.messageThreads)
      ? (candidate.messageThreads as Record<string, unknown>[])
      : [],
    messageRecords: Array.isArray(candidate.messageRecords)
      ? (candidate.messageRecords as Record<string, unknown>[])
      : [],
    mailThreads: Array.isArray(candidate.mailThreads)
      ? (candidate.mailThreads as Record<string, unknown>[])
      : [],
    mailMessages: Array.isArray(candidate.mailMessages)
      ? (candidate.mailMessages as Record<string, unknown>[])
      : [],
    mailSyncRuns: Array.isArray(candidate.mailSyncRuns)
      ? (candidate.mailSyncRuns as Record<string, unknown>[])
      : [],
    commercialDocuments: Array.isArray(candidate.commercialDocuments)
      ? (candidate.commercialDocuments as Record<string, unknown>[])
      : [],
    documentSignatureRequests: Array.isArray(candidate.documentSignatureRequests)
      ? (candidate.documentSignatureRequests as Record<string, unknown>[])
      : [],
    expenses: Array.isArray(candidate.expenses)
      ? (candidate.expenses as Record<string, unknown>[])
      : [],
    aiUsage: Array.isArray(candidate.aiUsage) ? (candidate.aiUsage as Record<string, unknown>[]) : [],
    counters: {
      invoice_number:
        typeof (candidate.counters as Record<string, unknown> | undefined)?.invoice_number ===
        "number"
          ? ((candidate.counters as Record<string, unknown>).invoice_number as number)
          : 0,
      quote_number:
        typeof (candidate.counters as Record<string, unknown> | undefined)?.quote_number ===
        "number"
          ? ((candidate.counters as Record<string, unknown>).quote_number as number)
          : 0,
      delivery_note_number:
        typeof (candidate.counters as Record<string, unknown> | undefined)?.delivery_note_number ===
        "number"
          ? ((candidate.counters as Record<string, unknown>).delivery_note_number as number)
          : 0,
    },
  };
}

function readPayloadFromDatabase(db: Database) {
  const result = db.exec(
    "SELECT payload_text FROM local_state WHERE state_key = 'core' LIMIT 1;",
  );

  const value = result[0]?.values?.[0]?.[0];
  return typeof value === "string" ? value : null;
}

function writePayloadToDatabase(db: Database, payloadText: string) {
  db.run(
    `
      INSERT INTO local_state (state_key, payload_text, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(state_key)
      DO UPDATE SET
        payload_text = excluded.payload_text,
        updated_at = excluded.updated_at;
    `,
    ["core", payloadText, new Date().toISOString()],
  );
}

function toJsonText(value: unknown) {
  return JSON.stringify(value ?? null);
}

function toSqlValue(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string" || typeof value === "number") {
    return value;
  }

  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }

  return JSON.stringify(value);
}

function replaceTableRows(
  db: Database,
  tableName: string,
  columns: string[],
  rows: Array<Record<string, unknown>>,
) {
  db.run(`DELETE FROM ${tableName};`);

  if (rows.length === 0) {
    return;
  }

  const placeholders = columns.map(() => "?").join(", ");
  const statement = db.prepare(
    `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${placeholders});`,
  );

  try {
    for (const row of rows) {
      statement.run(columns.map((column) => toSqlValue(row[column])));
    }
  } finally {
    statement.free();
  }
}

function upsertSchemaInfo(db: Database, key: string, value: string) {
  db.run(
    `
      INSERT INTO local_schema_info (info_key, info_value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(info_key)
      DO UPDATE SET
        info_value = excluded.info_value,
        updated_at = excluded.updated_at;
    `,
    [key, value, new Date().toISOString()],
  );
}

function replaceStructuredClients(db: Database, parsed: StructuredSnapshot) {
  replaceTableRows(
    db,
    "local_clients",
    [
      "id",
      "user_id",
      "relation_kind",
      "status",
      "priority",
      "display_name",
      "first_name",
      "last_name",
      "company_name",
      "email",
      "phone",
      "nif",
      "address",
      "notes",
      "tags_json",
      "created_at",
      "updated_at",
    ],
    parsed.clients.map((row) => ({
      ...row,
      tags_json: toJsonText(row.tags),
    })),
  );
}

function replaceStructuredAuditEvents(db: Database, parsed: StructuredSnapshot) {
  replaceTableRows(
    db,
    "local_audit_events",
    [
      "id",
      "user_id",
      "actor_type",
      "actor_id",
      "source",
      "action",
      "entity_type",
      "entity_id",
      "before_json",
      "after_json",
      "context_json",
      "created_at",
    ],
    parsed.auditEvents.map((row) => ({
      ...row,
      before_json: toJsonText(row.before_json),
      after_json: toJsonText(row.after_json),
      context_json: toJsonText(row.context_json),
    })),
  );
}

function replaceStructuredInvoices(db: Database, parsed: StructuredSnapshot) {
  replaceTableRows(
    db,
    "local_invoices",
    [
      "id",
      "user_id",
      "public_id",
      "invoice_number",
      "issue_date",
      "due_date",
      "issuer_name",
      "issuer_nif",
      "issuer_address",
      "issuer_logo_url",
      "client_name",
      "client_nif",
      "client_address",
      "client_email",
      "line_items_json",
      "subtotal",
      "vat_total",
      "irpf_rate",
      "irpf_amount",
      "grand_total",
      "amount_paid",
      "payment_status",
      "paid_at",
      "last_reminder_at",
      "reminder_count",
      "collection_notes",
      "vat_breakdown_json",
      "created_at",
      "updated_at",
    ],
    parsed.invoices.map((row) => ({
      ...row,
      line_items_json: toJsonText(row.line_items),
      vat_breakdown_json: toJsonText(row.vat_breakdown),
    })),
  );
}

function replaceStructuredInvoiceReminders(db: Database, parsed: StructuredSnapshot) {
  replaceTableRows(
    db,
    "local_invoice_reminders",
    [
      "id",
      "user_id",
      "invoice_id",
      "delivery_channel",
      "trigger_mode",
      "batch_key",
      "recipient_email",
      "subject",
      "status",
      "error_message",
      "sent_at",
      "created_at",
    ],
    parsed.invoiceReminders,
  );
}

function replaceStructuredCounters(db: Database, parsed: StructuredSnapshot) {
  replaceTableRows(
    db,
    "local_counters",
    ["counter_key", "counter_value"],
    [
      { counter_key: "invoice_number", counter_value: parsed.counters.invoice_number },
      { counter_key: "quote_number", counter_value: parsed.counters.quote_number },
      { counter_key: "delivery_note_number", counter_value: parsed.counters.delivery_note_number },
    ],
  );
}

function upsertTableRow(
  db: Database,
  tableName: string,
  columns: string[],
  conflictColumn: string,
  row: Record<string, unknown>,
) {
  const placeholders = columns.map(() => "?").join(", ");
  const updateAssignments = columns
    .filter((column) => column !== conflictColumn)
    .map((column) => `${column} = excluded.${column}`)
    .join(", ");

  db.run(
    `
      INSERT INTO ${tableName} (${columns.join(", ")})
      VALUES (${placeholders})
      ON CONFLICT(${conflictColumn})
      DO UPDATE SET ${updateAssignments};
    `,
    columns.map((column) => toSqlValue(row[column])),
  );
}

function upsertStructuredClientRows(db: Database, rows: ClientRecord[]) {
  for (const row of rows) {
    upsertTableRow(
      db,
      "local_clients",
      [
        "id",
        "user_id",
        "relation_kind",
        "status",
        "priority",
        "display_name",
        "first_name",
        "last_name",
        "company_name",
        "email",
        "phone",
        "nif",
        "address",
        "notes",
        "tags_json",
        "created_at",
        "updated_at",
      ],
      "id",
      {
        ...row,
        tags_json: toJsonText(row.tags),
      },
    );
  }
}

function upsertStructuredUserRows(
  db: Database,
  rows: Array<AppUserRecord & { password_hash: string }>,
) {
  for (const row of rows) {
    upsertTableRow(
      db,
      "local_users",
      ["id", "email", "password_hash", "created_at", "updated_at"],
      "id",
      row,
    );
  }
}

function upsertStructuredProfileRows(db: Database, rows: Profile[]) {
  for (const row of rows) {
    upsertTableRow(
      db,
      "local_profiles",
      [
        "id",
        "email",
        "full_name",
        "nif",
        "address",
        "logo_path",
        "logo_url",
        "created_at",
        "updated_at",
      ],
      "id",
      row,
    );
  }
}

function upsertStructuredFeedbackRows(db: Database, rows: FeedbackEntryRecord[]) {
  for (const row of rows) {
    upsertTableRow(
      db,
      "local_feedback_entries",
      [
        "id",
        "user_id",
        "source_type",
        "module_key",
        "severity",
        "status",
        "title",
        "message",
        "reporter_name",
        "contact_email",
        "created_at",
        "updated_at",
      ],
      "id",
      row,
    );
  }
}

function upsertStructuredAuthRateLimitRows(
  db: Database,
  rows: LocalAuthRateLimitRecord[],
) {
  for (const row of rows) {
    upsertTableRow(
      db,
      "local_auth_rate_limits",
      [
        "id",
        "scope",
        "email_key",
        "ip_address",
        "failed_attempts",
        "last_failed_at",
        "locked_until",
        "created_at",
        "updated_at",
      ],
      "id",
      row,
    );
  }
}

function upsertStructuredAuditEventRows(db: Database, rows: LocalAuditEventRecord[]) {
  for (const row of rows) {
    upsertTableRow(
      db,
      "local_audit_events",
      [
        "id",
        "user_id",
        "actor_type",
        "actor_id",
        "source",
        "action",
        "entity_type",
        "entity_id",
        "before_json",
        "after_json",
        "context_json",
        "created_at",
      ],
      "id",
      {
        ...row,
        before_json: toJsonText(row.before_json),
        after_json: toJsonText(row.after_json),
        context_json: toJsonText(row.context_json),
      },
    );
  }
}

function upsertStructuredInvoiceRows(db: Database, rows: InvoiceRecord[]) {
  for (const row of rows) {
    upsertTableRow(
      db,
      "local_invoices",
      [
        "id",
        "user_id",
        "public_id",
        "invoice_number",
        "issue_date",
        "due_date",
        "issuer_name",
        "issuer_nif",
        "issuer_address",
        "issuer_logo_url",
        "client_name",
        "client_nif",
        "client_address",
        "client_email",
        "line_items_json",
        "subtotal",
        "vat_total",
        "irpf_rate",
        "irpf_amount",
        "grand_total",
        "amount_paid",
        "payment_status",
        "paid_at",
        "last_reminder_at",
        "reminder_count",
        "collection_notes",
        "vat_breakdown_json",
        "created_at",
        "updated_at",
      ],
      "id",
      {
        ...row,
        line_items_json: toJsonText(row.line_items),
        vat_breakdown_json: toJsonText(row.vat_breakdown),
      },
    );
  }
}

function upsertStructuredInvoiceReminderRows(db: Database, rows: InvoiceReminderRecord[]) {
  for (const row of rows) {
    upsertTableRow(
      db,
      "local_invoice_reminders",
      [
        "id",
        "user_id",
        "invoice_id",
        "delivery_channel",
        "trigger_mode",
        "batch_key",
        "recipient_email",
        "subject",
        "status",
        "error_message",
        "sent_at",
        "created_at",
      ],
      "id",
      row,
    );
  }
}

function upsertStructuredBankMovementRows(db: Database, rows: BankMovementRecord[]) {
  for (const row of rows) {
    upsertTableRow(
      db,
      "local_bank_movements",
      [
        "id",
        "user_id",
        "account_label",
        "booking_date",
        "value_date",
        "description",
        "counterparty_name",
        "amount",
        "currency",
        "direction",
        "balance",
        "status",
        "matched_invoice_id",
        "matched_expense_id",
        "notes",
        "source_file_name",
        "source_hash",
        "raw_row_json",
        "imported_at",
        "created_at",
        "updated_at",
      ],
      "id",
      {
        ...row,
        raw_row_json: toJsonText(row.raw_row),
      },
    );
  }
}

function upsertStructuredMessageConnectionRows(db: Database, rows: MessageConnection[]) {
  for (const row of rows) {
    upsertTableRow(
      db,
      "local_message_connections",
      [
        "id",
        "user_id",
        "channel",
        "label",
        "status",
        "inbound_key",
        "verify_token",
        "metadata_json",
        "created_at",
        "updated_at",
      ],
      "id",
      {
        ...row,
        metadata_json: toJsonText(row.metadata),
      },
    );
  }
}

function upsertStructuredMessageThreadRows(db: Database, rows: MessageThread[]) {
  for (const row of rows) {
    upsertTableRow(
      db,
      "local_message_threads",
      [
        "id",
        "user_id",
        "connection_id",
        "channel",
        "external_chat_id",
        "external_contact_id",
        "first_name",
        "last_name",
        "full_name",
        "phone",
        "telegram_username",
        "urgency",
        "urgency_score",
        "urgency_locked",
        "unread_count",
        "last_message_preview",
        "last_message_direction",
        "last_message_at",
        "metadata_json",
        "created_at",
        "updated_at",
      ],
      "id",
      {
        ...row,
        urgency_locked: row.urgency_locked ? 1 : 0,
        metadata_json: toJsonText(row.metadata),
      },
    );
  }
}

function upsertStructuredMessageRecordRows(db: Database, rows: MessageRecord[]) {
  for (const row of rows) {
    upsertTableRow(
      db,
      "local_message_records",
      [
        "id",
        "user_id",
        "thread_id",
        "channel",
        "external_message_id",
        "direction",
        "sender_name",
        "body",
        "message_type",
        "received_at",
        "raw_payload_json",
        "created_at",
      ],
      "id",
      {
        ...row,
        raw_payload_json: toJsonText(row.raw_payload),
      },
    );
  }
}

function upsertStructuredMailThreadRows(db: Database, rows: MailThread[]) {
  for (const row of rows) {
    upsertTableRow(
      db,
      "local_mail_threads",
      [
        "id",
        "user_id",
        "source",
        "external_thread_key",
        "from_name",
        "from_email",
        "subject",
        "urgency",
        "urgency_score",
        "unread_count",
        "last_message_preview",
        "last_message_at",
        "metadata_json",
        "created_at",
        "updated_at",
      ],
      "id",
      {
        ...row,
        metadata_json: toJsonText(row.metadata),
      },
    );
  }
}

function upsertStructuredMailMessageRows(db: Database, rows: MailMessage[]) {
  for (const row of rows) {
    upsertTableRow(
      db,
      "local_mail_messages",
      [
        "id",
        "user_id",
        "thread_id",
        "source",
        "external_message_id",
        "from_name",
        "from_email",
        "to_emails_json",
        "subject",
        "body_text",
        "body_html",
        "received_at",
        "raw_headers_json",
        "created_at",
      ],
      "id",
      {
        ...row,
        to_emails_json: toJsonText(row.to_emails),
        raw_headers_json: toJsonText(row.raw_headers),
      },
    );
  }
}

function upsertStructuredMailSyncRunRows(db: Database, rows: MailSyncRun[]) {
  for (const row of rows) {
    upsertTableRow(
      db,
      "local_mail_sync_runs",
      [
        "id",
        "user_id",
        "source",
        "status",
        "imported_count",
        "detail",
        "created_at",
      ],
      "id",
      row,
    );
  }
}

function upsertStructuredCommercialDocumentRows(
  db: Database,
  rows: CommercialDocumentRecord[],
) {
  for (const row of rows) {
    upsertTableRow(
      db,
      "local_commercial_documents",
      [
        "id",
        "user_id",
        "document_type",
        "status",
        "public_id",
        "document_number",
        "issue_date",
        "valid_until",
        "issuer_name",
        "issuer_nif",
        "issuer_address",
        "issuer_logo_url",
        "client_name",
        "client_nif",
        "client_address",
        "client_email",
        "line_items_json",
        "vat_breakdown_json",
        "subtotal",
        "vat_total",
        "irpf_rate",
        "irpf_amount",
        "grand_total",
        "notes",
        "converted_invoice_id",
        "created_at",
        "updated_at",
      ],
      "id",
      {
        ...row,
        line_items_json: toJsonText(row.line_items),
        vat_breakdown_json: toJsonText(row.vat_breakdown),
      },
    );
  }
}

function upsertStructuredDocumentSignatureRequestRows(
  db: Database,
  rows: DocumentSignatureRequestRecord[],
) {
  for (const row of rows) {
    upsertTableRow(
      db,
      "local_document_signature_requests",
      [
        "id",
        "user_id",
        "document_id",
        "document_type",
        "request_kind",
        "public_token",
        "status",
        "request_note",
        "requested_at",
        "expires_at",
        "responded_at",
        "viewed_at",
        "revoked_at",
        "signer_name",
        "signer_email",
        "signer_nif",
        "signer_message",
        "accepted_terms",
        "evidence_json",
        "created_at",
        "updated_at",
      ],
      "id",
      {
        ...row,
        revoked_at: row.status === "revoked" ? row.responded_at : null,
        accepted_terms:
          typeof row.evidence?.acceptedTerms === "boolean" && row.evidence.acceptedTerms
            ? 1
            : 0,
        evidence_json: toJsonText(row.evidence),
      },
    );
  }
}

function upsertStructuredExpenseRows(db: Database, rows: ExpenseRecord[]) {
  for (const row of rows) {
    upsertTableRow(
      db,
      "local_expenses",
      [
        "id",
        "user_id",
        "expense_kind",
        "review_status",
        "vendor_name",
        "vendor_nif",
        "expense_date",
        "currency",
        "base_amount",
        "vat_amount",
        "total_amount",
        "notes",
        "source_file_name",
        "source_file_path",
        "source_file_mime_type",
        "text_extraction_method",
        "raw_text",
        "extracted_payload_json",
        "created_at",
        "updated_at",
      ],
      "id",
      {
        ...row,
        extracted_payload_json: toJsonText(row.extracted_payload),
      },
    );
  }
}

function upsertStructuredAiUsageRows(db: Database, rows: StructuredAiUsageRow[]) {
  for (const row of rows) {
    upsertTableRow(
      db,
      "local_ai_usage",
      ["user_id", "date", "calls_count"],
      "user_id, date",
      row,
    );
  }
}

function upsertStructuredCounters(db: Database, counters: StructuredSnapshot["counters"]) {
  upsertTableRow(
    db,
    "local_counters",
    ["counter_key", "counter_value"],
    "counter_key",
    { counter_key: "invoice_number", counter_value: counters.invoice_number },
  );
  upsertTableRow(
    db,
    "local_counters",
    ["counter_key", "counter_value"],
    "counter_key",
    { counter_key: "quote_number", counter_value: counters.quote_number },
  );
  upsertTableRow(
    db,
    "local_counters",
    ["counter_key", "counter_value"],
    "counter_key",
    { counter_key: "delivery_note_number", counter_value: counters.delivery_note_number },
  );
}

function deleteRowsByUserId(db: Database, tableName: string, userId: string) {
  db.run(`DELETE FROM ${tableName} WHERE user_id = ?;`, [userId]);
}

function deleteRowsByColumn(
  db: Database,
  tableName: string,
  columnName: string,
  value: string,
) {
  db.run(`DELETE FROM ${tableName} WHERE ${columnName} = ?;`, [value]);
}

function readSchemaInfo(db: Database, key: string) {
  const result = db.exec(
    "SELECT info_value FROM local_schema_info WHERE info_key = ? LIMIT 1;",
    [key],
  );

  const value = result[0]?.values?.[0]?.[0];
  return typeof value === "string" ? value : null;
}

function getStructuredMirrorStatus(db: Database): StructuredMirrorStatus {
  return (
    (readSchemaInfo(db, "structured_mirror_status") as StructuredMirrorStatus | null) ??
    "empty"
  );
}

function parseJsonObjectField(value: unknown) {
  if (typeof value !== "string" || !value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function parseJsonArrayField<T>(value: unknown) {
  if (typeof value !== "string" || !value) {
    return [] as T[];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : ([] as T[]);
  } catch {
    return [] as T[];
  }
}

function mapClientRow(values: unknown[]): ClientRecord {
  return {
    id: String(values[0] ?? ""),
    user_id: String(values[1] ?? ""),
    relation_kind: String(values[2] ?? "client") as ClientRecord["relation_kind"],
    status: String(values[3] ?? "lead") as ClientRecord["status"],
    priority: String(values[4] ?? "medium") as ClientRecord["priority"],
    display_name: String(values[5] ?? ""),
    first_name: values[6] === null ? null : String(values[6] ?? ""),
    last_name: values[7] === null ? null : String(values[7] ?? ""),
    company_name: values[8] === null ? null : String(values[8] ?? ""),
    email: values[9] === null ? null : String(values[9] ?? ""),
    phone: values[10] === null ? null : String(values[10] ?? ""),
    nif: values[11] === null ? null : String(values[11] ?? ""),
    address: values[12] === null ? null : String(values[12] ?? ""),
    notes: values[13] === null ? null : String(values[13] ?? ""),
    tags: parseJsonArrayField<string>(values[14]),
    created_at: String(values[15] ?? ""),
    updated_at: String(values[16] ?? ""),
  };
}

function mapUserRow(values: unknown[]) {
  return {
    id: String(values[0] ?? ""),
    email: String(values[1] ?? ""),
    password_hash: String(values[2] ?? ""),
    created_at: String(values[3] ?? ""),
    updated_at: String(values[4] ?? ""),
  } satisfies AppUserRecord & { password_hash: string };
}

function mapProfileRow(values: unknown[]): Profile {
  return {
    id: String(values[0] ?? ""),
    email: String(values[1] ?? ""),
    full_name: values[2] === null ? null : String(values[2] ?? ""),
    nif: values[3] === null ? null : String(values[3] ?? ""),
    address: values[4] === null ? null : String(values[4] ?? ""),
    logo_path: values[5] === null ? null : String(values[5] ?? ""),
    logo_url: values[6] === null ? null : String(values[6] ?? ""),
    created_at: values[7] === null ? undefined : String(values[7] ?? ""),
    updated_at: values[8] === null ? undefined : String(values[8] ?? ""),
  };
}

function mapFeedbackEntryRow(values: unknown[]): FeedbackEntryRecord {
  return {
    id: String(values[0] ?? ""),
    user_id: String(values[1] ?? ""),
    source_type: String(values[2] ?? "self") as FeedbackEntryRecord["source_type"],
    module_key: String(values[3] ?? ""),
    severity: String(values[4] ?? "medium") as FeedbackEntryRecord["severity"],
    status: String(values[5] ?? "open") as FeedbackEntryRecord["status"],
    title: String(values[6] ?? ""),
    message: String(values[7] ?? ""),
    reporter_name: values[8] === null ? null : String(values[8] ?? ""),
    contact_email: values[9] === null ? null : String(values[9] ?? ""),
    created_at: String(values[10] ?? ""),
    updated_at: String(values[11] ?? ""),
  };
}

function mapAuthRateLimitRow(values: unknown[]): LocalAuthRateLimitRecord {
  return {
    id: String(values[0] ?? ""),
    scope: String(values[1] ?? "local_login") as LocalAuthRateLimitRecord["scope"],
    email_key: String(values[2] ?? ""),
    ip_address: values[3] === null ? null : String(values[3] ?? ""),
    failed_attempts: Number(values[4] ?? 0),
    last_failed_at: values[5] === null ? null : String(values[5] ?? ""),
    locked_until: values[6] === null ? null : String(values[6] ?? ""),
    created_at: String(values[7] ?? ""),
    updated_at: String(values[8] ?? ""),
  };
}

function mapBankMovementRow(values: unknown[]): BankMovementRecord {
  return {
    id: String(values[0] ?? ""),
    user_id: String(values[1] ?? ""),
    account_label: String(values[2] ?? ""),
    booking_date: String(values[3] ?? ""),
    value_date: values[4] === null ? null : String(values[4] ?? ""),
    description: String(values[5] ?? ""),
    counterparty_name: values[6] === null ? null : String(values[6] ?? ""),
    amount: Number(values[7] ?? 0),
    currency: String(values[8] ?? "EUR"),
    direction: String(values[9] ?? "debit") as BankMovementRecord["direction"],
    balance: values[10] === null ? null : Number(values[10] ?? 0),
    status: String(values[11] ?? "pending") as BankMovementRecord["status"],
    matched_invoice_id: values[12] === null ? null : String(values[12] ?? ""),
    matched_expense_id: values[13] === null ? null : String(values[13] ?? ""),
    notes: values[14] === null ? null : String(values[14] ?? ""),
    source_file_name: values[15] === null ? null : String(values[15] ?? ""),
    source_hash: String(values[16] ?? ""),
    raw_row: parseJsonObjectField(values[17]) ?? {},
    imported_at: String(values[18] ?? ""),
    created_at: String(values[19] ?? ""),
    updated_at: String(values[20] ?? ""),
  };
}

function mapMessageConnectionRow(values: unknown[]): MessageConnection {
  return {
    id: String(values[0] ?? ""),
    user_id: String(values[1] ?? ""),
    channel: String(values[2] ?? "whatsapp") as MessageConnection["channel"],
    label: String(values[3] ?? ""),
    status: String(values[4] ?? "draft") as MessageConnection["status"],
    inbound_key: String(values[5] ?? ""),
    verify_token: String(values[6] ?? ""),
    metadata: parseJsonObjectField(values[7]) ?? {},
    created_at: String(values[8] ?? ""),
    updated_at: String(values[9] ?? ""),
  };
}

function mapMessageThreadRow(values: unknown[]): MessageThread {
  return {
    id: String(values[0] ?? ""),
    user_id: String(values[1] ?? ""),
    connection_id: values[2] === null ? null : String(values[2] ?? ""),
    channel: String(values[3] ?? "whatsapp") as MessageThread["channel"],
    external_chat_id: String(values[4] ?? ""),
    external_contact_id: values[5] === null ? null : String(values[5] ?? ""),
    first_name: values[6] === null ? null : String(values[6] ?? ""),
    last_name: values[7] === null ? null : String(values[7] ?? ""),
    full_name: String(values[8] ?? ""),
    phone: values[9] === null ? null : String(values[9] ?? ""),
    telegram_username: values[10] === null ? null : String(values[10] ?? ""),
    urgency: String(values[11] ?? "normal") as MessageThread["urgency"],
    urgency_score: Number(values[12] ?? 0),
    urgency_locked: Boolean(values[13]),
    unread_count: Number(values[14] ?? 0),
    last_message_preview: values[15] === null ? null : String(values[15] ?? ""),
    last_message_direction: String(values[16] ?? "inbound") as MessageThread["last_message_direction"],
    last_message_at: String(values[17] ?? ""),
    metadata: parseJsonObjectField(values[18]) ?? {},
    created_at: String(values[19] ?? ""),
    updated_at: String(values[20] ?? ""),
  };
}

function mapMessageRecordRow(values: unknown[]): MessageRecord {
  return {
    id: String(values[0] ?? ""),
    user_id: String(values[1] ?? ""),
    thread_id: String(values[2] ?? ""),
    channel: String(values[3] ?? "whatsapp") as MessageRecord["channel"],
    external_message_id: values[4] === null ? null : String(values[4] ?? ""),
    direction: String(values[5] ?? "inbound") as MessageRecord["direction"],
    sender_name: values[6] === null ? null : String(values[6] ?? ""),
    body: String(values[7] ?? ""),
    message_type: String(values[8] ?? "text"),
    received_at: String(values[9] ?? ""),
    raw_payload: parseJsonObjectField(values[10]) ?? {},
    created_at: String(values[11] ?? ""),
  };
}

function mapMailThreadRow(values: unknown[]): MailThread {
  return {
    id: String(values[0] ?? ""),
    user_id: String(values[1] ?? ""),
    source: String(values[2] ?? "imap") as MailThread["source"],
    external_thread_key: String(values[3] ?? ""),
    from_name: values[4] === null ? null : String(values[4] ?? ""),
    from_email: String(values[5] ?? ""),
    subject: values[6] === null ? null : String(values[6] ?? ""),
    urgency: String(values[7] ?? "normal") as MailThread["urgency"],
    urgency_score: Number(values[8] ?? 0),
    unread_count: Number(values[9] ?? 0),
    last_message_preview: values[10] === null ? null : String(values[10] ?? ""),
    last_message_at: String(values[11] ?? ""),
    metadata: parseJsonObjectField(values[12]) ?? {},
    created_at: String(values[13] ?? ""),
    updated_at: String(values[14] ?? ""),
  };
}

function mapMailMessageRow(values: unknown[]): MailMessage {
  return {
    id: String(values[0] ?? ""),
    user_id: String(values[1] ?? ""),
    thread_id: String(values[2] ?? ""),
    source: String(values[3] ?? "imap") as MailMessage["source"],
    external_message_id: String(values[4] ?? ""),
    from_name: values[5] === null ? null : String(values[5] ?? ""),
    from_email: String(values[6] ?? ""),
    to_emails: parseJsonArrayField(values[7]).map((value) => String(value)),
    subject: values[8] === null ? null : String(values[8] ?? ""),
    body_text: String(values[9] ?? ""),
    body_html: values[10] === null ? null : String(values[10] ?? ""),
    received_at: String(values[11] ?? ""),
    raw_headers: parseJsonObjectField(values[12]) ?? {},
    created_at: String(values[13] ?? ""),
  };
}

function mapMailSyncRunRow(values: unknown[]): MailSyncRun {
  return {
    id: String(values[0] ?? ""),
    user_id: String(values[1] ?? ""),
    source: String(values[2] ?? "imap") as MailSyncRun["source"],
    status: String(values[3] ?? "success") as MailSyncRun["status"],
    imported_count: Number(values[4] ?? 0),
    detail: values[5] === null ? null : String(values[5] ?? ""),
    created_at: String(values[6] ?? ""),
  };
}

function mapCommercialDocumentRow(values: unknown[]): CommercialDocumentRecord {
  return {
    id: String(values[0] ?? ""),
    user_id: String(values[1] ?? ""),
    document_type: String(values[2] ?? "quote") as CommercialDocumentRecord["document_type"],
    status: String(values[3] ?? "draft") as CommercialDocumentRecord["status"],
    public_id: String(values[4] ?? ""),
    document_number: Number(values[5] ?? 0),
    issue_date: String(values[6] ?? ""),
    valid_until: values[7] === null ? null : String(values[7] ?? ""),
    issuer_name: String(values[8] ?? ""),
    issuer_nif: String(values[9] ?? ""),
    issuer_address: String(values[10] ?? ""),
    issuer_logo_url: values[11] === null ? null : String(values[11] ?? ""),
    client_name: String(values[12] ?? ""),
    client_nif: String(values[13] ?? ""),
    client_address: String(values[14] ?? ""),
    client_email: String(values[15] ?? ""),
    line_items: parseJsonArrayField(values[16]),
    vat_breakdown: parseJsonArrayField(values[17]),
    subtotal: Number(values[18] ?? 0),
    vat_total: Number(values[19] ?? 0),
    irpf_rate: Number(values[20] ?? 0),
    irpf_amount: Number(values[21] ?? 0),
    grand_total: Number(values[22] ?? 0),
    notes: values[23] === null ? null : String(values[23] ?? ""),
    converted_invoice_id: values[24] === null ? null : String(values[24] ?? ""),
    created_at: String(values[25] ?? ""),
    updated_at: String(values[26] ?? ""),
  };
}

function mapDocumentSignatureRequestRow(
  values: unknown[],
): DocumentSignatureRequestRecord {
  return {
    id: String(values[0] ?? ""),
    user_id: String(values[1] ?? ""),
    document_id: String(values[2] ?? ""),
    document_type: String(values[3] ?? "quote") as DocumentSignatureRequestRecord["document_type"],
    request_kind: String(values[4] ?? "quote_acceptance") as DocumentSignatureRequestRecord["request_kind"],
    public_token: String(values[5] ?? ""),
    status: String(values[6] ?? "pending") as DocumentSignatureRequestRecord["status"],
    request_note: values[7] === null ? null : String(values[7] ?? ""),
    requested_at: String(values[8] ?? ""),
    expires_at: values[9] === null ? null : String(values[9] ?? ""),
    responded_at: values[10] === null ? null : String(values[10] ?? ""),
    viewed_at: values[11] === null ? null : String(values[11] ?? ""),
    signer_name: values[13] === null ? null : String(values[13] ?? ""),
    signer_email: values[14] === null ? null : String(values[14] ?? ""),
    signer_nif: values[15] === null ? null : String(values[15] ?? ""),
    signer_message: values[16] === null ? null : String(values[16] ?? ""),
    evidence: parseJsonObjectField(values[18]) ?? {},
    created_at: String(values[19] ?? ""),
    updated_at: String(values[20] ?? ""),
  };
}

function mapExpenseRow(values: unknown[]): ExpenseRecord {
  return {
    id: String(values[0] ?? ""),
    user_id: String(values[1] ?? ""),
    expense_kind: String(values[2] ?? "ticket") as ExpenseRecord["expense_kind"],
    review_status: String(values[3] ?? "draft") as ExpenseRecord["review_status"],
    vendor_name: values[4] === null ? null : String(values[4] ?? ""),
    vendor_nif: values[5] === null ? null : String(values[5] ?? ""),
    expense_date: values[6] === null ? null : String(values[6] ?? ""),
    currency: String(values[7] ?? "EUR"),
    base_amount: values[8] === null ? null : Number(values[8] ?? 0),
    vat_amount: values[9] === null ? null : Number(values[9] ?? 0),
    total_amount: values[10] === null ? null : Number(values[10] ?? 0),
    notes: values[11] === null ? null : String(values[11] ?? ""),
    source_file_name: values[12] === null ? null : String(values[12] ?? ""),
    source_file_path: values[13] === null ? null : String(values[13] ?? ""),
    source_file_mime_type: values[14] === null ? null : String(values[14] ?? ""),
    text_extraction_method: String(values[15] ?? "manual") as ExpenseRecord["text_extraction_method"],
    raw_text: values[16] === null ? null : String(values[16] ?? ""),
    extracted_payload: parseJsonObjectField(values[17]) ?? {},
    created_at: String(values[18] ?? ""),
    updated_at: String(values[19] ?? ""),
  };
}

function mapAiUsageRow(values: unknown[]): StructuredAiUsageRow {
  return {
    user_id: String(values[0] ?? ""),
    date: String(values[1] ?? ""),
    calls_count: Number(values[2] ?? 0),
  };
}

function mapInvoiceRow(values: unknown[]): InvoiceRecord {
  return {
    id: String(values[0] ?? ""),
    user_id: String(values[1] ?? ""),
    public_id: String(values[2] ?? ""),
    invoice_number: Number(values[3] ?? 0),
    issue_date: String(values[4] ?? ""),
    due_date: String(values[5] ?? ""),
    issuer_name: String(values[6] ?? ""),
    issuer_nif: String(values[7] ?? ""),
    issuer_address: String(values[8] ?? ""),
    issuer_logo_url: values[9] === null ? null : String(values[9] ?? ""),
    client_name: String(values[10] ?? ""),
    client_nif: String(values[11] ?? ""),
    client_address: String(values[12] ?? ""),
    client_email: String(values[13] ?? ""),
    line_items: parseJsonArrayField<InvoiceRecord["line_items"][number]>(values[14]),
    subtotal: Number(values[15] ?? 0),
    vat_total: Number(values[16] ?? 0),
    irpf_rate: Number(values[17] ?? 0),
    irpf_amount: Number(values[18] ?? 0),
    grand_total: Number(values[19] ?? 0),
    amount_paid: Number(values[20] ?? 0),
    payment_status: String(values[21] ?? "pending") as InvoiceRecord["payment_status"],
    paid_at: values[22] === null ? null : String(values[22] ?? ""),
    last_reminder_at: values[23] === null ? null : String(values[23] ?? ""),
    reminder_count: Number(values[24] ?? 0),
    collection_notes: values[25] === null ? null : String(values[25] ?? ""),
    vat_breakdown: parseJsonArrayField<InvoiceRecord["vat_breakdown"][number]>(values[26]),
    created_at: String(values[27] ?? ""),
    updated_at: String(values[28] ?? ""),
  };
}

function mapInvoiceReminderRow(values: unknown[]): InvoiceReminderRecord {
  return {
    id: String(values[0] ?? ""),
    user_id: String(values[1] ?? ""),
    invoice_id: String(values[2] ?? ""),
    delivery_channel: String(values[3] ?? "email") as InvoiceReminderRecord["delivery_channel"],
    trigger_mode: String(values[4] ?? "manual") as InvoiceReminderRecord["trigger_mode"],
    batch_key: values[5] === null ? null : String(values[5] ?? ""),
    recipient_email: String(values[6] ?? ""),
    subject: String(values[7] ?? ""),
    status: String(values[8] ?? "sent") as InvoiceReminderRecord["status"],
    error_message: values[9] === null ? null : String(values[9] ?? ""),
    sent_at: String(values[10] ?? ""),
    created_at: String(values[11] ?? ""),
  };
}

function mapAuditEventRow(values: unknown[]): LocalAuditEventRecord {
  return {
    id: String(values[0] ?? ""),
    user_id: values[1] === null ? null : String(values[1] ?? ""),
    actor_type: String(values[2] ?? "system") as LocalAuditEventRecord["actor_type"],
    actor_id: values[3] === null ? null : String(values[3] ?? ""),
    source: String(values[4] ?? "system") as LocalAuditEventRecord["source"],
    action: String(values[5] ?? ""),
    entity_type: String(values[6] ?? ""),
    entity_id: values[7] === null ? null : String(values[7] ?? ""),
    before_json: parseJsonObjectField(values[8]),
    after_json: parseJsonObjectField(values[9]),
    context_json: parseJsonObjectField(values[10]) ?? {},
    created_at: String(values[11] ?? ""),
  };
}

function clearStructuredMirrorTables(db: Database) {
  for (const tableName of STRUCTURED_MIRROR_TABLES) {
    db.run(`DELETE FROM ${tableName};`);
  }
}

function resetStructuredMirror(
  db: Database,
  status: "disabled_encrypted" | "empty",
  snapshotVersion: number | null = null,
) {
  db.run("BEGIN TRANSACTION;");

  try {
    clearStructuredMirrorTables(db);
    upsertSchemaInfo(db, "structured_mirror_schema_version", String(STRUCTURED_MIRROR_SCHEMA_VERSION));
    upsertSchemaInfo(
      db,
      "structured_mirror_snapshot_version",
      snapshotVersion === null ? "0" : String(snapshotVersion),
    );
    upsertSchemaInfo(db, "structured_mirror_last_synced_at", new Date().toISOString());
    upsertSchemaInfo(db, "structured_mirror_status", status);
    db.run("COMMIT;");
  } catch (error) {
    db.run("ROLLBACK;");
    throw error;
  }
}

function syncStructuredMirror(db: Database, snapshotText: string) {
  const parsed = normalizeStructuredSnapshot(JSON.parse(snapshotText));
  const syncedAt = new Date().toISOString();

  db.run("BEGIN TRANSACTION;");

  try {
    replaceTableRows(db, "local_users", ["id", "email", "password_hash", "created_at", "updated_at"], parsed.users);
    replaceTableRows(
      db,
      "local_profiles",
      ["id", "email", "full_name", "nif", "address", "logo_path", "logo_url", "created_at", "updated_at"],
      parsed.profiles,
    );
    replaceTableRows(
      db,
      "local_clients",
      [
        "id",
        "user_id",
        "relation_kind",
        "status",
        "priority",
        "display_name",
        "first_name",
        "last_name",
        "company_name",
        "email",
        "phone",
        "nif",
        "address",
        "notes",
        "tags_json",
        "created_at",
        "updated_at",
      ],
      parsed.clients.map((row) => ({
        ...row,
        tags_json: toJsonText(row.tags),
      })),
    );
    replaceTableRows(
      db,
      "local_feedback_entries",
      [
        "id",
        "user_id",
        "source_type",
        "module_key",
        "severity",
        "status",
        "title",
        "message",
        "reporter_name",
        "contact_email",
        "created_at",
        "updated_at",
      ],
      parsed.feedbackEntries,
    );
    replaceTableRows(
      db,
      "local_audit_events",
      [
        "id",
        "user_id",
        "actor_type",
        "actor_id",
        "source",
        "action",
        "entity_type",
        "entity_id",
        "before_json",
        "after_json",
        "context_json",
        "created_at",
      ],
      parsed.auditEvents.map((row) => ({
        ...row,
        before_json: toJsonText(row.before_json),
        after_json: toJsonText(row.after_json),
        context_json: toJsonText(row.context_json),
      })),
    );
    replaceTableRows(
      db,
      "local_auth_rate_limits",
      [
        "id",
        "scope",
        "email_key",
        "ip_address",
        "failed_attempts",
        "last_failed_at",
        "locked_until",
        "created_at",
        "updated_at",
      ],
      parsed.authRateLimits,
    );
    replaceTableRows(
      db,
      "local_invoices",
      [
        "id",
        "user_id",
        "public_id",
        "invoice_number",
        "issue_date",
        "due_date",
        "issuer_name",
        "issuer_nif",
        "issuer_address",
        "issuer_logo_url",
        "client_name",
        "client_nif",
        "client_address",
        "client_email",
        "line_items_json",
        "subtotal",
        "vat_total",
        "irpf_rate",
        "irpf_amount",
        "grand_total",
        "amount_paid",
        "payment_status",
        "paid_at",
        "last_reminder_at",
        "reminder_count",
        "collection_notes",
        "vat_breakdown_json",
        "created_at",
        "updated_at",
      ],
      parsed.invoices.map((row) => ({
        ...row,
        line_items_json: toJsonText(row.line_items),
        vat_breakdown_json: toJsonText(row.vat_breakdown),
      })),
    );
    replaceTableRows(
      db,
      "local_invoice_reminders",
      [
        "id",
        "user_id",
        "invoice_id",
        "delivery_channel",
        "trigger_mode",
        "batch_key",
        "recipient_email",
        "subject",
        "status",
        "error_message",
        "sent_at",
        "created_at",
      ],
      parsed.invoiceReminders,
    );
    replaceTableRows(
      db,
      "local_bank_movements",
      [
        "id",
        "user_id",
        "account_label",
        "booking_date",
        "value_date",
        "description",
        "counterparty_name",
        "amount",
        "currency",
        "direction",
        "balance",
        "status",
        "matched_invoice_id",
        "matched_expense_id",
        "notes",
        "source_file_name",
        "source_hash",
        "raw_row_json",
        "imported_at",
        "created_at",
        "updated_at",
      ],
      parsed.bankMovements.map((row) => ({
        ...row,
        raw_row_json: toJsonText(row.raw_row),
      })),
    );
    replaceTableRows(
      db,
      "local_message_connections",
      [
        "id",
        "user_id",
        "channel",
        "label",
        "status",
        "inbound_key",
        "verify_token",
        "metadata_json",
        "created_at",
        "updated_at",
      ],
      parsed.messageConnections.map((row) => ({
        ...row,
        metadata_json: toJsonText(row.metadata),
      })),
    );
    replaceTableRows(
      db,
      "local_message_threads",
      [
        "id",
        "user_id",
        "connection_id",
        "channel",
        "external_chat_id",
        "external_contact_id",
        "first_name",
        "last_name",
        "full_name",
        "phone",
        "telegram_username",
        "urgency",
        "urgency_score",
        "urgency_locked",
        "unread_count",
        "last_message_preview",
        "last_message_direction",
        "last_message_at",
        "metadata_json",
        "created_at",
        "updated_at",
      ],
      parsed.messageThreads.map((row) => ({
        ...row,
        urgency_locked: row.urgency_locked ? 1 : 0,
        metadata_json: toJsonText(row.metadata),
      })),
    );
    replaceTableRows(
      db,
      "local_message_records",
      [
        "id",
        "user_id",
        "thread_id",
        "channel",
        "external_message_id",
        "direction",
        "sender_name",
        "body",
        "message_type",
        "received_at",
        "raw_payload_json",
        "created_at",
      ],
      parsed.messageRecords.map((row) => ({
        ...row,
        raw_payload_json: toJsonText(row.raw_payload),
      })),
    );
    replaceTableRows(
      db,
      "local_mail_threads",
      [
        "id",
        "user_id",
        "source",
        "external_thread_key",
        "from_name",
        "from_email",
        "subject",
        "urgency",
        "urgency_score",
        "unread_count",
        "last_message_preview",
        "last_message_at",
        "metadata_json",
        "created_at",
        "updated_at",
      ],
      parsed.mailThreads.map((row) => ({
        ...row,
        metadata_json: toJsonText(row.metadata),
      })),
    );
    replaceTableRows(
      db,
      "local_mail_messages",
      [
        "id",
        "user_id",
        "thread_id",
        "source",
        "external_message_id",
        "from_name",
        "from_email",
        "to_emails_json",
        "subject",
        "body_text",
        "body_html",
        "received_at",
        "raw_headers_json",
        "created_at",
      ],
      parsed.mailMessages.map((row) => ({
        ...row,
        to_emails_json: toJsonText(row.to_emails),
        raw_headers_json: toJsonText(row.raw_headers),
      })),
    );
    replaceTableRows(
      db,
      "local_mail_sync_runs",
      ["id", "user_id", "source", "status", "imported_count", "detail", "created_at"],
      parsed.mailSyncRuns,
    );
    replaceTableRows(
      db,
      "local_commercial_documents",
      [
        "id",
        "user_id",
        "document_type",
        "status",
        "public_id",
        "document_number",
        "issue_date",
        "valid_until",
        "issuer_name",
        "issuer_nif",
        "issuer_address",
        "issuer_logo_url",
        "client_name",
        "client_nif",
        "client_address",
        "client_email",
        "line_items_json",
        "vat_breakdown_json",
        "subtotal",
        "vat_total",
        "irpf_rate",
        "irpf_amount",
        "grand_total",
        "notes",
        "converted_invoice_id",
        "created_at",
        "updated_at",
      ],
      parsed.commercialDocuments.map((row) => ({
        ...row,
        line_items_json: toJsonText(row.line_items),
        vat_breakdown_json: toJsonText(row.vat_breakdown),
      })),
    );
    replaceTableRows(
      db,
      "local_document_signature_requests",
      [
        "id",
        "user_id",
        "document_id",
        "document_type",
        "request_kind",
        "public_token",
        "status",
        "request_note",
        "requested_at",
        "expires_at",
        "responded_at",
        "viewed_at",
        "revoked_at",
        "signer_name",
        "signer_email",
        "signer_nif",
        "signer_message",
        "accepted_terms",
        "evidence_json",
        "created_at",
        "updated_at",
      ],
      parsed.documentSignatureRequests.map((row) => ({
        ...row,
        accepted_terms: row.accepted_terms ? 1 : 0,
        evidence_json: toJsonText(row.evidence),
      })),
    );
    replaceTableRows(
      db,
      "local_expenses",
      [
        "id",
        "user_id",
        "expense_kind",
        "review_status",
        "vendor_name",
        "vendor_nif",
        "expense_date",
        "currency",
        "base_amount",
        "vat_amount",
        "total_amount",
        "notes",
        "source_file_name",
        "source_file_path",
        "source_file_mime_type",
        "text_extraction_method",
        "raw_text",
        "extracted_payload_json",
        "created_at",
        "updated_at",
      ],
      parsed.expenses.map((row) => ({
        ...row,
        extracted_payload_json: toJsonText(row.extracted_payload),
      })),
    );
    replaceTableRows(
      db,
      "local_ai_usage",
      ["user_id", "date", "calls_count"],
      parsed.aiUsage,
    );
    replaceTableRows(
      db,
      "local_counters",
      ["counter_key", "counter_value"],
      [
        { counter_key: "invoice_number", counter_value: parsed.counters.invoice_number },
        { counter_key: "quote_number", counter_value: parsed.counters.quote_number },
        { counter_key: "delivery_note_number", counter_value: parsed.counters.delivery_note_number },
      ],
    );

    upsertSchemaInfo(db, "structured_mirror_schema_version", String(STRUCTURED_MIRROR_SCHEMA_VERSION));
    upsertSchemaInfo(db, "structured_mirror_snapshot_version", String(parsed.version));
    upsertSchemaInfo(db, "structured_mirror_last_synced_at", syncedAt);
    upsertSchemaInfo(db, "structured_mirror_status", "ready");
    db.run("COMMIT;");
  } catch (error) {
    db.run("ROLLBACK;");
    throw error;
  }
}

function syncStructuredMirrorSections(
  db: Database,
  snapshotText: string,
  sections: StructuredMirrorSection[],
) {
  const parsed = normalizeStructuredSnapshot(JSON.parse(snapshotText));
  const syncedAt = new Date().toISOString();

  db.run("BEGIN TRANSACTION;");

  try {
    for (const section of sections) {
      if (section === "clients") {
        replaceStructuredClients(db, parsed);
      } else if (section === "auditEvents") {
        replaceStructuredAuditEvents(db, parsed);
      } else if (section === "invoices") {
        replaceStructuredInvoices(db, parsed);
      } else if (section === "invoiceReminders") {
        replaceStructuredInvoiceReminders(db, parsed);
      } else if (section === "counters") {
        replaceStructuredCounters(db, parsed);
      }
    }

    upsertSchemaInfo(db, "structured_mirror_schema_version", String(STRUCTURED_MIRROR_SCHEMA_VERSION));
    upsertSchemaInfo(db, "structured_mirror_snapshot_version", String(parsed.version));
    upsertSchemaInfo(db, "structured_mirror_last_synced_at", syncedAt);
    upsertSchemaInfo(db, "structured_mirror_status", "ready");
    db.run("COMMIT;");
  } catch (error) {
    db.run("ROLLBACK;");
    throw error;
  }
}

function applyStructuredMirrorMutation(
  db: Database,
  mutation: StructuredMirrorMutation,
) {
  const syncedAt = new Date().toISOString();
  const currentSnapshotVersion = Number(readSchemaInfo(db, "structured_mirror_snapshot_version") ?? 0);

  db.run("BEGIN TRANSACTION;");

  try {
    if (mutation.users?.length) {
      upsertStructuredUserRows(db, mutation.users);
    }

    if (mutation.profiles?.length) {
      upsertStructuredProfileRows(db, mutation.profiles);
    }

    if (mutation.clients?.length) {
      upsertStructuredClientRows(db, mutation.clients);
    }

    if (mutation.feedbackEntries?.length) {
      upsertStructuredFeedbackRows(db, mutation.feedbackEntries);
    }

    if (mutation.auditEvents?.length) {
      upsertStructuredAuditEventRows(db, mutation.auditEvents);
    }

    if (mutation.authRateLimits?.length) {
      upsertStructuredAuthRateLimitRows(db, mutation.authRateLimits);
    }

    if (mutation.invoices?.length) {
      upsertStructuredInvoiceRows(db, mutation.invoices);
    }

    if (mutation.invoiceReminders?.length) {
      upsertStructuredInvoiceReminderRows(db, mutation.invoiceReminders);
    }

    if (mutation.bankMovements?.length) {
      upsertStructuredBankMovementRows(db, mutation.bankMovements);
    }

    if (mutation.messageConnections?.length) {
      upsertStructuredMessageConnectionRows(db, mutation.messageConnections);
    }

    if (mutation.messageThreads?.length) {
      upsertStructuredMessageThreadRows(db, mutation.messageThreads);
    }

    if (mutation.messageRecords?.length) {
      upsertStructuredMessageRecordRows(db, mutation.messageRecords);
    }

    if (mutation.mailThreads?.length) {
      upsertStructuredMailThreadRows(db, mutation.mailThreads);
    }

    if (mutation.mailMessages?.length) {
      upsertStructuredMailMessageRows(db, mutation.mailMessages);
    }

    if (mutation.mailSyncRuns?.length) {
      upsertStructuredMailSyncRunRows(db, mutation.mailSyncRuns);
    }

    if (mutation.commercialDocuments?.length) {
      upsertStructuredCommercialDocumentRows(db, mutation.commercialDocuments);
    }

    if (mutation.documentSignatureRequests?.length) {
      upsertStructuredDocumentSignatureRequestRows(
        db,
        mutation.documentSignatureRequests,
      );
    }

    if (mutation.expenses?.length) {
      upsertStructuredExpenseRows(db, mutation.expenses);
    }

    if (mutation.aiUsage?.length) {
      upsertStructuredAiUsageRows(db, mutation.aiUsage);
    }

    if (mutation.counters) {
      upsertStructuredCounters(db, mutation.counters);
    }

    upsertSchemaInfo(db, "structured_mirror_schema_version", String(STRUCTURED_MIRROR_SCHEMA_VERSION));
    upsertSchemaInfo(
      db,
      "structured_mirror_snapshot_version",
      String(currentSnapshotVersion > 0 ? currentSnapshotVersion : 1),
    );
    upsertSchemaInfo(db, "structured_mirror_last_synced_at", syncedAt);
    upsertSchemaInfo(db, "structured_mirror_status", "ready");
    db.run("COMMIT;");
  } catch (error) {
    db.run("ROLLBACK;");
    throw error;
  }
}

async function persistDatabase(db: Database) {
  await ensureLocalDataDir();
  const filePath = getLocalDatabaseFilePath();
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.${randomUUID()}.tmp`;
  const binary = db.export();

  await fs.writeFile(tempPath, Buffer.from(binary));
  await fs.rename(tempPath, filePath);
}

async function openDatabase() {
  const SQL = await getSqlJs();
  const filePath = getLocalDatabaseFilePath();

  try {
    const binary = await fs.readFile(filePath);
    const db = new SQL.Database(new Uint8Array(binary));
    initializeSchema(db);
    return db;
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code !== "ENOENT") {
      throw error;
    }

    const db = new SQL.Database();
    initializeSchema(db);
    return db;
  }
}

async function migrateLegacyJsonIfNeeded() {
  const dbPath = getLocalDatabaseFilePath();
  const legacyPath = getLegacyLocalJsonFilePath();
  const [dbExists, legacyExists] = await Promise.all([
    fs.access(dbPath).then(() => true).catch(() => false),
    fs.access(legacyPath).then(() => true).catch(() => false),
  ]);

  if (dbExists || !legacyExists) {
    return null;
  }

  const raw = await fs.readFile(legacyPath, "utf8");
  const db = await openDatabase();

  try {
    writePayloadToDatabase(db, raw);
    if (isStructuredMirrorEnabled()) {
      syncStructuredMirror(db, raw);
    } else {
      resetStructuredMirror(db, "disabled_encrypted", 1);
    }
    await persistDatabase(db);
  } finally {
    db.close();
  }

  return raw;
}

export async function readLocalStateText() {
  const migrated = await migrateLegacyJsonIfNeeded();

  if (migrated) {
    return migrated;
  }

  const db = await openDatabase();

  try {
    return readPayloadFromDatabase(db);
  } finally {
    db.close();
  }
}

export async function writeLocalStateText(
  payloadText: string,
  snapshotText = payloadText,
  options?: {
    structuredSections?: StructuredMirrorSection[];
    structuredMutation?: StructuredMirrorMutation;
    skipStructuredMirrorSync?: boolean;
  },
) {
  return runLocalDbWrite(async () => {
    const db = await openDatabase();

    try {
      writePayloadToDatabase(db, payloadText);
      if (options?.skipStructuredMirrorSync) {
        // The caller already persisted the targeted structured mutation and only needs to
        // keep the compatibility snapshot aligned.
      } else if (isStructuredMirrorEnabled()) {
        const structuredSections = options?.structuredSections;
        const structuredMutation = options?.structuredMutation;

        if (
          structuredMutation &&
          getStructuredMirrorStatus(db) === "ready"
        ) {
          applyStructuredMirrorMutation(db, structuredMutation);
        } else if (
          Array.isArray(structuredSections) &&
          structuredSections.length > 0 &&
          getStructuredMirrorStatus(db) === "ready"
        ) {
          syncStructuredMirrorSections(db, snapshotText, structuredSections);
        } else {
          syncStructuredMirror(db, snapshotText);
        }
      } else {
        resetStructuredMirror(db, "disabled_encrypted", 1);
      }
      await persistDatabase(db);
    } finally {
      db.close();
    }
  });
}

export async function persistStructuredLocalMutation(
  mutation: StructuredMirrorMutation,
): Promise<boolean> {
  return runLocalDbWrite(async () => {
    const db = await openDatabase();

    try {
      if (getStructuredMirrorStatus(db) === "disabled_encrypted") {
        return false;
      }

      applyStructuredMirrorMutation(db, mutation);
      await persistDatabase(db);
      return true;
    } finally {
      db.close();
    }
  });
}

export async function replaceStructuredLocalClientsForUser(
  userId: string,
  clients: ClientRecord[],
): Promise<boolean> {
  return runLocalDbWrite(async () => {
    const db = await openDatabase();

    try {
      if (getStructuredMirrorStatus(db) === "disabled_encrypted") {
        return false;
      }

      const syncedAt = new Date().toISOString();
      const currentSnapshotVersion = Number(readSchemaInfo(db, "structured_mirror_snapshot_version") ?? 0);
      db.run("BEGIN TRANSACTION;");

      try {
        deleteRowsByUserId(db, "local_clients", userId);

        if (clients.length > 0) {
          upsertStructuredClientRows(db, clients);
        }

        upsertSchemaInfo(db, "structured_mirror_schema_version", String(STRUCTURED_MIRROR_SCHEMA_VERSION));
        upsertSchemaInfo(
          db,
          "structured_mirror_snapshot_version",
          String(currentSnapshotVersion > 0 ? currentSnapshotVersion : 1),
        );
        upsertSchemaInfo(db, "structured_mirror_last_synced_at", syncedAt);
        upsertSchemaInfo(db, "structured_mirror_status", "ready");
        db.run("COMMIT;");
      } catch (error) {
        db.run("ROLLBACK;");
        throw error;
      }

      await persistDatabase(db);
      return true;
    } finally {
      db.close();
    }
  });
}

export async function replaceStructuredLocalIdentityForUser({
  user,
  profile,
  authRateLimits,
}: {
  user: AppUserRecord & { password_hash: string };
  profile: Profile | null;
  authRateLimits: LocalAuthRateLimitRecord[];
}): Promise<boolean> {
  return runLocalDbWrite(async () => {
    const db = await openDatabase();

    try {
      if (getStructuredMirrorStatus(db) === "disabled_encrypted") {
        return false;
      }

    const syncedAt = new Date().toISOString();
    const currentSnapshotVersion = Number(
      readSchemaInfo(db, "structured_mirror_snapshot_version") ?? 0,
    );
    db.run("BEGIN TRANSACTION;");

    try {
      deleteRowsByColumn(db, "local_users", "id", user.id);
      deleteRowsByColumn(db, "local_profiles", "id", user.id);
      deleteRowsByColumn(
        db,
        "local_auth_rate_limits",
        "email_key",
        user.email.trim().toLowerCase(),
      );

      upsertStructuredUserRows(db, [user]);

      if (profile) {
        upsertStructuredProfileRows(db, [profile]);
      }

      if (authRateLimits.length > 0) {
        upsertStructuredAuthRateLimitRows(db, authRateLimits);
      }

      upsertSchemaInfo(
        db,
        "structured_mirror_schema_version",
        String(STRUCTURED_MIRROR_SCHEMA_VERSION),
      );
      upsertSchemaInfo(
        db,
        "structured_mirror_snapshot_version",
        String(currentSnapshotVersion > 0 ? currentSnapshotVersion : 1),
      );
      upsertSchemaInfo(db, "structured_mirror_last_synced_at", syncedAt);
      upsertSchemaInfo(db, "structured_mirror_status", "ready");
      db.run("COMMIT;");
    } catch (error) {
      db.run("ROLLBACK;");
      throw error;
    }

      await persistDatabase(db);
      return true;
    } finally {
      db.close();
    }
  });
}

export async function replaceStructuredLocalInvoicesForUser({
  userId,
  invoices,
  invoiceReminders,
  auditEvents,
  counters,
}: {
  userId: string;
  invoices: InvoiceRecord[];
  invoiceReminders: InvoiceReminderRecord[];
  auditEvents?: LocalAuditEventRecord[];
  counters?: StructuredSnapshot["counters"];
}): Promise<boolean> {
  return runLocalDbWrite(async () => {
    const db = await openDatabase();

    try {
      if (getStructuredMirrorStatus(db) === "disabled_encrypted") {
        return false;
      }

    const syncedAt = new Date().toISOString();
    const currentSnapshotVersion = Number(readSchemaInfo(db, "structured_mirror_snapshot_version") ?? 0);
    db.run("BEGIN TRANSACTION;");

    try {
      deleteRowsByUserId(db, "local_invoices", userId);
      deleteRowsByUserId(db, "local_invoice_reminders", userId);

      if (auditEvents !== undefined) {
        deleteRowsByUserId(db, "local_audit_events", userId);
      }

      if (invoices.length > 0) {
        upsertStructuredInvoiceRows(db, invoices);
      }

      if (invoiceReminders.length > 0) {
        upsertStructuredInvoiceReminderRows(db, invoiceReminders);
      }

      if (auditEvents?.length) {
        upsertStructuredAuditEventRows(db, auditEvents);
      }

      if (counters) {
        upsertStructuredCounters(db, counters);
      }

      upsertSchemaInfo(db, "structured_mirror_schema_version", String(STRUCTURED_MIRROR_SCHEMA_VERSION));
      upsertSchemaInfo(
        db,
        "structured_mirror_snapshot_version",
        String(currentSnapshotVersion > 0 ? currentSnapshotVersion : 1),
      );
      upsertSchemaInfo(db, "structured_mirror_last_synced_at", syncedAt);
      upsertSchemaInfo(db, "structured_mirror_status", "ready");
      db.run("COMMIT;");
    } catch (error) {
      db.run("ROLLBACK;");
      throw error;
    }

      await persistDatabase(db);
      return true;
    } finally {
      db.close();
    }
  });
}

export async function replaceStructuredLocalAuditEventsForUser(
  userId: string,
  auditEvents: LocalAuditEventRecord[],
): Promise<boolean> {
  return runLocalDbWrite(async () => {
    const db = await openDatabase();

    try {
      if (getStructuredMirrorStatus(db) === "disabled_encrypted") {
        return false;
      }

    const syncedAt = new Date().toISOString();
    const currentSnapshotVersion = Number(
      readSchemaInfo(db, "structured_mirror_snapshot_version") ?? 0,
    );
    db.run("BEGIN TRANSACTION;");

    try {
      deleteRowsByUserId(db, "local_audit_events", userId);

      if (auditEvents.length > 0) {
        upsertStructuredAuditEventRows(db, auditEvents);
      }

      upsertSchemaInfo(
        db,
        "structured_mirror_schema_version",
        String(STRUCTURED_MIRROR_SCHEMA_VERSION),
      );
      upsertSchemaInfo(
        db,
        "structured_mirror_snapshot_version",
        String(currentSnapshotVersion > 0 ? currentSnapshotVersion : 1),
      );
      upsertSchemaInfo(db, "structured_mirror_last_synced_at", syncedAt);
      upsertSchemaInfo(db, "structured_mirror_status", "ready");
      db.run("COMMIT;");
    } catch (error) {
      db.run("ROLLBACK;");
      throw error;
    }

      await persistDatabase(db);
      return true;
    } finally {
      db.close();
    }
  });
}

export async function replaceStructuredLocalFeedbackEntriesForUser(
  userId: string,
  feedbackEntries: FeedbackEntryRecord[],
): Promise<boolean> {
  return runLocalDbWrite(async () => {
    const db = await openDatabase();

    try {
      if (getStructuredMirrorStatus(db) === "disabled_encrypted") {
        return false;
      }

    const syncedAt = new Date().toISOString();
    const currentSnapshotVersion = Number(
      readSchemaInfo(db, "structured_mirror_snapshot_version") ?? 0,
    );
    db.run("BEGIN TRANSACTION;");

    try {
      deleteRowsByUserId(db, "local_feedback_entries", userId);

      if (feedbackEntries.length > 0) {
        upsertStructuredFeedbackRows(db, feedbackEntries);
      }

      upsertSchemaInfo(
        db,
        "structured_mirror_schema_version",
        String(STRUCTURED_MIRROR_SCHEMA_VERSION),
      );
      upsertSchemaInfo(
        db,
        "structured_mirror_snapshot_version",
        String(currentSnapshotVersion > 0 ? currentSnapshotVersion : 1),
      );
      upsertSchemaInfo(db, "structured_mirror_last_synced_at", syncedAt);
      upsertSchemaInfo(db, "structured_mirror_status", "ready");
      db.run("COMMIT;");
    } catch (error) {
      db.run("ROLLBACK;");
      throw error;
    }

      await persistDatabase(db);
      return true;
    } finally {
      db.close();
    }
  });
}

export async function replaceStructuredLocalCommercialStateForUser({
  userId,
  commercialDocuments,
  documentSignatureRequests,
}: {
  userId: string;
  commercialDocuments: CommercialDocumentRecord[];
  documentSignatureRequests: DocumentSignatureRequestRecord[];
}): Promise<boolean> {
  return runLocalDbWrite(async () => {
    const db = await openDatabase();

    try {
      if (getStructuredMirrorStatus(db) === "disabled_encrypted") {
        return false;
      }

    const syncedAt = new Date().toISOString();
    const currentSnapshotVersion = Number(
      readSchemaInfo(db, "structured_mirror_snapshot_version") ?? 0,
    );
    db.run("BEGIN TRANSACTION;");

    try {
      deleteRowsByUserId(db, "local_commercial_documents", userId);
      deleteRowsByUserId(db, "local_document_signature_requests", userId);

      if (commercialDocuments.length > 0) {
        upsertStructuredCommercialDocumentRows(db, commercialDocuments);
      }

      if (documentSignatureRequests.length > 0) {
        upsertStructuredDocumentSignatureRequestRows(
          db,
          documentSignatureRequests,
        );
      }

      upsertSchemaInfo(
        db,
        "structured_mirror_schema_version",
        String(STRUCTURED_MIRROR_SCHEMA_VERSION),
      );
      upsertSchemaInfo(
        db,
        "structured_mirror_snapshot_version",
        String(currentSnapshotVersion > 0 ? currentSnapshotVersion : 1),
      );
      upsertSchemaInfo(db, "structured_mirror_last_synced_at", syncedAt);
      upsertSchemaInfo(db, "structured_mirror_status", "ready");
      db.run("COMMIT;");
    } catch (error) {
      db.run("ROLLBACK;");
      throw error;
    }

      await persistDatabase(db);
      return true;
    } finally {
      db.close();
    }
  });
}

export async function replaceStructuredLocalExpensesForUser(
  userId: string,
  expenses: ExpenseRecord[],
): Promise<boolean> {
  return runLocalDbWrite(async () => {
    const db = await openDatabase();

    try {
      if (getStructuredMirrorStatus(db) === "disabled_encrypted") {
        return false;
      }

    const syncedAt = new Date().toISOString();
    const currentSnapshotVersion = Number(
      readSchemaInfo(db, "structured_mirror_snapshot_version") ?? 0,
    );
    db.run("BEGIN TRANSACTION;");

    try {
      deleteRowsByUserId(db, "local_expenses", userId);

      if (expenses.length > 0) {
        upsertStructuredExpenseRows(db, expenses);
      }

      upsertSchemaInfo(
        db,
        "structured_mirror_schema_version",
        String(STRUCTURED_MIRROR_SCHEMA_VERSION),
      );
      upsertSchemaInfo(
        db,
        "structured_mirror_snapshot_version",
        String(currentSnapshotVersion > 0 ? currentSnapshotVersion : 1),
      );
      upsertSchemaInfo(db, "structured_mirror_last_synced_at", syncedAt);
      upsertSchemaInfo(db, "structured_mirror_status", "ready");
      db.run("COMMIT;");
    } catch (error) {
      db.run("ROLLBACK;");
      throw error;
    }

      await persistDatabase(db);
      return true;
    } finally {
      db.close();
    }
  });
}

export async function replaceStructuredLocalBankMovementsForUser(
  userId: string,
  bankMovements: BankMovementRecord[],
): Promise<boolean> {
  return runLocalDbWrite(async () => {
    const db = await openDatabase();

    try {
      if (getStructuredMirrorStatus(db) === "disabled_encrypted") {
        return false;
      }

    const syncedAt = new Date().toISOString();
    const currentSnapshotVersion = Number(
      readSchemaInfo(db, "structured_mirror_snapshot_version") ?? 0,
    );
    db.run("BEGIN TRANSACTION;");

    try {
      deleteRowsByUserId(db, "local_bank_movements", userId);

      if (bankMovements.length > 0) {
        upsertStructuredBankMovementRows(db, bankMovements);
      }

      upsertSchemaInfo(
        db,
        "structured_mirror_schema_version",
        String(STRUCTURED_MIRROR_SCHEMA_VERSION),
      );
      upsertSchemaInfo(
        db,
        "structured_mirror_snapshot_version",
        String(currentSnapshotVersion > 0 ? currentSnapshotVersion : 1),
      );
      upsertSchemaInfo(db, "structured_mirror_last_synced_at", syncedAt);
      upsertSchemaInfo(db, "structured_mirror_status", "ready");
      db.run("COMMIT;");
    } catch (error) {
      db.run("ROLLBACK;");
      throw error;
    }

      await persistDatabase(db);
      return true;
    } finally {
      db.close();
    }
  });
}

export async function replaceStructuredLocalMessagingStateForUser({
  userId,
  messageConnections,
  messageThreads,
  messageRecords,
}: {
  userId: string;
  messageConnections: MessageConnection[];
  messageThreads: MessageThread[];
  messageRecords: MessageRecord[];
}): Promise<boolean> {
  return runLocalDbWrite(async () => {
    const db = await openDatabase();

    try {
      if (getStructuredMirrorStatus(db) === "disabled_encrypted") {
        return false;
      }

    const syncedAt = new Date().toISOString();
    const currentSnapshotVersion = Number(
      readSchemaInfo(db, "structured_mirror_snapshot_version") ?? 0,
    );
    db.run("BEGIN TRANSACTION;");

    try {
      deleteRowsByUserId(db, "local_message_connections", userId);
      deleteRowsByUserId(db, "local_message_threads", userId);
      deleteRowsByUserId(db, "local_message_records", userId);

      if (messageConnections.length > 0) {
        upsertStructuredMessageConnectionRows(db, messageConnections);
      }
      if (messageThreads.length > 0) {
        upsertStructuredMessageThreadRows(db, messageThreads);
      }
      if (messageRecords.length > 0) {
        upsertStructuredMessageRecordRows(db, messageRecords);
      }

      upsertSchemaInfo(
        db,
        "structured_mirror_schema_version",
        String(STRUCTURED_MIRROR_SCHEMA_VERSION),
      );
      upsertSchemaInfo(
        db,
        "structured_mirror_snapshot_version",
        String(currentSnapshotVersion > 0 ? currentSnapshotVersion : 1),
      );
      upsertSchemaInfo(db, "structured_mirror_last_synced_at", syncedAt);
      upsertSchemaInfo(db, "structured_mirror_status", "ready");
      db.run("COMMIT;");
    } catch (error) {
      db.run("ROLLBACK;");
      throw error;
    }

      await persistDatabase(db);
      return true;
    } finally {
      db.close();
    }
  });
}

export async function replaceStructuredLocalMailStateForUser({
  userId,
  mailThreads,
  mailMessages,
  mailSyncRuns,
}: {
  userId: string;
  mailThreads: MailThread[];
  mailMessages: MailMessage[];
  mailSyncRuns: MailSyncRun[];
}): Promise<boolean> {
  return runLocalDbWrite(async () => {
    const db = await openDatabase();

    try {
      if (getStructuredMirrorStatus(db) === "disabled_encrypted") {
        return false;
      }

    const syncedAt = new Date().toISOString();
    const currentSnapshotVersion = Number(
      readSchemaInfo(db, "structured_mirror_snapshot_version") ?? 0,
    );
    db.run("BEGIN TRANSACTION;");

    try {
      deleteRowsByUserId(db, "local_mail_threads", userId);
      deleteRowsByUserId(db, "local_mail_messages", userId);
      deleteRowsByUserId(db, "local_mail_sync_runs", userId);

      if (mailThreads.length > 0) {
        upsertStructuredMailThreadRows(db, mailThreads);
      }
      if (mailMessages.length > 0) {
        upsertStructuredMailMessageRows(db, mailMessages);
      }
      if (mailSyncRuns.length > 0) {
        upsertStructuredMailSyncRunRows(db, mailSyncRuns);
      }

      upsertSchemaInfo(
        db,
        "structured_mirror_schema_version",
        String(STRUCTURED_MIRROR_SCHEMA_VERSION),
      );
      upsertSchemaInfo(
        db,
        "structured_mirror_snapshot_version",
        String(currentSnapshotVersion > 0 ? currentSnapshotVersion : 1),
      );
      upsertSchemaInfo(db, "structured_mirror_last_synced_at", syncedAt);
      upsertSchemaInfo(db, "structured_mirror_status", "ready");
      db.run("COMMIT;");
    } catch (error) {
      db.run("ROLLBACK;");
      throw error;
    }

      await persistDatabase(db);
      return true;
    } finally {
      db.close();
    }
  });
}

export async function replaceStructuredLocalAiUsageForUser(
  userId: string,
  aiUsage: StructuredAiUsageRow[],
): Promise<boolean> {
  return runLocalDbWrite(async () => {
    const db = await openDatabase();

    try {
      if (getStructuredMirrorStatus(db) === "disabled_encrypted") {
        return false;
      }

      const syncedAt = new Date().toISOString();
      const currentSnapshotVersion = Number(
        readSchemaInfo(db, "structured_mirror_snapshot_version") ?? 0,
      );
      db.run("BEGIN TRANSACTION;");

      try {
        deleteRowsByUserId(db, "local_ai_usage", userId);

        if (aiUsage.length > 0) {
          upsertStructuredAiUsageRows(db, aiUsage);
        }

        upsertSchemaInfo(
          db,
          "structured_mirror_schema_version",
          String(STRUCTURED_MIRROR_SCHEMA_VERSION),
        );
        upsertSchemaInfo(
          db,
          "structured_mirror_snapshot_version",
          String(currentSnapshotVersion > 0 ? currentSnapshotVersion : 1),
        );
        upsertSchemaInfo(db, "structured_mirror_last_synced_at", syncedAt);
        upsertSchemaInfo(db, "structured_mirror_status", "ready");
        db.run("COMMIT;");
      } catch (error) {
        db.run("ROLLBACK;");
        throw error;
      }

      await persistDatabase(db);
      return true;
    } finally {
      db.close();
    }
  });
}

export async function replaceStructuredLocalAuthRateLimitsForEmail(
  emailKey: string,
  authRateLimits: LocalAuthRateLimitRecord[],
): Promise<boolean> {
  const db = await openDatabase();

  try {
    if (getStructuredMirrorStatus(db) === "disabled_encrypted") {
      return false;
    }

    const syncedAt = new Date().toISOString();
    const currentSnapshotVersion = Number(
      readSchemaInfo(db, "structured_mirror_snapshot_version") ?? 0,
    );
    db.run("BEGIN TRANSACTION;");

    try {
      deleteRowsByColumn(
        db,
        "local_auth_rate_limits",
        "email_key",
        emailKey.trim().toLowerCase(),
      );

      if (authRateLimits.length > 0) {
        upsertStructuredAuthRateLimitRows(db, authRateLimits);
      }

      upsertSchemaInfo(
        db,
        "structured_mirror_schema_version",
        String(STRUCTURED_MIRROR_SCHEMA_VERSION),
      );
      upsertSchemaInfo(
        db,
        "structured_mirror_snapshot_version",
        String(currentSnapshotVersion > 0 ? currentSnapshotVersion : 1),
      );
      upsertSchemaInfo(db, "structured_mirror_last_synced_at", syncedAt);
      upsertSchemaInfo(db, "structured_mirror_status", "ready");
      db.run("COMMIT;");
    } catch (error) {
      db.run("ROLLBACK;");
      throw error;
    }

    await persistDatabase(db);
    return true;
  } finally {
    db.close();
  }
}

export async function getStructuredLocalCounters(): Promise<StructuredSnapshot["counters"] | null> {
  const db = await openDatabase();

  try {
    if (getStructuredMirrorStatus(db) === "disabled_encrypted") {
      return null;
    }

    const counterRows = queryRows(
      db,
      `
        SELECT counter_key, counter_value
        FROM local_counters;
      `,
      undefined,
      (values) => ({
        key: String(values[0] ?? ""),
        value: Number(values[1] ?? 0),
      }),
    );

    const counters: StructuredSnapshot["counters"] = {
      invoice_number: 0,
      quote_number: 0,
      delivery_note_number: 0,
    };

    for (const row of counterRows) {
      if (row.key === "invoice_number") {
        counters.invoice_number = row.value;
      } else if (row.key === "quote_number") {
        counters.quote_number = row.value;
      } else if (row.key === "delivery_note_number") {
        counters.delivery_note_number = row.value;
      }
    }

    return counters;
  } finally {
    db.close();
  }
}

export async function getStructuredLocalUserCount(): Promise<number | null> {
  const db = await openDatabase();

  try {
    if (getStructuredMirrorStatus(db) !== "ready") {
      return null;
    }

    return queryScalarNumber(db, "SELECT COUNT(*) FROM local_users;");
  } finally {
    db.close();
  }
}

function getTableCount(db: Database, tableName: string) {
  if (!STRUCTURED_MIRROR_TABLE_NAMES.has(tableName)) {
    throw new Error(`Unsupported structured mirror table: ${tableName}`);
  }

  return queryScalarNumber(db, `SELECT COUNT(*) FROM ${tableName};`);
}

function queryRows<T>(
  db: Database,
  sql: string,
  params: StatementParams,
  mapRow: (values: unknown[]) => T,
): T[] {
  const statement = db.prepare(sql, params);

  try {
    const rows: T[] = [];

    while (statement.step()) {
      rows.push(mapRow(statement.get()));
    }

    return rows;
  } finally {
    statement.free();
  }
}

function queryFirstRow<T>(
  db: Database,
  sql: string,
  params: StatementParams,
  mapRow: (values: unknown[]) => T,
): T | null {
  const statement = db.prepare(sql, params);

  try {
    if (!statement.step()) {
      return null;
    }

    return mapRow(statement.get());
  } finally {
    statement.free();
  }
}

function queryScalarNumber(db: Database, sql: string, params?: StatementParams) {
  const statement = db.prepare(sql, params);

  try {
    if (!statement.step()) {
      return 0;
    }

    const value = statement.get()?.[0];
    return typeof value === "number" ? value : Number(value ?? 0);
  } finally {
    statement.free();
  }
}

export async function inspectLocalStructuredMirror(): Promise<LocalStructuredMirrorSummary> {
  const db = await openDatabase();

  try {
    return {
      schemaVersion: Number(readSchemaInfo(db, "structured_mirror_schema_version") ?? "0") || null,
      snapshotVersion: Number(readSchemaInfo(db, "structured_mirror_snapshot_version") ?? "0") || null,
      lastSyncedAt: readSchemaInfo(db, "structured_mirror_last_synced_at"),
      status: getStructuredMirrorStatus(db),
      counts: {
        users: getTableCount(db, "local_users"),
        profiles: getTableCount(db, "local_profiles"),
        clients: getTableCount(db, "local_clients"),
        feedbackEntries: getTableCount(db, "local_feedback_entries"),
        auditEvents: getTableCount(db, "local_audit_events"),
        authRateLimits: getTableCount(db, "local_auth_rate_limits"),
        invoices: getTableCount(db, "local_invoices"),
        invoiceReminders: getTableCount(db, "local_invoice_reminders"),
        bankMovements: getTableCount(db, "local_bank_movements"),
        messageConnections: getTableCount(db, "local_message_connections"),
        messageThreads: getTableCount(db, "local_message_threads"),
        messageRecords: getTableCount(db, "local_message_records"),
        mailThreads: getTableCount(db, "local_mail_threads"),
        mailMessages: getTableCount(db, "local_mail_messages"),
        mailSyncRuns: getTableCount(db, "local_mail_sync_runs"),
        commercialDocuments: getTableCount(db, "local_commercial_documents"),
        documentSignatureRequests: getTableCount(
          db,
          "local_document_signature_requests",
        ),
        expenses: getTableCount(db, "local_expenses"),
        aiUsage: getTableCount(db, "local_ai_usage"),
        counters: getTableCount(db, "local_counters"),
      },
    };
  } finally {
    db.close();
  }
}

export async function listStructuredLocalAuditEventsForUser(
  userId: string,
  limit = 25,
): Promise<LocalAuditEventRecord[] | null> {
  const db = await openDatabase();

  try {
    if (getStructuredMirrorStatus(db) !== "ready") {
      return null;
    }

    const safeLimit =
      typeof limit === "number" ? Math.max(1, Math.trunc(limit)) : null;
    return queryRows(
      db,
      `
        SELECT
          id,
          user_id,
          actor_type,
          actor_id,
          source,
          action,
          entity_type,
          entity_id,
          before_json,
          after_json,
          context_json,
          created_at
        FROM local_audit_events
        WHERE user_id = ?
        ORDER BY created_at DESC
        ${safeLimit === null ? "" : `LIMIT ${safeLimit}`};
      `,
      [userId],
      (values) => mapAuditEventRow(values),
    );
  } finally {
    db.close();
  }
}

export async function getStructuredLocalFirstUser(): Promise<
  (AppUserRecord & { password_hash: string }) | null
> {
  const db = await openDatabase();

  try {
    if (getStructuredMirrorStatus(db) !== "ready") {
      return null;
    }

    return queryFirstRow(
      db,
      `
        SELECT
          id,
          email,
          password_hash,
          created_at,
          updated_at
        FROM local_users
        ORDER BY created_at ASC
        LIMIT 1;
      `,
      undefined,
      (values) => mapUserRow(values),
    );
  } finally {
    db.close();
  }
}

export async function getStructuredLocalUserById(
  userId: string,
): Promise<(AppUserRecord & { password_hash: string }) | null> {
  const db = await openDatabase();

  try {
    if (getStructuredMirrorStatus(db) !== "ready") {
      return null;
    }

    return queryFirstRow(
      db,
      `
        SELECT
          id,
          email,
          password_hash,
          created_at,
          updated_at
        FROM local_users
        WHERE id = ?
        LIMIT 1;
      `,
      [userId],
      (values) => mapUserRow(values),
    );
  } finally {
    db.close();
  }
}

export async function getStructuredLocalUserByEmail(
  email: string,
): Promise<(AppUserRecord & { password_hash: string }) | null> {
  const db = await openDatabase();

  try {
    if (getStructuredMirrorStatus(db) !== "ready") {
      return null;
    }

    return queryFirstRow(
      db,
      `
        SELECT
          id,
          email,
          password_hash,
          created_at,
          updated_at
        FROM local_users
        WHERE email = ?
        LIMIT 1;
      `,
      [email.trim().toLowerCase()],
      (values) => mapUserRow(values),
    );
  } finally {
    db.close();
  }
}

export async function getStructuredLocalAuthRateLimitById(
  rateLimitId: string,
): Promise<LocalAuthRateLimitRecord | null> {
  const db = await openDatabase();

  try {
    if (getStructuredMirrorStatus(db) !== "ready") {
      return null;
    }

    return queryFirstRow(
      db,
      `
        SELECT
          id,
          scope,
          email_key,
          ip_address,
          failed_attempts,
          last_failed_at,
          locked_until,
          created_at,
          updated_at
        FROM local_auth_rate_limits
        WHERE id = ?
        LIMIT 1;
      `,
      [rateLimitId],
      (values) => mapAuthRateLimitRow(values),
    );
  } finally {
    db.close();
  }
}

export async function listStructuredLocalClientsForUser(
  userId: string,
): Promise<ClientRecord[] | null> {
  const db = await openDatabase();

  try {
    if (getStructuredMirrorStatus(db) !== "ready") {
      return null;
    }

    return queryRows(
      db,
      `
        SELECT
          id,
          user_id,
          relation_kind,
          status,
          priority,
          display_name,
          first_name,
          last_name,
          company_name,
          email,
          phone,
          nif,
          address,
          notes,
          tags_json,
          created_at,
          updated_at
        FROM local_clients
        WHERE user_id = ?
        ORDER BY updated_at DESC, created_at DESC;
      `,
      [userId],
      (values) => mapClientRow(values),
    );
  } finally {
    db.close();
  }
}

export async function listStructuredLocalCommercialDocumentsForUser(
  userId: string,
): Promise<CommercialDocumentRecord[] | null> {
  const db = await openDatabase();

  try {
    if (getStructuredMirrorStatus(db) !== "ready") {
      return null;
    }

    return queryRows(
      db,
      `
        SELECT
          id,
          user_id,
          document_type,
          status,
          public_id,
          document_number,
          issue_date,
          valid_until,
          issuer_name,
          issuer_nif,
          issuer_address,
          issuer_logo_url,
          client_name,
          client_nif,
          client_address,
          client_email,
          line_items_json,
          vat_breakdown_json,
          subtotal,
          vat_total,
          irpf_rate,
          irpf_amount,
          grand_total,
          notes,
          converted_invoice_id,
          created_at,
          updated_at
        FROM local_commercial_documents
        WHERE user_id = ?
        ORDER BY issue_date DESC, created_at DESC;
      `,
      [userId],
      (values) => mapCommercialDocumentRow(values),
    );
  } finally {
    db.close();
  }
}

export async function listStructuredLocalExpensesForUser(
  userId: string,
): Promise<ExpenseRecord[] | null> {
  const db = await openDatabase();

  try {
    if (getStructuredMirrorStatus(db) !== "ready") {
      return null;
    }

    return queryRows(
      db,
      `
        SELECT
          id,
          user_id,
          expense_kind,
          review_status,
          vendor_name,
          vendor_nif,
          expense_date,
          currency,
          base_amount,
          vat_amount,
          total_amount,
          notes,
          source_file_name,
          source_file_path,
          source_file_mime_type,
          text_extraction_method,
          raw_text,
          extracted_payload_json,
          created_at,
          updated_at
        FROM local_expenses
        WHERE user_id = ?
        ORDER BY expense_date DESC, created_at DESC;
      `,
      [userId],
      (values) => mapExpenseRow(values),
    );
  } finally {
    db.close();
  }
}

export async function getStructuredLocalExpenseById(
  userId: string,
  expenseId: string,
): Promise<ExpenseRecord | null> {
  const db = await openDatabase();

  try {
    if (getStructuredMirrorStatus(db) !== "ready") {
      return null;
    }

    return queryFirstRow(
      db,
      `
        SELECT
          id,
          user_id,
          expense_kind,
          review_status,
          vendor_name,
          vendor_nif,
          expense_date,
          currency,
          base_amount,
          vat_amount,
          total_amount,
          notes,
          source_file_name,
          source_file_path,
          source_file_mime_type,
          text_extraction_method,
          raw_text,
          extracted_payload_json,
          created_at,
          updated_at
        FROM local_expenses
        WHERE user_id = ? AND id = ?
        LIMIT 1;
      `,
      [userId, expenseId],
      (values) => mapExpenseRow(values),
    );
  } finally {
    db.close();
  }
}

export async function listStructuredLocalBankMovementsForUser(
  userId: string,
): Promise<BankMovementRecord[] | null> {
  const db = await openDatabase();

  try {
    if (getStructuredMirrorStatus(db) !== "ready") {
      return null;
    }

    return queryRows(
      db,
      `
        SELECT
          id,
          user_id,
          account_label,
          booking_date,
          value_date,
          description,
          counterparty_name,
          amount,
          currency,
          direction,
          balance,
          status,
          matched_invoice_id,
          matched_expense_id,
          notes,
          source_file_name,
          source_hash,
          raw_row_json,
          imported_at,
          created_at,
          updated_at
        FROM local_bank_movements
        WHERE user_id = ?
        ORDER BY booking_date DESC, created_at DESC;
      `,
      [userId],
      (values) => mapBankMovementRow(values),
    );
  } finally {
    db.close();
  }
}

export async function getStructuredLocalBankMovementById(
  userId: string,
  movementId: string,
): Promise<BankMovementRecord | null> {
  const db = await openDatabase();

  try {
    if (getStructuredMirrorStatus(db) !== "ready") {
      return null;
    }

    return queryFirstRow(
      db,
      `
        SELECT
          id,
          user_id,
          account_label,
          booking_date,
          value_date,
          description,
          counterparty_name,
          amount,
          currency,
          direction,
          balance,
          status,
          matched_invoice_id,
          matched_expense_id,
          notes,
          source_file_name,
          source_hash,
          raw_row_json,
          imported_at,
          created_at,
          updated_at
        FROM local_bank_movements
        WHERE user_id = ? AND id = ?
        LIMIT 1;
      `,
      [userId, movementId],
      (values) => mapBankMovementRow(values),
    );
  } finally {
    db.close();
  }
}

export async function listStructuredLocalMessageConnectionsForUser(
  userId: string,
): Promise<MessageConnection[] | null> {
  const db = await openDatabase();

  try {
    if (getStructuredMirrorStatus(db) !== "ready") {
      return null;
    }

    return queryRows(
      db,
      `
        SELECT
          id,
          user_id,
          channel,
          label,
          status,
          inbound_key,
          verify_token,
          metadata_json,
          created_at,
          updated_at
        FROM local_message_connections
        WHERE user_id = ?
        ORDER BY updated_at DESC, created_at DESC;
      `,
      [userId],
      (values) => mapMessageConnectionRow(values),
    );
  } finally {
    db.close();
  }
}

export async function getStructuredLocalMessageConnectionByInboundKey(
  inboundKey: string,
  channel: MessageConnection["channel"],
): Promise<MessageConnection | null> {
  const db = await openDatabase();

  try {
    if (getStructuredMirrorStatus(db) !== "ready") {
      return null;
    }

    return queryFirstRow(
      db,
      `
        SELECT
          id,
          user_id,
          channel,
          label,
          status,
          inbound_key,
          verify_token,
          metadata_json,
          created_at,
          updated_at
        FROM local_message_connections
        WHERE channel = ? AND inbound_key = ?
        LIMIT 1;
      `,
      [channel, inboundKey],
      (values) => mapMessageConnectionRow(values),
    );
  } finally {
    db.close();
  }
}

export async function listStructuredLocalMessageThreadsForUser(
  userId: string,
): Promise<MessageThread[] | null> {
  const db = await openDatabase();

  try {
    if (getStructuredMirrorStatus(db) !== "ready") {
      return null;
    }

    return queryRows(
      db,
      `
        SELECT
          id,
          user_id,
          connection_id,
          channel,
          external_chat_id,
          external_contact_id,
          first_name,
          last_name,
          full_name,
          phone,
          telegram_username,
          urgency,
          urgency_score,
          urgency_locked,
          unread_count,
          last_message_preview,
          last_message_direction,
          last_message_at,
          metadata_json,
          created_at,
          updated_at
        FROM local_message_threads
        WHERE user_id = ?
        ORDER BY last_message_at DESC, created_at DESC;
      `,
      [userId],
      (values) => mapMessageThreadRow(values),
    );
  } finally {
    db.close();
  }
}

export async function getStructuredLocalMessageThreadById(
  userId: string,
  threadId: string,
): Promise<MessageThread | null> {
  const db = await openDatabase();

  try {
    if (getStructuredMirrorStatus(db) !== "ready") {
      return null;
    }

    return queryFirstRow(
      db,
      `
        SELECT
          id,
          user_id,
          connection_id,
          channel,
          external_chat_id,
          external_contact_id,
          first_name,
          last_name,
          full_name,
          phone,
          telegram_username,
          urgency,
          urgency_score,
          urgency_locked,
          unread_count,
          last_message_preview,
          last_message_direction,
          last_message_at,
          metadata_json,
          created_at,
          updated_at
        FROM local_message_threads
        WHERE user_id = ? AND id = ?
        LIMIT 1;
      `,
      [userId, threadId],
      (values) => mapMessageThreadRow(values),
    );
  } finally {
    db.close();
  }
}

export async function getStructuredLocalMessageThreadByExternalChat(
  userId: string,
  channel: MessageThread["channel"],
  externalChatId: string,
): Promise<MessageThread | null> {
  const db = await openDatabase();

  try {
    if (getStructuredMirrorStatus(db) !== "ready") {
      return null;
    }

    return queryFirstRow(
      db,
      `
        SELECT
          id,
          user_id,
          connection_id,
          channel,
          external_chat_id,
          external_contact_id,
          first_name,
          last_name,
          full_name,
          phone,
          telegram_username,
          urgency,
          urgency_score,
          urgency_locked,
          unread_count,
          last_message_preview,
          last_message_direction,
          last_message_at,
          metadata_json,
          created_at,
          updated_at
        FROM local_message_threads
        WHERE user_id = ? AND channel = ? AND external_chat_id = ?
        LIMIT 1;
      `,
      [userId, channel, externalChatId],
      (values) => mapMessageThreadRow(values),
    );
  } finally {
    db.close();
  }
}

export async function listStructuredLocalMessageRecordsForThread(
  userId: string,
  threadId: string,
): Promise<MessageRecord[] | null> {
  const db = await openDatabase();

  try {
    if (getStructuredMirrorStatus(db) !== "ready") {
      return null;
    }

    return queryRows(
      db,
      `
        SELECT
          id,
          user_id,
          thread_id,
          channel,
          external_message_id,
          direction,
          sender_name,
          body,
          message_type,
          received_at,
          raw_payload_json,
          created_at
        FROM local_message_records
        WHERE user_id = ? AND thread_id = ?
        ORDER BY received_at ASC, created_at ASC;
      `,
      [userId, threadId],
      (values) => mapMessageRecordRow(values),
    );
  } finally {
    db.close();
  }
}

export async function getStructuredLocalMessageRecordByExternalId(
  userId: string,
  channel: MessageRecord["channel"],
  externalMessageId: string,
): Promise<MessageRecord | null> {
  const db = await openDatabase();

  try {
    if (getStructuredMirrorStatus(db) !== "ready") {
      return null;
    }

    return queryFirstRow(
      db,
      `
        SELECT
          id,
          user_id,
          thread_id,
          channel,
          external_message_id,
          direction,
          sender_name,
          body,
          message_type,
          received_at,
          raw_payload_json,
          created_at
        FROM local_message_records
        WHERE user_id = ? AND channel = ? AND external_message_id = ?
        LIMIT 1;
      `,
      [userId, channel, externalMessageId],
      (values) => mapMessageRecordRow(values),
    );
  } finally {
    db.close();
  }
}

export async function listStructuredLocalMailThreadsForUser(
  userId: string,
): Promise<MailThread[] | null> {
  const db = await openDatabase();

  try {
    if (getStructuredMirrorStatus(db) !== "ready") {
      return null;
    }

    return queryRows(
      db,
      `
        SELECT
          id,
          user_id,
          source,
          external_thread_key,
          from_name,
          from_email,
          subject,
          urgency,
          urgency_score,
          unread_count,
          last_message_preview,
          last_message_at,
          metadata_json,
          created_at,
          updated_at
        FROM local_mail_threads
        WHERE user_id = ?
        ORDER BY last_message_at DESC, created_at DESC;
      `,
      [userId],
      (values) => mapMailThreadRow(values),
    );
  } finally {
    db.close();
  }
}

export async function getStructuredLocalMailThreadById(
  userId: string,
  threadId: string,
): Promise<MailThread | null> {
  const db = await openDatabase();

  try {
    if (getStructuredMirrorStatus(db) !== "ready") {
      return null;
    }

    return queryFirstRow(
      db,
      `
        SELECT
          id,
          user_id,
          source,
          external_thread_key,
          from_name,
          from_email,
          subject,
          urgency,
          urgency_score,
          unread_count,
          last_message_preview,
          last_message_at,
          metadata_json,
          created_at,
          updated_at
        FROM local_mail_threads
        WHERE user_id = ? AND id = ?
        LIMIT 1;
      `,
      [userId, threadId],
      (values) => mapMailThreadRow(values),
    );
  } finally {
    db.close();
  }
}

export async function getStructuredLocalMailThreadByExternalKey(
  userId: string,
  source: MailThread["source"],
  externalThreadKey: string,
): Promise<MailThread | null> {
  const db = await openDatabase();

  try {
    if (getStructuredMirrorStatus(db) !== "ready") {
      return null;
    }

    return queryFirstRow(
      db,
      `
        SELECT
          id,
          user_id,
          source,
          external_thread_key,
          from_name,
          from_email,
          subject,
          urgency,
          urgency_score,
          unread_count,
          last_message_preview,
          last_message_at,
          metadata_json,
          created_at,
          updated_at
        FROM local_mail_threads
        WHERE user_id = ? AND source = ? AND external_thread_key = ?
        LIMIT 1;
      `,
      [userId, source, externalThreadKey],
      (values) => mapMailThreadRow(values),
    );
  } finally {
    db.close();
  }
}

export async function listStructuredLocalMailMessagesForThread(
  userId: string,
  threadId: string,
): Promise<MailMessage[] | null> {
  const db = await openDatabase();

  try {
    if (getStructuredMirrorStatus(db) !== "ready") {
      return null;
    }

    return queryRows(
      db,
      `
        SELECT
          id,
          user_id,
          thread_id,
          source,
          external_message_id,
          from_name,
          from_email,
          to_emails_json,
          subject,
          body_text,
          body_html,
          received_at,
          raw_headers_json,
          created_at
        FROM local_mail_messages
        WHERE user_id = ? AND thread_id = ?
        ORDER BY received_at ASC, created_at ASC;
      `,
      [userId, threadId],
      (values) => mapMailMessageRow(values),
    );
  } finally {
    db.close();
  }
}

export async function getStructuredLocalMailMessageByExternalId(
  userId: string,
  source: MailMessage["source"],
  externalMessageId: string,
): Promise<MailMessage | null> {
  const db = await openDatabase();

  try {
    if (getStructuredMirrorStatus(db) !== "ready") {
      return null;
    }

    return queryFirstRow(
      db,
      `
        SELECT
          id,
          user_id,
          thread_id,
          source,
          external_message_id,
          from_name,
          from_email,
          to_emails_json,
          subject,
          body_text,
          body_html,
          received_at,
          raw_headers_json,
          created_at
        FROM local_mail_messages
        WHERE user_id = ? AND source = ? AND external_message_id = ?
        LIMIT 1;
      `,
      [userId, source, externalMessageId],
      (values) => mapMailMessageRow(values),
    );
  } finally {
    db.close();
  }
}

export async function listStructuredLocalMailSyncRunsForUser(
  userId: string,
  limit = 5,
): Promise<MailSyncRun[] | null> {
  const db = await openDatabase();

  try {
    if (getStructuredMirrorStatus(db) !== "ready") {
      return null;
    }

    const safeLimit = Math.max(1, Math.trunc(limit));
    return queryRows(
      db,
      `
        SELECT
          id,
          user_id,
          source,
          status,
          imported_count,
          detail,
          created_at
        FROM local_mail_sync_runs
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ${safeLimit};
      `,
      [userId],
      (values) => mapMailSyncRunRow(values),
    );
  } finally {
    db.close();
  }
}

export async function listStructuredLocalAiUsageForUser(
  userId: string,
): Promise<StructuredAiUsageRow[] | null> {
  const db = await openDatabase();

  try {
    if (getStructuredMirrorStatus(db) !== "ready") {
      return null;
    }

    return queryRows(
      db,
      `
        SELECT
          user_id,
          date,
          calls_count
        FROM local_ai_usage
        WHERE user_id = ?
        ORDER BY date ASC;
      `,
      [userId],
      (values) => mapAiUsageRow(values),
    );
  } finally {
    db.close();
  }
}

export async function getStructuredLocalCommercialDocumentById(
  userId: string,
  documentId: string,
): Promise<CommercialDocumentRecord | null> {
  const db = await openDatabase();

  try {
    if (getStructuredMirrorStatus(db) !== "ready") {
      return null;
    }

    return queryFirstRow(
      db,
      `
        SELECT
          id,
          user_id,
          document_type,
          status,
          public_id,
          document_number,
          issue_date,
          valid_until,
          issuer_name,
          issuer_nif,
          issuer_address,
          issuer_logo_url,
          client_name,
          client_nif,
          client_address,
          client_email,
          line_items_json,
          vat_breakdown_json,
          subtotal,
          vat_total,
          irpf_rate,
          irpf_amount,
          grand_total,
          notes,
          converted_invoice_id,
          created_at,
          updated_at
        FROM local_commercial_documents
        WHERE user_id = ? AND id = ?
        LIMIT 1;
      `,
      [userId, documentId],
      (values) => mapCommercialDocumentRow(values),
    );
  } finally {
    db.close();
  }
}

export async function listStructuredLocalDocumentSignatureRequestsForUser(
  userId: string,
): Promise<DocumentSignatureRequestRecord[] | null> {
  const db = await openDatabase();

  try {
    if (getStructuredMirrorStatus(db) !== "ready") {
      return null;
    }

    return queryRows(
      db,
      `
        SELECT
          id,
          user_id,
          document_id,
          document_type,
          request_kind,
          public_token,
          status,
          request_note,
          requested_at,
          expires_at,
          responded_at,
          viewed_at,
          revoked_at,
          signer_name,
          signer_email,
          signer_nif,
          signer_message,
          accepted_terms,
          evidence_json,
          created_at,
          updated_at
        FROM local_document_signature_requests
        WHERE user_id = ?
        ORDER BY requested_at DESC, created_at DESC;
      `,
      [userId],
      (values) => mapDocumentSignatureRequestRow(values),
    );
  } finally {
    db.close();
  }
}

export async function getStructuredLocalDocumentSignatureRequestById(
  userId: string,
  requestId: string,
): Promise<DocumentSignatureRequestRecord | null> {
  const db = await openDatabase();

  try {
    if (getStructuredMirrorStatus(db) !== "ready") {
      return null;
    }

    return queryFirstRow(
      db,
      `
        SELECT
          id,
          user_id,
          document_id,
          document_type,
          request_kind,
          public_token,
          status,
          request_note,
          requested_at,
          expires_at,
          responded_at,
          viewed_at,
          revoked_at,
          signer_name,
          signer_email,
          signer_nif,
          signer_message,
          accepted_terms,
          evidence_json,
          created_at,
          updated_at
        FROM local_document_signature_requests
        WHERE user_id = ? AND id = ?
        LIMIT 1;
      `,
      [userId, requestId],
      (values) => mapDocumentSignatureRequestRow(values),
    );
  } finally {
    db.close();
  }
}

export async function getStructuredLocalDocumentSignatureRequestByAnyId(
  requestId: string,
): Promise<DocumentSignatureRequestRecord | null> {
  const db = await openDatabase();

  try {
    if (getStructuredMirrorStatus(db) !== "ready") {
      return null;
    }

    return queryFirstRow(
      db,
      `
        SELECT
          id,
          user_id,
          document_id,
          document_type,
          request_kind,
          public_token,
          status,
          request_note,
          requested_at,
          expires_at,
          responded_at,
          viewed_at,
          revoked_at,
          signer_name,
          signer_email,
          signer_nif,
          signer_message,
          accepted_terms,
          evidence_json,
          created_at,
          updated_at
        FROM local_document_signature_requests
        WHERE id = ?
        LIMIT 1;
      `,
      [requestId],
      (values) => mapDocumentSignatureRequestRow(values),
    );
  } finally {
    db.close();
  }
}

export async function getStructuredLocalPublicSignatureRequestByToken(
  token: string,
): Promise<DocumentSignatureRequestRecord | null> {
  const db = await openDatabase();

  try {
    if (getStructuredMirrorStatus(db) !== "ready") {
      return null;
    }

    return queryFirstRow(
      db,
      `
        SELECT
          id,
          user_id,
          document_id,
          document_type,
          request_kind,
          public_token,
          status,
          request_note,
          requested_at,
          expires_at,
          responded_at,
          viewed_at,
          revoked_at,
          signer_name,
          signer_email,
          signer_nif,
          signer_message,
          accepted_terms,
          evidence_json,
          created_at,
          updated_at
        FROM local_document_signature_requests
        WHERE public_token = ?
        LIMIT 1;
      `,
      [token],
      (values) => mapDocumentSignatureRequestRow(values),
    );
  } finally {
    db.close();
  }
}

export async function getStructuredLocalProfileById(
  userId: string,
): Promise<Profile | null> {
  const db = await openDatabase();

  try {
    if (getStructuredMirrorStatus(db) !== "ready") {
      return null;
    }

    return queryFirstRow(
      db,
      `
        SELECT
          id,
          email,
          full_name,
          nif,
          address,
          logo_path,
          logo_url,
          created_at,
          updated_at
        FROM local_profiles
        WHERE id = ?
        LIMIT 1;
      `,
      [userId],
      (values) => mapProfileRow(values),
    );
  } finally {
    db.close();
  }
}

export async function listStructuredLocalFeedbackEntriesForUser(
  userId: string,
): Promise<FeedbackEntryRecord[] | null> {
  const db = await openDatabase();

  try {
    if (getStructuredMirrorStatus(db) !== "ready") {
      return null;
    }

    return queryRows(
      db,
      `
        SELECT
          id,
          user_id,
          source_type,
          module_key,
          severity,
          status,
          title,
          message,
          reporter_name,
          contact_email,
          created_at,
          updated_at
        FROM local_feedback_entries
        WHERE user_id = ?
        ORDER BY updated_at DESC, created_at DESC;
      `,
      [userId],
      (values) => mapFeedbackEntryRow(values),
    );
  } finally {
    db.close();
  }
}

export async function getStructuredLocalClientById(
  userId: string,
  clientId: string,
): Promise<ClientRecord | null> {
  const db = await openDatabase();

  try {
    if (getStructuredMirrorStatus(db) !== "ready") {
      return null;
    }

    return queryFirstRow(
      db,
      `
        SELECT
          id,
          user_id,
          relation_kind,
          status,
          priority,
          display_name,
          first_name,
          last_name,
          company_name,
          email,
          phone,
          nif,
          address,
          notes,
          tags_json,
          created_at,
          updated_at
        FROM local_clients
        WHERE user_id = ? AND id = ?
        LIMIT 1;
      `,
      [userId, clientId],
      (values) => mapClientRow(values),
    );
  } finally {
    db.close();
  }
}

export async function listStructuredLocalInvoicesForUser(
  userId: string,
): Promise<InvoiceRecord[] | null> {
  const db = await openDatabase();

  try {
    if (getStructuredMirrorStatus(db) !== "ready") {
      return null;
    }

    return queryRows(
      db,
      `
        SELECT
          id,
          user_id,
          public_id,
          invoice_number,
          issue_date,
          due_date,
          issuer_name,
          issuer_nif,
          issuer_address,
          issuer_logo_url,
          client_name,
          client_nif,
          client_address,
          client_email,
          line_items_json,
          subtotal,
          vat_total,
          irpf_rate,
          irpf_amount,
          grand_total,
          amount_paid,
          payment_status,
          paid_at,
          last_reminder_at,
          reminder_count,
          collection_notes,
          vat_breakdown_json,
          created_at,
          updated_at
        FROM local_invoices
        WHERE user_id = ?
        ORDER BY issue_date DESC, created_at DESC;
      `,
      [userId],
      (values) => mapInvoiceRow(values),
    );
  } finally {
    db.close();
  }
}

export async function getStructuredLocalInvoiceById(
  userId: string,
  invoiceId: string,
): Promise<InvoiceRecord | null> {
  const db = await openDatabase();

  try {
    if (getStructuredMirrorStatus(db) !== "ready") {
      return null;
    }

    return queryFirstRow(
      db,
      `
        SELECT
          id,
          user_id,
          public_id,
          invoice_number,
          issue_date,
          due_date,
          issuer_name,
          issuer_nif,
          issuer_address,
          issuer_logo_url,
          client_name,
          client_nif,
          client_address,
          client_email,
          line_items_json,
          subtotal,
          vat_total,
          irpf_rate,
          irpf_amount,
          grand_total,
          amount_paid,
          payment_status,
          paid_at,
          last_reminder_at,
          reminder_count,
          collection_notes,
          vat_breakdown_json,
          created_at,
          updated_at
        FROM local_invoices
        WHERE user_id = ? AND id = ?
        LIMIT 1;
      `,
      [userId, invoiceId],
      (values) => mapInvoiceRow(values),
    );
  } finally {
    db.close();
  }
}

export async function getStructuredLocalInvoiceByPublicId(
  publicId: string,
): Promise<InvoiceRecord | null> {
  const db = await openDatabase();

  try {
    if (getStructuredMirrorStatus(db) !== "ready") {
      return null;
    }

    return queryFirstRow(
      db,
      `
        SELECT
          id,
          user_id,
          public_id,
          invoice_number,
          issue_date,
          due_date,
          issuer_name,
          issuer_nif,
          issuer_address,
          issuer_logo_url,
          client_name,
          client_nif,
          client_address,
          client_email,
          line_items_json,
          subtotal,
          vat_total,
          irpf_rate,
          irpf_amount,
          grand_total,
          amount_paid,
          payment_status,
          paid_at,
          last_reminder_at,
          reminder_count,
          collection_notes,
          vat_breakdown_json,
          created_at,
          updated_at
        FROM local_invoices
        WHERE public_id = ?
        LIMIT 1;
      `,
      [publicId],
      (values) => mapInvoiceRow(values),
    );
  } finally {
    db.close();
  }
}

export async function listStructuredLocalInvoiceRemindersForUser(
  userId: string,
): Promise<InvoiceReminderRecord[] | null> {
  const db = await openDatabase();

  try {
    if (getStructuredMirrorStatus(db) !== "ready") {
      return null;
    }

    return queryRows(
      db,
      `
        SELECT
          id,
          user_id,
          invoice_id,
          delivery_channel,
          trigger_mode,
          batch_key,
          recipient_email,
          subject,
          status,
          error_message,
          sent_at,
          created_at
        FROM local_invoice_reminders
        WHERE user_id = ?
        ORDER BY sent_at DESC, created_at DESC;
      `,
      [userId],
      (values) => mapInvoiceReminderRow(values),
    );
  } finally {
    db.close();
  }
}

export async function readStructuredLocalCoreSlices(): Promise<StructuredLocalCoreSlices | null> {
  const db = await openDatabase();

  try {
    if (getStructuredMirrorStatus(db) !== "ready") {
      return null;
    }

    const users = queryRows(
      db,
      `
        SELECT
          id,
          email,
          password_hash,
          created_at,
          updated_at
        FROM local_users
        ORDER BY created_at ASC;
      `,
      undefined,
      (values) => mapUserRow(values),
    );

    const profiles = queryRows(
      db,
      `
        SELECT
          id,
          email,
          full_name,
          nif,
          address,
          logo_path,
          logo_url,
          created_at,
          updated_at
        FROM local_profiles
        ORDER BY created_at ASC, updated_at ASC;
      `,
      undefined,
      (values) => mapProfileRow(values),
    );

    const feedbackEntries = queryRows(
      db,
      `
        SELECT
          id,
          user_id,
          source_type,
          module_key,
          severity,
          status,
          title,
          message,
          reporter_name,
          contact_email,
          created_at,
          updated_at
        FROM local_feedback_entries
        ORDER BY created_at ASC, updated_at ASC;
      `,
      undefined,
      (values) => mapFeedbackEntryRow(values),
    );

    const clients = queryRows(
      db,
      `
        SELECT
          id,
          user_id,
          relation_kind,
          status,
          priority,
          display_name,
          first_name,
          last_name,
          company_name,
          email,
          phone,
          nif,
          address,
          notes,
          tags_json,
          created_at,
          updated_at
        FROM local_clients
        ORDER BY created_at ASC, updated_at ASC;
      `,
      undefined,
      (values) => mapClientRow(values),
    );

    const auditEvents = queryRows(
      db,
      `
        SELECT
          id,
          user_id,
          actor_type,
          actor_id,
          source,
          action,
          entity_type,
          entity_id,
          before_json,
          after_json,
          context_json,
          created_at
        FROM local_audit_events
        ORDER BY created_at ASC;
      `,
      undefined,
      (values) => mapAuditEventRow(values),
    );

    const authRateLimits = queryRows(
      db,
      `
        SELECT
          id,
          scope,
          email_key,
          ip_address,
          failed_attempts,
          last_failed_at,
          locked_until,
          created_at,
          updated_at
        FROM local_auth_rate_limits
        ORDER BY created_at ASC, updated_at ASC;
      `,
      undefined,
      (values) => mapAuthRateLimitRow(values),
    );

    const invoices = queryRows(
      db,
      `
        SELECT
          id,
          user_id,
          public_id,
          invoice_number,
          issue_date,
          due_date,
          issuer_name,
          issuer_nif,
          issuer_address,
          issuer_logo_url,
          client_name,
          client_nif,
          client_address,
          client_email,
          line_items_json,
          subtotal,
          vat_total,
          irpf_rate,
          irpf_amount,
          grand_total,
          amount_paid,
          payment_status,
          paid_at,
          last_reminder_at,
          reminder_count,
          collection_notes,
          vat_breakdown_json,
          created_at,
          updated_at
        FROM local_invoices
        ORDER BY invoice_number ASC, created_at ASC;
      `,
      undefined,
      (values) => mapInvoiceRow(values),
    );

    const invoiceReminders = queryRows(
      db,
      `
        SELECT
          id,
          user_id,
          invoice_id,
          delivery_channel,
          trigger_mode,
          batch_key,
          recipient_email,
          subject,
          status,
          error_message,
          sent_at,
          created_at
        FROM local_invoice_reminders
        ORDER BY created_at ASC, sent_at ASC;
      `,
      undefined,
      (values) => mapInvoiceReminderRow(values),
    );

    const bankMovements = queryRows(
      db,
      `
        SELECT
          id,
          user_id,
          account_label,
          booking_date,
          value_date,
          description,
          counterparty_name,
          amount,
          currency,
          direction,
          balance,
          status,
          matched_invoice_id,
          matched_expense_id,
          notes,
          source_file_name,
          source_hash,
          raw_row_json,
          imported_at,
          created_at,
          updated_at
        FROM local_bank_movements
        ORDER BY booking_date ASC, created_at ASC;
      `,
      undefined,
      (values) => mapBankMovementRow(values),
    );

    const messageConnections = queryRows(
      db,
      `
        SELECT
          id,
          user_id,
          channel,
          label,
          status,
          inbound_key,
          verify_token,
          metadata_json,
          created_at,
          updated_at
        FROM local_message_connections
        ORDER BY created_at ASC, updated_at ASC;
      `,
      undefined,
      (values) => mapMessageConnectionRow(values),
    );

    const messageThreads = queryRows(
      db,
      `
        SELECT
          id,
          user_id,
          connection_id,
          channel,
          external_chat_id,
          external_contact_id,
          first_name,
          last_name,
          full_name,
          phone,
          telegram_username,
          urgency,
          urgency_score,
          urgency_locked,
          unread_count,
          last_message_preview,
          last_message_direction,
          last_message_at,
          metadata_json,
          created_at,
          updated_at
        FROM local_message_threads
        ORDER BY last_message_at ASC, created_at ASC;
      `,
      undefined,
      (values) => mapMessageThreadRow(values),
    );

    const messageRecords = queryRows(
      db,
      `
        SELECT
          id,
          user_id,
          thread_id,
          channel,
          external_message_id,
          direction,
          sender_name,
          body,
          message_type,
          received_at,
          raw_payload_json,
          created_at
        FROM local_message_records
        ORDER BY received_at ASC, created_at ASC;
      `,
      undefined,
      (values) => mapMessageRecordRow(values),
    );

    const mailThreads = queryRows(
      db,
      `
        SELECT
          id,
          user_id,
          source,
          external_thread_key,
          from_name,
          from_email,
          subject,
          urgency,
          urgency_score,
          unread_count,
          last_message_preview,
          last_message_at,
          metadata_json,
          created_at,
          updated_at
        FROM local_mail_threads
        ORDER BY last_message_at ASC, created_at ASC;
      `,
      undefined,
      (values) => mapMailThreadRow(values),
    );

    const mailMessages = queryRows(
      db,
      `
        SELECT
          id,
          user_id,
          thread_id,
          source,
          external_message_id,
          from_name,
          from_email,
          to_emails_json,
          subject,
          body_text,
          body_html,
          received_at,
          raw_headers_json,
          created_at
        FROM local_mail_messages
        ORDER BY received_at ASC, created_at ASC;
      `,
      undefined,
      (values) => mapMailMessageRow(values),
    );

    const mailSyncRuns = queryRows(
      db,
      `
        SELECT
          id,
          user_id,
          source,
          status,
          imported_count,
          detail,
          created_at
        FROM local_mail_sync_runs
        ORDER BY created_at ASC;
      `,
      undefined,
      (values) => mapMailSyncRunRow(values),
    );

    const commercialDocuments = queryRows(
      db,
      `
        SELECT
          id,
          user_id,
          document_type,
          status,
          public_id,
          document_number,
          issue_date,
          valid_until,
          issuer_name,
          issuer_nif,
          issuer_address,
          issuer_logo_url,
          client_name,
          client_nif,
          client_address,
          client_email,
          line_items_json,
          vat_breakdown_json,
          subtotal,
          vat_total,
          irpf_rate,
          irpf_amount,
          grand_total,
          notes,
          converted_invoice_id,
          created_at,
          updated_at
        FROM local_commercial_documents
        ORDER BY issue_date ASC, created_at ASC;
      `,
      undefined,
      (values) => mapCommercialDocumentRow(values),
    );

    const documentSignatureRequests = queryRows(
      db,
      `
        SELECT
          id,
          user_id,
          document_id,
          document_type,
          request_kind,
          public_token,
          status,
          request_note,
          requested_at,
          expires_at,
          responded_at,
          viewed_at,
          revoked_at,
          signer_name,
          signer_email,
          signer_nif,
          signer_message,
          accepted_terms,
          evidence_json,
          created_at,
          updated_at
        FROM local_document_signature_requests
        ORDER BY requested_at ASC, created_at ASC;
      `,
      undefined,
      (values) => mapDocumentSignatureRequestRow(values),
    );

    const expenses = queryRows(
      db,
      `
        SELECT
          id,
          user_id,
          expense_kind,
          review_status,
          vendor_name,
          vendor_nif,
          expense_date,
          currency,
          base_amount,
          vat_amount,
          total_amount,
          notes,
          source_file_name,
          source_file_path,
          source_file_mime_type,
          text_extraction_method,
          raw_text,
          extracted_payload_json,
          created_at,
          updated_at
        FROM local_expenses
        ORDER BY expense_date ASC, created_at ASC;
      `,
      undefined,
      (values) => mapExpenseRow(values),
    );

    const aiUsage = queryRows(
      db,
      `
        SELECT
          user_id,
          date,
          calls_count
        FROM local_ai_usage
        ORDER BY date ASC;
      `,
      undefined,
      (values) => mapAiUsageRow(values),
    );

    const counterRows = queryRows(
      db,
      `
        SELECT counter_key, counter_value
        FROM local_counters;
      `,
      undefined,
      (values) => ({
        key: String(values[0] ?? ""),
        value: Number(values[1] ?? 0),
      }),
    );

    const counters: StructuredSnapshot["counters"] = {
      invoice_number: 0,
      quote_number: 0,
      delivery_note_number: 0,
    };

    for (const row of counterRows) {
      const key = row.key;
      const value = row.value;

      if (key === "invoice_number") {
        counters.invoice_number = value;
      } else if (key === "quote_number") {
        counters.quote_number = value;
      } else if (key === "delivery_note_number") {
        counters.delivery_note_number = value;
      }
    }

    return {
      users,
      profiles,
      feedbackEntries,
      clients,
      auditEvents,
      authRateLimits,
      invoices,
      invoiceReminders,
      bankMovements,
      messageConnections,
      messageThreads,
      messageRecords,
      mailThreads,
      mailMessages,
      mailSyncRuns,
      commercialDocuments,
      documentSignatureRequests,
      expenses,
      aiUsage,
      counters,
    };
  } finally {
    db.close();
  }
}

export async function getStructuredLocalMonthlyInvoiceUsage(
  userId: string,
  monthStartIso: string,
): Promise<number | null> {
  const db = await openDatabase();

  try {
    if (getStructuredMirrorStatus(db) !== "ready") {
      return null;
    }

    return queryScalarNumber(
      db,
      `
        SELECT COUNT(*)
        FROM local_invoices
        WHERE user_id = ? AND issue_date >= ?;
      `,
      [userId, monthStartIso],
    );
  } finally {
    db.close();
  }
}

export async function getStructuredLocalDailyAiUsage(
  userId: string,
  usageDate: string,
): Promise<number | null> {
  const db = await openDatabase();

  try {
    if (getStructuredMirrorStatus(db) !== "ready") {
      return null;
    }

    const statement = db.prepare(
      `
        SELECT calls_count
        FROM local_ai_usage
        WHERE user_id = ? AND date = ?
        LIMIT 1;
      `,
      [userId, usageDate],
    );
    try {
      if (!statement.step()) {
        return 0;
      }

      const value = statement.get()?.[0];
      return typeof value === "number" ? value : Number(value ?? 0);
    } finally {
      statement.free();
    }
  } finally {
    db.close();
  }
}
