import "server-only";

import { createHash, createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";

import type {
  AppUserRecord,
  BankMovementDirection,
  BankMovementRecord,
  ClientRecord,
  ClientPriority,
  ClientRelationKind,
  ClientStatus,
  CommercialDocumentRecord,
  CommercialDocumentStatus,
  CommercialDocumentType,
  DocumentSignatureRequestRecord,
  DocumentSignatureStatus,
  ExpenseExtractionMethod,
  ExpenseKind,
  FeedbackEntryRecord,
  FeedbackSeverity,
  FeedbackSourceType,
  FeedbackStatus,
  InvoiceLineItemStored,
  InvoiceRecord,
  InvoiceReminderRecord,
  InvoiceTotals,
  MailMessage,
  MailSyncRun,
  MailThread,
  LocalAuditActorType,
  LocalAuditEventRecord,
  LocalAuditSource,
  LocalAuthRateLimitRecord,
  MessageChannel,
  MessageConnection,
  MessageConnectionStatus,
  MessageRecord,
  MessageThread,
  MessageUrgency,
  ExpenseRecord,
  Profile,
} from "@/lib/types";
import {
  decryptEncryptedEnvelope,
  encryptTextForScope,
  isLocalDataEncryptionRequested,
  tryParseEncryptedEnvelope,
} from "@/lib/local-encryption";
import {
  getStructuredLocalDailyAiUsage,
  getStructuredLocalMonthlyInvoiceUsage,
  readStructuredLocalCoreSlices,
  getLocalDataDir as getLocalDataDirFromDb,
  replaceStructuredLocalIdentityForUser,
  readLocalStateText,
  type StructuredMirrorMutation,
  type StructuredMirrorSection,
  writeLocalStateText,
} from "@/lib/local-db";
import { getLocalRuntimeEnv, getOptionalPublicEnv } from "@/lib/env";
import {
  getStructuredClientRepositoryRecord,
  listStructuredClientRepositoryRecords,
  replaceStructuredClientRepositoryRecords,
  saveStructuredClientRepositoryRecord,
} from "@/lib/local-repositories/clients";
import {
  listStructuredFeedbackRepositoryRecords,
  replaceStructuredFeedbackRepositoryRecords,
  saveStructuredFeedbackRepositoryRecord,
} from "@/lib/local-repositories/feedback";
import {
  getStructuredInvoiceRepositoryCounters,
  getStructuredInvoiceRepositoryRecord,
  getStructuredInvoiceRepositoryRecordByPublicId,
  listStructuredInvoiceRepositoryRecords,
  listStructuredInvoiceRepositoryReminders,
  persistStructuredInvoiceRepositoryState,
  replaceStructuredInvoiceRepositoryStateForUser,
} from "@/lib/local-repositories/invoices";
import {
  getStructuredProfileRepositoryRecord,
  saveStructuredProfileRepositoryRecord,
} from "@/lib/local-repositories/profiles";
import {
  getStructuredCounterRepositoryState,
  listStructuredAuditRepositoryRecords,
  replaceStructuredAuditRepositoryRecords,
} from "@/lib/local-repositories/system";
import { roundCurrency, toNumber } from "@/lib/utils";

type LocalCoreAuthUser = AppUserRecord & {
  password_hash: string;
};

type LocalAiUsage = {
  user_id: string;
  date: string;
  calls_count: number;
};

type LocalAuthenticationResult =
  | {
      status: "success";
      user: AppUserRecord;
    }
  | {
      status: "invalid";
      remainingAttempts: number;
      lockedUntil: null;
    }
  | {
      status: "locked";
      remainingAttempts: 0;
      lockedUntil: string;
    };

type LocalCoreData = {
  version: 1;
  users: LocalCoreAuthUser[];
  profiles: Profile[];
  clients: ClientRecord[];
  feedbackEntries: FeedbackEntryRecord[];
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
  aiUsage: LocalAiUsage[];
  counters: {
    invoice_number: number;
    quote_number: number;
    delivery_note_number: number;
  };
};

const LOCAL_SESSION_COOKIE = "facturaia-local-session";
let localCoreMutationQueue: Promise<unknown> = Promise.resolve();

function getDefaultLocalData(): LocalCoreData {
  return {
    version: 1,
    users: [],
    profiles: [],
    clients: [],
    feedbackEntries: [],
    auditEvents: [],
    authRateLimits: [],
    invoices: [],
    invoiceReminders: [],
    bankMovements: [],
    messageConnections: [],
    messageThreads: [],
    messageRecords: [],
    mailThreads: [],
    mailMessages: [],
    mailSyncRuns: [],
    commercialDocuments: [],
    documentSignatureRequests: [],
    expenses: [],
    aiUsage: [],
    counters: {
      invoice_number: 0,
      quote_number: 0,
      delivery_note_number: 0,
    },
  };
}

export function getLocalDataDir() {
  return getLocalDataDirFromDb();
}

function normalizeLocalCoreData(parsed: Partial<LocalCoreData> | null | undefined): LocalCoreData {
  return {
    ...getDefaultLocalData(),
    ...(parsed ?? {}),
    counters: {
      ...getDefaultLocalData().counters,
      ...(parsed?.counters ?? {}),
    },
  };
}

function tryParseLocalCoreData(raw: string) {
  try {
    return normalizeLocalCoreData(JSON.parse(raw) as LocalCoreData);
  } catch (error) {
    let cursor = raw.lastIndexOf("}");

    while (cursor !== -1) {
      try {
        return normalizeLocalCoreData(JSON.parse(raw.slice(0, cursor + 1)) as LocalCoreData);
      } catch {
        cursor = raw.lastIndexOf("}", cursor - 1);
      }
    }

    throw error;
  }
}

async function readLocalCoreData(): Promise<LocalCoreData> {
  try {
    const raw = await readLocalStateText();
    const structuredSlices = await readStructuredLocalCoreSlices();

    const baseData = raw
      ? (() => {
          const encryptedEnvelope = tryParseEncryptedEnvelope(raw);

          return encryptedEnvelope
            ? tryParseLocalCoreData(
                decryptEncryptedEnvelope(encryptedEnvelope, "local-core"),
              )
            : tryParseLocalCoreData(raw);
        })()
      : getDefaultLocalData();

    if (!structuredSlices) {
      return baseData;
    }

    return {
      ...baseData,
      users: structuredSlices.users,
      profiles: structuredSlices.profiles,
      feedbackEntries: structuredSlices.feedbackEntries,
      clients: structuredSlices.clients,
      auditEvents: structuredSlices.auditEvents,
      authRateLimits: structuredSlices.authRateLimits,
      invoices: structuredSlices.invoices,
      invoiceReminders: structuredSlices.invoiceReminders,
      counters: {
        ...baseData.counters,
        ...structuredSlices.counters,
      },
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
      return getDefaultLocalData();
    }

    throw error;
  }
}

async function writeLocalCoreData(
  data: LocalCoreData,
  options?: {
    structuredSections?: StructuredMirrorSection[];
    structuredMutation?: StructuredMirrorMutation;
    skipStructuredMirrorSync?: boolean;
  },
) {
  const serialized = JSON.stringify(data, null, 2);
  const payload = isLocalDataEncryptionRequested()
    ? JSON.stringify(encryptTextForScope(serialized, "local-core"), null, 2)
    : serialized;
  await writeLocalStateText(payload, serialized, options);
}

async function runLocalCoreMutation<T>(task: () => Promise<T>) {
  const pending = localCoreMutationQueue.then(task, task);
  localCoreMutationQueue = pending.then(() => undefined, () => undefined);
  return pending;
}

async function updateLocalCoreData<T>(
  updater: (data: LocalCoreData) => T | Promise<T>,
  options?: {
    structuredSections?: StructuredMirrorSection[];
  },
) {
  return runLocalCoreMutation(async () => {
    const data = await readLocalCoreData();
    const result = await updater(data);
    await writeLocalCoreData(data, {
      structuredSections: options?.structuredSections,
    });
    return result;
  });
}

function nowIso() {
  return new Date().toISOString();
}

function getNormalizedEmail(email: string) {
  return email.trim().toLowerCase();
}

function getLocalSessionSecretFallback() {
  const publicEnv = getOptionalPublicEnv();
  return createHash("sha256")
    .update(`${publicEnv.NEXT_PUBLIC_APP_URL}:${getLocalDataDir()}`)
    .digest("hex");
}

function getConfiguredLocalSessionSecret() {
  return getLocalRuntimeEnv().FACTURAIA_LOCAL_SESSION_SECRET ?? null;
}

function getLocalSessionSecret() {
  const configured = getConfiguredLocalSessionSecret();

  if (configured) {
    return configured;
  }

  if (process.env.NODE_ENV === "production") {
    return null;
  }

  return getLocalSessionSecretFallback();
}

export function getLocalSecurityPolicy() {
  const env = getLocalRuntimeEnv();
  const sessionMaxAgeHours = env.FACTURAIA_LOCAL_SESSION_MAX_AGE_HOURS;
  const loginMaxAttempts = Math.max(1, Math.trunc(env.FACTURAIA_LOCAL_LOGIN_MAX_ATTEMPTS));
  const loginLockoutMinutes = Math.max(
    1,
    Math.trunc(env.FACTURAIA_LOCAL_LOGIN_LOCKOUT_MINUTES),
  );

  return {
    sessionSecretConfigured: Boolean(getConfiguredLocalSessionSecret()),
    sessionMaxAgeHours,
    sessionMaxAgeSeconds: sessionMaxAgeHours * 60 * 60,
    loginMaxAttempts,
    loginLockoutMinutes,
  };
}

export function getLocalSessionMaxAgeSeconds() {
  return getLocalSecurityPolicy().sessionMaxAgeSeconds;
}

export function getLocalSecurityIssues() {
  const env = getLocalRuntimeEnv();
  const issues: string[] = [];
  const configuredSessionSecret = getConfiguredLocalSessionSecret();
  const encryptionRequested =
    env.FACTURAIA_ENCRYPT_LOCAL_DATA || env.FACTURAIA_ENCRYPT_BACKUPS;
  const encryptionPassphrase = env.FACTURAIA_ENCRYPTION_PASSPHRASE;

  if (process.env.NODE_ENV === "production" && !configuredSessionSecret) {
    issues.push("FACTURAIA_LOCAL_SESSION_SECRET es obligatorio en producción.");
  }

  if (process.env.NODE_ENV === "production" && encryptionRequested && !encryptionPassphrase) {
    issues.push(
      "FACTURAIA_ENCRYPTION_PASSPHRASE es obligatoria en producción cuando activas cifrado local o de backups.",
    );
  }

  return issues;
}

export function getLocalSecurityReadiness() {
  const issues = getLocalSecurityIssues();

  return {
    ready: issues.length === 0,
    issues,
  };
}

function getLocalLoginAttemptKey(email: string, ipAddress: string | null) {
  return `${getNormalizedEmail(email)}::${ipAddress?.trim() || "local"}`;
}

function buildLocalAuditEventRecord(
  {
    userId,
    actorType,
    actorId,
    source,
    action,
    entityType,
    entityId,
    beforeJson,
    afterJson,
    contextJson,
  }: {
    userId: string | null;
    actorType: LocalAuditActorType;
    actorId: string | null;
    source: LocalAuditSource;
    action: string;
    entityType: string;
    entityId: string | null;
    beforeJson?: Record<string, unknown> | null;
    afterJson?: Record<string, unknown> | null;
      contextJson?: Record<string, unknown>;
  },
) {
  return {
    id: randomUUID(),
    user_id: userId,
    actor_type: actorType,
    actor_id: actorId,
    source,
    action,
    entity_type: entityType,
    entity_id: entityId,
    before_json: beforeJson ?? null,
    after_json: afterJson ?? null,
    context_json: contextJson ?? {},
    created_at: nowIso(),
  } satisfies LocalAuditEventRecord;
}

function appendLocalAuditEvent(data: LocalCoreData, entry: LocalAuditEventRecord) {
  data.auditEvents.push(entry);

  if (data.auditEvents.length > 5000) {
    data.auditEvents = data.auditEvents
      .sort((left, right) => left.created_at.localeCompare(right.created_at))
      .slice(-5000);
  }
}

function createLocalAuditEvent(
  data: LocalCoreData,
  input: {
    userId: string | null;
    actorType: LocalAuditActorType;
    actorId: string | null;
    source: LocalAuditSource;
    action: string;
    entityType: string;
    entityId: string | null;
    beforeJson?: Record<string, unknown> | null;
    afterJson?: Record<string, unknown> | null;
    contextJson?: Record<string, unknown>;
  },
) {
  const entry = buildLocalAuditEventRecord(input);
  appendLocalAuditEvent(data, entry);
  return entry;
}

function canUseStructuredLocalRepositories() {
  return !getLocalRuntimeEnv().FACTURAIA_ENCRYPT_LOCAL_DATA;
}

function buildProfileAuditSnapshot(profile: Profile | null | undefined) {
  if (!profile) {
    return null;
  }

  return {
    email: profile.email,
    fullName: profile.full_name,
    nif: profile.nif,
    address: profile.address,
    hasLogo: Boolean(profile.logo_url),
  };
}

function buildInvoiceAuditSnapshot(invoice: InvoiceRecord | null | undefined) {
  if (!invoice) {
    return null;
  }

  return {
    invoiceNumber: invoice.invoice_number,
    clientName: invoice.client_name,
    grandTotal: toNumber(invoice.grand_total),
    dueDate: invoice.due_date,
    paymentStatus: invoice.payment_status,
    amountPaid: toNumber(invoice.amount_paid),
    paidAt: invoice.paid_at,
  };
}

function buildSignatureAuditSnapshot(request: DocumentSignatureRequestRecord | null | undefined) {
  if (!request) {
    return null;
  }

  return {
    documentId: request.document_id,
    documentType: request.document_type,
    requestKind: request.request_kind,
    status: request.status,
    signerName: request.signer_name,
    signerEmail: request.signer_email,
    signerNif: request.signer_nif,
    respondedAt: request.responded_at,
  };
}

function buildBankMovementAuditSnapshot(movement: BankMovementRecord | null | undefined) {
  if (!movement) {
    return null;
  }

  return {
    bookingDate: movement.booking_date,
    amount: toNumber(movement.amount),
    direction: movement.direction,
    status: movement.status,
    matchedInvoiceId: movement.matched_invoice_id,
    matchedExpenseId: movement.matched_expense_id,
    sourceFileName: movement.source_file_name,
    notes: movement.notes,
  };
}

function buildClientAuditSnapshot(client: ClientRecord | null | undefined) {
  if (!client) {
    return null;
  }

  return {
    relationKind: client.relation_kind,
    status: client.status,
    priority: client.priority,
    displayName: client.display_name,
    email: client.email,
    phone: client.phone,
    nif: client.nif,
    tags: [...client.tags].sort(),
  };
}

function buildExpenseAuditSnapshot(expense: ExpenseRecord | null | undefined) {
  if (!expense) {
    return null;
  }

  return {
    expenseKind: expense.expense_kind,
    reviewStatus: expense.review_status,
    vendorName: expense.vendor_name,
    expenseDate: expense.expense_date,
    totalAmount: expense.total_amount === null ? null : toNumber(expense.total_amount),
    currency: expense.currency,
    extractionMethod: expense.text_extraction_method,
    sourceFileName: expense.source_file_name,
  };
}

function buildMessageConnectionAuditSnapshot(connection: MessageConnection | null | undefined) {
  if (!connection) {
    return null;
  }

  return {
    channel: connection.channel,
    label: connection.label,
    status: connection.status,
    inboundKey: connection.inbound_key,
    hasVerifyToken: Boolean(connection.verify_token),
    metadata: connection.metadata,
  };
}

function buildMessageThreadAuditSnapshot(thread: MessageThread | null | undefined) {
  if (!thread) {
    return null;
  }

  return {
    channel: thread.channel,
    fullName: thread.full_name,
    urgency: thread.urgency,
    urgencyScore: thread.urgency_score,
    urgencyLocked: thread.urgency_locked,
    unreadCount: thread.unread_count,
    lastMessageDirection: thread.last_message_direction,
    lastMessageAt: thread.last_message_at,
  };
}

function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, storedHash: string) {
  const [salt, expected] = storedHash.split(":");

  if (!salt || !expected) {
    return false;
  }

  const actual = scryptSync(password, salt, 64).toString("hex");
  return timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
}

export function getLocalSessionCookieName() {
  return LOCAL_SESSION_COOKIE;
}

export function signLocalSessionToken(userId: string) {
  const secret = getLocalSessionSecret();

  if (!secret) {
    throw new Error(
      "FACTURAIA_LOCAL_SESSION_SECRET es obligatorio en producción para usar el acceso local.",
    );
  }

  const payload = `${userId}.${Date.now()}`;
  const signature = createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  return `${payload}.${signature}`;
}

export function verifyLocalSessionToken(token: string | undefined | null) {
  if (!token) {
    return null;
  }

  const parts = token.split(".");

  if (parts.length !== 3) {
    return null;
  }

  const [userId, issuedAt, signature] = parts;
  const secret = getLocalSessionSecret();

  if (!secret) {
    return null;
  }

  const issuedAtMs = Number(issuedAt);

  if (!Number.isFinite(issuedAtMs)) {
    return null;
  }

  if (Date.now() - issuedAtMs > getLocalSessionMaxAgeSeconds() * 1000) {
    return null;
  }

  const payload = `${userId}.${issuedAt}`;
  const expected = createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  try {
    if (!timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"))) {
      return null;
    }
  } catch {
    return null;
  }

  return userId || null;
}

export async function listLocalAuditEventsForUser(userId: string, limit = 25) {
  const mirrored = await listStructuredAuditRepositoryRecords(userId, limit);

  if (mirrored) {
    return mirrored;
  }

  const data = await readLocalCoreData();
  return [...data.auditEvents]
    .filter((event) => event.user_id === userId)
    .sort((left, right) => right.created_at.localeCompare(left.created_at))
    .slice(0, Math.max(1, limit));
}

export async function recordLocalAuditEvent({
  userId,
  actorType,
  actorId,
  source,
  action,
  entityType,
  entityId,
  beforeJson,
  afterJson,
  contextJson,
}: {
  userId: string | null;
  actorType: LocalAuditActorType;
  actorId: string | null;
  source: LocalAuditSource;
  action: string;
  entityType: string;
  entityId: string | null;
  beforeJson?: Record<string, unknown> | null;
  afterJson?: Record<string, unknown> | null;
  contextJson?: Record<string, unknown>;
}) {
  return updateLocalCoreData(async (data) =>
    createLocalAuditEvent(data, {
      userId,
      actorType,
      actorId,
      source,
      action,
      entityType,
      entityId,
      beforeJson,
      afterJson,
      contextJson,
    }),
  );
}

export async function getLocalUserCount() {
  const data = await readLocalCoreData();
  return data.users.length;
}

export async function getLocalCoreSnapshot() {
  return readLocalCoreData();
}

export async function ensureInitialLocalUser(email: string, password: string) {
  return updateLocalCoreData(async (data) => {
    if (data.users.length > 0) {
      return data.users[0];
    }

    const timestamp = nowIso();
    const normalizedEmail = getNormalizedEmail(email);
    const user: LocalCoreAuthUser = {
      id: randomUUID(),
      email: normalizedEmail,
      password_hash: hashPassword(password),
      created_at: timestamp,
      updated_at: timestamp,
    };

    data.users.push(user);
    data.profiles.push({
      id: user.id,
      email: user.email,
      full_name: null,
      nif: null,
      address: null,
      logo_path: null,
      logo_url: null,
      created_at: timestamp,
      updated_at: timestamp,
    });
    createLocalAuditEvent(data, {
      userId: user.id,
      actorType: "system",
      actorId: "bootstrap",
      source: "auth",
      action: "local_user_bootstrapped",
      entityType: "user",
      entityId: user.id,
      afterJson: {
        email: user.email,
      },
      contextJson: {
        bootstrapEnabled: true,
      },
    });

    return user;
  });
}

export async function authenticateLocalUser(
  email: string,
  password: string,
  options?: {
    ipAddress?: string | null;
    userAgent?: string | null;
  },
): Promise<LocalAuthenticationResult> {
  return updateLocalCoreData(async (data) => {
    const normalizedEmail = getNormalizedEmail(email);
    const ipAddress = options?.ipAddress?.trim() || null;
    const userAgent = options?.userAgent?.trim() || null;
    const policy = getLocalSecurityPolicy();
    const attemptKey = getLocalLoginAttemptKey(normalizedEmail, ipAddress);
    const timestamp = nowIso();
    const nowMs = Date.now();
    let rateLimit = data.authRateLimits.find(
      (candidate) => candidate.scope === "local_login" && candidate.id === attemptKey,
    );
    const user = data.users.find(
      (candidate) => getNormalizedEmail(candidate.email) === normalizedEmail,
    );

    if (!rateLimit) {
      rateLimit = {
        id: attemptKey,
        scope: "local_login",
        email_key: normalizedEmail,
        ip_address: ipAddress,
        failed_attempts: 0,
        last_failed_at: null,
        locked_until: null,
        created_at: timestamp,
        updated_at: timestamp,
      };
      data.authRateLimits.push(rateLimit);
    } else if (
      rateLimit.locked_until &&
      new Date(rateLimit.locked_until).getTime() <= nowMs
    ) {
      rateLimit.failed_attempts = 0;
      rateLimit.locked_until = null;
      rateLimit.updated_at = timestamp;
    }

    if (
      rateLimit.locked_until &&
      new Date(rateLimit.locked_until).getTime() > nowMs
    ) {
      createLocalAuditEvent(data, {
        userId: user?.id ?? null,
        actorType: user ? "user" : "anonymous",
        actorId: user?.id ?? normalizedEmail,
        source: "auth",
        action: "local_login_blocked",
        entityType: "session",
        entityId: user?.id ?? null,
        beforeJson: {
          failedAttempts: rateLimit.failed_attempts,
        },
        afterJson: {
          lockedUntil: rateLimit.locked_until,
        },
        contextJson: {
          email: normalizedEmail,
          ipAddress,
          userAgent,
        },
      });

      return {
        status: "locked",
        remainingAttempts: 0,
        lockedUntil: rateLimit.locked_until,
      };
    }

    if (!user || !verifyPassword(password, user.password_hash)) {
      const beforeAttempts = rateLimit.failed_attempts;
      rateLimit.failed_attempts += 1;
      rateLimit.last_failed_at = timestamp;
      rateLimit.updated_at = timestamp;

      if (rateLimit.failed_attempts >= policy.loginMaxAttempts) {
        rateLimit.locked_until = new Date(
          nowMs + policy.loginLockoutMinutes * 60 * 1000,
        ).toISOString();
      }

      createLocalAuditEvent(data, {
        userId: user?.id ?? null,
        actorType: user ? "user" : "anonymous",
        actorId: user?.id ?? normalizedEmail,
        source: "auth",
        action: rateLimit.locked_until ? "local_login_locked" : "local_login_failed",
        entityType: "session",
        entityId: user?.id ?? null,
        beforeJson: {
          failedAttempts: beforeAttempts,
          lockedUntil: null,
        },
        afterJson: {
          failedAttempts: rateLimit.failed_attempts,
          lockedUntil: rateLimit.locked_until,
        },
        contextJson: {
          email: normalizedEmail,
          ipAddress,
          userAgent,
        },
      });

      if (rateLimit.locked_until) {
        return {
          status: "locked",
          remainingAttempts: 0,
          lockedUntil: rateLimit.locked_until,
        };
      }

      return {
        status: "invalid",
        remainingAttempts: Math.max(
          0,
          policy.loginMaxAttempts - rateLimit.failed_attempts,
        ),
        lockedUntil: null,
      };
    }

    data.authRateLimits = data.authRateLimits.filter(
      (candidate) => !(candidate.scope === "local_login" && candidate.email_key === normalizedEmail),
    );
    createLocalAuditEvent(data, {
      userId: user.id,
      actorType: "user",
      actorId: user.id,
      source: "auth",
      action: "local_login_succeeded",
      entityType: "session",
      entityId: user.id,
      afterJson: {
        email: user.email,
      },
      contextJson: {
        ipAddress,
        userAgent,
      },
    });

    return {
      status: "success",
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        updated_at: user.updated_at,
      } satisfies AppUserRecord,
    };
  });
}

export async function getLocalAppUserById(userId: string) {
  const data = await readLocalCoreData();
  const user = data.users.find((candidate) => candidate.id === userId);

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    created_at: user.created_at,
    updated_at: user.updated_at,
  } satisfies AppUserRecord;
}

export async function getLocalProfile(userId: string, email?: string | null) {
  const structuredProfile = await getStructuredProfileRepositoryRecord(userId);

  if (structuredProfile) {
    return structuredProfile;
  }

  const data = await readLocalCoreData();
  const existing = data.profiles.find((candidate) => candidate.id === userId);

  if (existing) {
    return existing;
  }

  const timestamp = nowIso();
  return {
    id: userId,
    email: email ?? "",
    full_name: null,
    nif: null,
    address: null,
    logo_path: null,
    logo_url: null,
    created_at: timestamp,
    updated_at: timestamp,
  } satisfies Profile;
}

export async function saveLocalProfile({
  userId,
  email,
  fullName,
  nif,
  address,
  logoUrl,
}: {
  userId: string;
  email: string;
  fullName: string;
  nif: string;
  address: string;
  logoUrl: string | null;
}) {
  if (canUseStructuredLocalRepositories()) {
    const timestamp = nowIso();
    const existing = await getStructuredProfileRepositoryRecord(userId);
    const profile: Profile = existing
      ? {
          ...existing,
          email,
          full_name: fullName,
          nif,
          address,
          logo_url: logoUrl,
          logo_path: null,
          updated_at: timestamp,
        }
      : {
          id: userId,
          email,
          full_name: fullName,
          nif,
          address,
          logo_path: null,
          logo_url: logoUrl,
          created_at: timestamp,
          updated_at: timestamp,
        };
    const auditEvent = buildLocalAuditEventRecord({
      userId,
      actorType: "user",
      actorId: userId,
      source: "profile",
      action: existing ? "profile_updated" : "profile_created",
      entityType: "profile",
      entityId: userId,
      beforeJson: buildProfileAuditSnapshot(existing),
      afterJson: buildProfileAuditSnapshot(profile),
    });
    const saved = await saveStructuredProfileRepositoryRecord({
      profile,
      auditEvent,
    });

    if (saved) {
      return saved;
    }
  }

  return updateLocalCoreData(async (data) => {
    const timestamp = nowIso();
    const existing = data.profiles.find((candidate) => candidate.id === userId);

    if (existing) {
      const beforeProfile = buildProfileAuditSnapshot(existing);
      existing.email = email;
      existing.full_name = fullName;
      existing.nif = nif;
      existing.address = address;
      existing.logo_url = logoUrl;
      existing.logo_path = null;
      existing.updated_at = timestamp;
      createLocalAuditEvent(data, {
        userId,
        actorType: "user",
        actorId: userId,
        source: "profile",
        action: "profile_updated",
        entityType: "profile",
        entityId: userId,
        beforeJson: beforeProfile,
        afterJson: buildProfileAuditSnapshot(existing),
      });
      return existing;
    }

    const profile: Profile = {
      id: userId,
      email,
      full_name: fullName,
      nif,
      address,
      logo_path: null,
      logo_url: logoUrl,
      created_at: timestamp,
      updated_at: timestamp,
    };
    data.profiles.push(profile);
    createLocalAuditEvent(data, {
      userId,
      actorType: "user",
      actorId: userId,
      source: "profile",
      action: "profile_created",
      entityType: "profile",
      entityId: userId,
      afterJson: buildProfileAuditSnapshot(profile),
    });
    return profile;
  });
}

function sortByUpdatedAtDescending<T extends { updated_at: string; created_at: string }>(items: T[]) {
  return [...items].sort((left, right) => {
    const updatedSort = right.updated_at.localeCompare(left.updated_at);
    if (updatedSort !== 0) {
      return updatedSort;
    }

    return right.created_at.localeCompare(left.created_at);
  });
}

function sortByPrimaryDateDescending<T extends { created_at: string; updated_at: string }>(
  items: T[],
  getDate: (item: T) => string | null | undefined,
) {
  return [...items].sort((left, right) => {
    const rightDate = getDate(right) ?? right.created_at;
    const leftDate = getDate(left) ?? left.created_at;
    const dateSort = rightDate.localeCompare(leftDate);

    if (dateSort !== 0) {
      return dateSort;
    }

    return right.updated_at.localeCompare(left.updated_at);
  });
}

export async function listLocalClientsForUser(userId: string) {
  const structuredClients = await listStructuredClientRepositoryRecords(userId);
  if (structuredClients) {
    return structuredClients;
  }

  const data = await readLocalCoreData();
  return sortByUpdatedAtDescending(
    data.clients.filter((client) => client.user_id === userId),
  );
}

export async function getLocalClientById(userId: string, clientId: string) {
  const structuredClient = await getStructuredClientRepositoryRecord(userId, clientId);
  if (structuredClient) {
    return structuredClient;
  }

  const clients = await listLocalClientsForUser(userId);
  return clients.find((client) => client.id === clientId) ?? null;
}

export async function listLocalFeedbackEntriesForUser(userId: string) {
  const structuredEntries = await listStructuredFeedbackRepositoryRecords(userId);

  if (structuredEntries) {
    return sortByPrimaryDateDescending(structuredEntries, (entry) => entry.created_at);
  }

  const data = await readLocalCoreData();
  return sortByPrimaryDateDescending(
    data.feedbackEntries.filter((entry) => entry.user_id === userId),
    (entry) => entry.created_at,
  );
}

export async function createLocalFeedbackEntry({
  userId,
  sourceType,
  moduleKey,
  severity,
  title,
  message,
  reporterName,
  contactEmail,
}: {
  userId: string;
  sourceType: FeedbackSourceType;
  moduleKey: string;
  severity: FeedbackSeverity;
  title: string;
  message: string;
  reporterName: string | null;
  contactEmail: string | null;
}) {
  if (canUseStructuredLocalRepositories()) {
    const timestamp = nowIso();
    const entry: FeedbackEntryRecord = {
      id: randomUUID(),
      user_id: userId,
      source_type: sourceType,
      module_key: moduleKey,
      severity,
      status: "open",
      title,
      message,
      reporter_name: reporterName,
      contact_email: contactEmail,
      created_at: timestamp,
      updated_at: timestamp,
    };
    const saved = await saveStructuredFeedbackRepositoryRecord(entry);

    if (saved) {
      return saved;
    }
  }

  return updateLocalCoreData(async (data) => {
    const timestamp = nowIso();
    const entry: FeedbackEntryRecord = {
      id: randomUUID(),
      user_id: userId,
      source_type: sourceType,
      module_key: moduleKey,
      severity,
      status: "open",
      title,
      message,
      reporter_name: reporterName,
      contact_email: contactEmail,
      created_at: timestamp,
      updated_at: timestamp,
    };

    data.feedbackEntries.push(entry);
    return entry;
  });
}

export async function updateLocalFeedbackStatus(
  userId: string,
  entryId: string,
  status: FeedbackStatus,
) {
  if (canUseStructuredLocalRepositories()) {
    const entries = await listStructuredFeedbackRepositoryRecords(userId);
    const entry = entries?.find((candidate) => candidate.id === entryId) ?? null;

    if (entry) {
      entry.status = status;
      entry.updated_at = nowIso();

      const saved = await saveStructuredFeedbackRepositoryRecord(entry);

      if (saved) {
        return saved;
      }
    }
  }

  return updateLocalCoreData(async (data) => {
    const entry = data.feedbackEntries.find(
      (candidate) => candidate.user_id === userId && candidate.id === entryId,
    );

    if (!entry) {
      return null;
    }

    entry.status = status;
    entry.updated_at = nowIso();
    return entry;
  });
}

export async function saveLocalClientRecord({
  userId,
  clientId,
  relationKind,
  status,
  priority,
  displayName,
  firstName,
  lastName,
  companyName,
  email,
  phone,
  nif,
  address,
  notes,
  tags,
}: {
  userId: string;
  clientId?: string;
  relationKind: ClientRelationKind;
  status: ClientStatus;
  priority: ClientPriority;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  nif: string | null;
  address: string | null;
  notes: string | null;
  tags: string[];
}) {
  if (canUseStructuredLocalRepositories()) {
    const timestamp = nowIso();
    const existing = clientId
      ? await getStructuredClientRepositoryRecord(userId, clientId)
      : null;
    const client: ClientRecord = existing
      ? {
          ...existing,
          relation_kind: relationKind,
          status,
          priority,
          display_name: displayName,
          first_name: firstName,
          last_name: lastName,
          company_name: companyName,
          email,
          phone,
          nif,
          address,
          notes,
          tags,
          updated_at: timestamp,
        }
      : {
          id: randomUUID(),
          user_id: userId,
          relation_kind: relationKind,
          status,
          priority,
          display_name: displayName,
          first_name: firstName,
          last_name: lastName,
          company_name: companyName,
          email,
          phone,
          nif,
          address,
          notes,
          tags,
          created_at: timestamp,
          updated_at: timestamp,
        };
    const auditEvent = buildLocalAuditEventRecord({
      userId,
      actorType: "user",
      actorId: userId,
      source: "clients",
      action: existing ? "client_updated" : "client_created",
      entityType: "client",
      entityId: client.id,
      beforeJson: buildClientAuditSnapshot(existing),
      afterJson: buildClientAuditSnapshot(client),
    });
    const saved = await saveStructuredClientRepositoryRecord({
      client,
      auditEvent,
    });

    if (saved) {
      return saved;
    }
  }

  return updateLocalCoreData(async (data) => {
    const timestamp = nowIso();
    const existing = clientId
      ? data.clients.find(
          (candidate) => candidate.user_id === userId && candidate.id === clientId,
        )
      : null;

    if (existing) {
      const beforeClient = buildClientAuditSnapshot(existing);
      existing.relation_kind = relationKind;
      existing.status = status;
      existing.priority = priority;
      existing.display_name = displayName;
      existing.first_name = firstName;
      existing.last_name = lastName;
      existing.company_name = companyName;
      existing.email = email;
      existing.phone = phone;
      existing.nif = nif;
      existing.address = address;
      existing.notes = notes;
      existing.tags = tags;
      existing.updated_at = timestamp;

      createLocalAuditEvent(data, {
        userId,
        actorType: "user",
        actorId: userId,
        source: "clients",
        action: "client_updated",
        entityType: "client",
        entityId: existing.id,
        beforeJson: beforeClient,
        afterJson: buildClientAuditSnapshot(existing),
      });
      return existing;
    }

    const client: ClientRecord = {
      id: randomUUID(),
      user_id: userId,
      relation_kind: relationKind,
      status,
      priority,
      display_name: displayName,
      first_name: firstName,
      last_name: lastName,
      company_name: companyName,
      email,
      phone,
      nif,
      address,
      notes,
      tags,
      created_at: timestamp,
      updated_at: timestamp,
    };

    data.clients.push(client);
    createLocalAuditEvent(data, {
      userId,
      actorType: "user",
      actorId: userId,
      source: "clients",
      action: "client_created",
      entityType: "client",
      entityId: client.id,
      afterJson: buildClientAuditSnapshot(client),
    });
    return client;
  }, {
    structuredSections: ["clients", "auditEvents"],
  });
}

export async function listLocalInvoicesForUser(userId: string) {
  const structuredInvoices = await listStructuredInvoiceRepositoryRecords(userId);
  if (structuredInvoices) {
    return structuredInvoices;
  }

  const data = await readLocalCoreData();
  return data.invoices
    .filter((invoice) => invoice.user_id === userId)
    .sort((left, right) => {
      const issueSort = right.issue_date.localeCompare(left.issue_date);
      if (issueSort !== 0) {
        return issueSort;
      }
      return right.created_at.localeCompare(left.created_at);
    });
}

export async function getLocalInvoiceById(userId: string, invoiceId: string) {
  const structuredInvoice = await getStructuredInvoiceRepositoryRecord(userId, invoiceId);
  if (structuredInvoice) {
    return structuredInvoice;
  }

  const invoices = await listLocalInvoicesForUser(userId);
  return invoices.find((invoice) => invoice.id === invoiceId) ?? null;
}

export async function getLocalInvoiceByPublicId(publicId: string) {
  const structuredInvoice = await getStructuredInvoiceRepositoryRecordByPublicId(publicId);
  if (structuredInvoice) {
    return structuredInvoice;
  }

  const data = await readLocalCoreData();
  return data.invoices.find((invoice) => invoice.public_id === publicId) ?? null;
}

export async function createLocalInvoiceRecord({
  userId,
  payload,
  lineItems,
  totals,
  issuerLogoUrl,
}: {
  userId: string;
  payload: {
    issueDate: string;
    dueDate: string;
    issuerName: string;
    issuerNif: string;
    issuerAddress: string;
    clientName: string;
    clientNif: string;
    clientAddress: string;
    clientEmail: string;
  };
  lineItems: InvoiceLineItemStored[];
  totals: InvoiceTotals;
  issuerLogoUrl: string | null;
}) {
  if (canUseStructuredLocalRepositories()) {
    const timestamp = nowIso();
    const counters =
      (await getStructuredInvoiceRepositoryCounters()) ?? getDefaultLocalData().counters;
    const invoiceNumber = counters.invoice_number + 1;
    const nextCounters = {
      ...counters,
      invoice_number: invoiceNumber,
    };
    const invoice: InvoiceRecord = {
      id: randomUUID(),
      user_id: userId,
      public_id: randomUUID(),
      invoice_number: invoiceNumber,
      issue_date: payload.issueDate,
      due_date: payload.dueDate,
      issuer_name: payload.issuerName,
      issuer_nif: payload.issuerNif,
      issuer_address: payload.issuerAddress,
      issuer_logo_url: issuerLogoUrl,
      client_name: payload.clientName,
      client_nif: payload.clientNif,
      client_address: payload.clientAddress,
      client_email: payload.clientEmail,
      line_items: lineItems,
      subtotal: totals.subtotal,
      vat_total: totals.vatTotal,
      irpf_rate: totals.irpfRate,
      irpf_amount: totals.irpfAmount,
      grand_total: totals.grandTotal,
      amount_paid: 0,
      payment_status: "pending",
      paid_at: null,
      last_reminder_at: null,
      reminder_count: 0,
      collection_notes: null,
      vat_breakdown: totals.vatBreakdown,
      created_at: timestamp,
      updated_at: timestamp,
    };
    const auditEvent = buildLocalAuditEventRecord({
      userId,
      actorType: "user",
      actorId: userId,
      source: "invoices",
      action: "invoice_created",
      entityType: "invoice",
      entityId: invoice.id,
      afterJson: buildInvoiceAuditSnapshot(invoice),
    });
    const saved = await persistStructuredInvoiceRepositoryState({
      invoices: [invoice],
      auditEvents: [auditEvent],
      counters: nextCounters,
    });

    if (saved) {
      return invoice;
    }
  }

  return updateLocalCoreData(async (data) => {
    const timestamp = nowIso();
    const invoiceNumber = data.counters.invoice_number + 1;
    data.counters.invoice_number = invoiceNumber;

    const invoice: InvoiceRecord = {
      id: randomUUID(),
      user_id: userId,
      public_id: randomUUID(),
      invoice_number: invoiceNumber,
      issue_date: payload.issueDate,
      due_date: payload.dueDate,
      issuer_name: payload.issuerName,
      issuer_nif: payload.issuerNif,
      issuer_address: payload.issuerAddress,
      issuer_logo_url: issuerLogoUrl,
      client_name: payload.clientName,
      client_nif: payload.clientNif,
      client_address: payload.clientAddress,
      client_email: payload.clientEmail,
      line_items: lineItems,
      subtotal: totals.subtotal,
      vat_total: totals.vatTotal,
      irpf_rate: totals.irpfRate,
      irpf_amount: totals.irpfAmount,
      grand_total: totals.grandTotal,
      amount_paid: 0,
      payment_status: "pending",
      paid_at: null,
      last_reminder_at: null,
      reminder_count: 0,
      collection_notes: null,
      vat_breakdown: totals.vatBreakdown,
      created_at: timestamp,
      updated_at: timestamp,
    };

    data.invoices.push(invoice);
    createLocalAuditEvent(data, {
      userId,
      actorType: "user",
      actorId: userId,
      source: "invoices",
      action: "invoice_created",
      entityType: "invoice",
      entityId: invoice.id,
      afterJson: buildInvoiceAuditSnapshot(invoice),
    });
    return invoice;
  }, {
    structuredSections: ["invoices", "auditEvents", "counters"],
  });
}

export async function listLocalCommercialDocumentsForUser(userId: string) {
  const data = await readLocalCoreData();
  return sortByPrimaryDateDescending(
    data.commercialDocuments.filter((document) => document.user_id === userId),
    (document) => document.issue_date,
  );
}

export async function getLocalCommercialDocumentById(userId: string, documentId: string) {
  const documents = await listLocalCommercialDocumentsForUser(userId);
  return documents.find((document) => document.id === documentId) ?? null;
}

export async function createLocalCommercialDocumentRecord({
  userId,
  input,
}: {
  userId: string;
  input: Omit<
    CommercialDocumentRecord,
    "id" | "user_id" | "public_id" | "document_number" | "created_at" | "updated_at"
  >;
}) {
  return updateLocalCoreData(async (data) => {
    const timestamp = nowIso();
    const counterKey =
      input.document_type === "quote" ? "quote_number" : "delivery_note_number";
    const counters = canUseStructuredLocalRepositories()
      ? (await getStructuredCounterRepositoryState()) ?? data.counters
      : data.counters;
    const documentNumber = counters[counterKey] + 1;
    data.counters = {
      ...counters,
      [counterKey]: documentNumber,
    };

    const document: CommercialDocumentRecord = {
      id: randomUUID(),
      user_id: userId,
      public_id: randomUUID(),
      document_number: documentNumber,
      created_at: timestamp,
      updated_at: timestamp,
      ...input,
    };

    data.commercialDocuments.push(document);
    return document;
  });
}

export async function updateLocalCommercialDocumentStatus(
  userId: string,
  documentId: string,
  status: CommercialDocumentStatus,
) {
  return updateLocalCoreData(async (data) => {
    const document = data.commercialDocuments.find(
      (candidate) => candidate.user_id === userId && candidate.id === documentId,
    );

    if (!document) {
      return null;
    }

    document.status = status;
    document.updated_at = nowIso();
    return document;
  });
}

export async function linkLocalCommercialDocumentToInvoice({
  userId,
  documentId,
  invoiceId,
}: {
  userId: string;
  documentId: string;
  invoiceId: string;
}) {
  return updateLocalCoreData(async (data) => {
    const document = data.commercialDocuments.find(
      (candidate) => candidate.user_id === userId && candidate.id === documentId,
    );

    if (!document) {
      return null;
    }

    document.status = "converted";
    document.converted_invoice_id = invoiceId;
    document.updated_at = nowIso();
    return document;
  });
}

export async function listLocalExpensesForUser(userId: string) {
  const data = await readLocalCoreData();
  return sortByPrimaryDateDescending(
    data.expenses.filter((expense) => expense.user_id === userId),
    (expense) => expense.expense_date,
  );
}

export async function getLocalExpenseById(userId: string, expenseId: string) {
  const expenses = await listLocalExpensesForUser(userId);
  return expenses.find((expense) => expense.id === expenseId) ?? null;
}

export async function createLocalExpenseRecord({
  userId,
  expenseKind,
  reviewStatus,
  vendorName,
  vendorNif,
  expenseDate,
  currency,
  baseAmount,
  vatAmount,
  totalAmount,
  notes,
  sourceFileName,
  sourceFilePath,
  sourceFileMimeType,
  extractionMethod,
  rawText,
  extractedPayload,
}: {
  userId: string;
  expenseKind: ExpenseKind;
  reviewStatus: ExpenseRecord["review_status"];
  vendorName: string | null;
  vendorNif: string | null;
  expenseDate: string | null;
  currency: string;
  baseAmount: number | null;
  vatAmount: number | null;
  totalAmount: number | null;
  notes: string | null;
  sourceFileName: string | null;
  sourceFilePath: string | null;
  sourceFileMimeType: string | null;
  extractionMethod: ExpenseExtractionMethod;
  rawText: string | null;
  extractedPayload: Record<string, unknown>;
}) {
  return updateLocalCoreData(async (data) => {
    const timestamp = nowIso();
    const expense: ExpenseRecord = {
      id: randomUUID(),
      user_id: userId,
      expense_kind: expenseKind,
      review_status: reviewStatus,
      vendor_name: vendorName,
      vendor_nif: vendorNif,
      expense_date: expenseDate,
      currency,
      base_amount: baseAmount,
      vat_amount: vatAmount,
      total_amount: totalAmount,
      notes,
      source_file_name: sourceFileName,
      source_file_path: sourceFilePath,
      source_file_mime_type: sourceFileMimeType,
      text_extraction_method: extractionMethod,
      raw_text: rawText,
      extracted_payload: extractedPayload,
      created_at: timestamp,
      updated_at: timestamp,
    };

    data.expenses.push(expense);
    createLocalAuditEvent(data, {
      userId,
      actorType: "user",
      actorId: userId,
      source: "expenses",
      action: "expense_created",
      entityType: "expense",
      entityId: expense.id,
      afterJson: buildExpenseAuditSnapshot(expense),
    });
    return expense;
  });
}

export async function toggleLocalExpenseReview(userId: string, expenseId: string) {
  return updateLocalCoreData(async (data) => {
    const expense = data.expenses.find(
      (candidate) => candidate.user_id === userId && candidate.id === expenseId,
    );

    if (!expense) {
      return null;
    }

    const beforeExpense = buildExpenseAuditSnapshot(expense);
    expense.review_status = expense.review_status === "draft" ? "reviewed" : "draft";
    expense.updated_at = nowIso();
    createLocalAuditEvent(data, {
      userId,
      actorType: "user",
      actorId: userId,
      source: "expenses",
      action:
        expense.review_status === "reviewed"
          ? "expense_marked_reviewed"
          : "expense_reopened",
      entityType: "expense",
      entityId: expense.id,
      beforeJson: beforeExpense,
      afterJson: buildExpenseAuditSnapshot(expense),
    });
    return expense;
  });
}

export async function listLocalDocumentSignatureRequestsForUser(userId: string) {
  const data = await readLocalCoreData();
  return sortByPrimaryDateDescending(
    data.documentSignatureRequests.filter((request) => request.user_id === userId),
    (request) => request.requested_at,
  );
}

export async function getLocalDocumentSignatureRequestById(userId: string, requestId: string) {
  const requests = await listLocalDocumentSignatureRequestsForUser(userId);
  return requests.find((request) => request.id === requestId) ?? null;
}

export async function expireLocalDocumentSignatureRequest(requestId: string) {
  return updateLocalCoreData(async (data) => {
    const request = data.documentSignatureRequests.find((candidate) => candidate.id === requestId);

    if (!request || request.status !== "pending") {
      return request ?? null;
    }

    request.status = "expired";
    request.updated_at = nowIso();
    return request;
  });
}

export async function createLocalDocumentSignatureRequest({
  userId,
  documentId,
  documentType,
  requestKind,
  publicToken,
  requestNote,
  requestedAt,
  expiresAt,
  evidence,
}: {
  userId: string;
  documentId: string;
  documentType: CommercialDocumentType;
  requestKind: DocumentSignatureRequestRecord["request_kind"];
  publicToken: string;
  requestNote: string | null;
  requestedAt: string;
  expiresAt: string | null;
  evidence: Record<string, unknown>;
}) {
  return updateLocalCoreData(async (data) => {
    const timestamp = nowIso();
    const revokedPendingRequestIds: string[] = [];

    data.documentSignatureRequests.forEach((request) => {
      if (
        request.user_id === userId &&
        request.document_id === documentId &&
        request.status === "pending"
      ) {
        revokedPendingRequestIds.push(request.id);
        request.status = "revoked";
        request.responded_at = timestamp;
        request.updated_at = timestamp;
      }
    });

    const request: DocumentSignatureRequestRecord = {
      id: randomUUID(),
      user_id: userId,
      document_id: documentId,
      document_type: documentType,
      request_kind: requestKind,
      status: "pending",
      public_token: publicToken,
      request_note: requestNote,
      requested_at: requestedAt,
      expires_at: expiresAt,
      viewed_at: null,
      responded_at: null,
      signer_name: null,
      signer_email: null,
      signer_nif: null,
      signer_message: null,
      evidence,
      created_at: timestamp,
      updated_at: timestamp,
    };

    data.documentSignatureRequests.push(request);
    createLocalAuditEvent(data, {
      userId,
      actorType: "user",
      actorId: userId,
      source: "signatures",
      action: "signature_request_created",
      entityType: "signature_request",
      entityId: request.id,
      afterJson: buildSignatureAuditSnapshot(request),
      contextJson: {
        revokedPendingRequestIds,
        documentId,
        documentType,
      },
    });
    return request;
  });
}

export async function revokeLocalDocumentSignatureRequest(userId: string, requestId: string) {
  return updateLocalCoreData(async (data) => {
    const request = data.documentSignatureRequests.find(
      (candidate) =>
        candidate.user_id === userId &&
        candidate.id === requestId &&
        candidate.status === "pending",
    );

    if (!request) {
      return null;
    }

    const timestamp = nowIso();
    const beforeRequest = buildSignatureAuditSnapshot(request);
    request.status = "revoked";
    request.responded_at = timestamp;
    request.updated_at = timestamp;
    createLocalAuditEvent(data, {
      userId,
      actorType: "user",
      actorId: userId,
      source: "signatures",
      action: "signature_request_revoked",
      entityType: "signature_request",
      entityId: request.id,
      beforeJson: beforeRequest,
      afterJson: buildSignatureAuditSnapshot(request),
    });
    return request;
  });
}

export async function getLocalPublicSignatureRequestByToken(token: string) {
  const data = await readLocalCoreData();
  return data.documentSignatureRequests.find((request) => request.public_token === token) ?? null;
}

export async function markLocalSignatureRequestViewed(token: string) {
  return updateLocalCoreData(async (data) => {
    const request = data.documentSignatureRequests.find(
      (candidate) => candidate.public_token === token,
    );

    if (!request || request.status !== "pending" || request.viewed_at) {
      return request ?? null;
    }

    request.viewed_at = nowIso();
    request.updated_at = request.viewed_at;
    return request;
  });
}

export async function respondToLocalDocumentSignatureRequest({
  token,
  status,
  signerName,
  signerEmail,
  signerNif,
  signerMessage,
  acceptedTerms,
  forwardedFor,
  userAgent,
}: {
  token: string;
  status: Extract<DocumentSignatureStatus, "signed" | "rejected">;
  signerName: string;
  signerEmail: string | null;
  signerNif: string | null;
  signerMessage: string | null;
  acceptedTerms: boolean;
  forwardedFor: string | null;
  userAgent: string | null;
}) {
  return updateLocalCoreData(async (data) => {
    const request = data.documentSignatureRequests.find(
      (candidate) => candidate.public_token === token,
    );

    if (!request || request.status !== "pending") {
      return null;
    }

    const timestamp = nowIso();
    const beforeRequest = buildSignatureAuditSnapshot(request);
    request.status = status;
    request.viewed_at = request.viewed_at ?? timestamp;
    request.responded_at = timestamp;
    request.signer_name = signerName;
    request.signer_email = signerEmail;
    request.signer_nif = signerNif;
    request.signer_message = signerMessage;
    request.evidence = {
      ...(typeof request.evidence === "object" && request.evidence ? request.evidence : {}),
      forwardedFor,
      userAgent,
      acceptedTerms,
      decision: status === "signed" ? "accept" : "reject",
      respondedAt: timestamp,
    };
    request.updated_at = timestamp;

    const document = data.commercialDocuments.find(
      (candidate) =>
        candidate.user_id === request.user_id && candidate.id === request.document_id,
    );

    if (document) {
      document.status =
        status === "signed"
          ? document.document_type === "quote"
            ? "accepted"
            : "signed"
          : document.document_type === "quote"
            ? "rejected"
            : document.status;
      document.updated_at = timestamp;
    }

    createLocalAuditEvent(data, {
      userId: request.user_id,
      actorType: "public",
      actorId: signerEmail ?? signerNif ?? signerName,
      source: "signatures",
      action: status === "signed" ? "signature_request_signed" : "signature_request_rejected",
      entityType: "signature_request",
      entityId: request.id,
      beforeJson: beforeRequest,
      afterJson: buildSignatureAuditSnapshot(request),
      contextJson: {
        documentStatus: document?.status ?? null,
        forwardedFor,
        acceptedTerms,
      },
    });

    return request;
  });
}

export async function updateLocalInvoicePaymentState(
  userId: string,
  invoiceId: string,
  actionKind: "mark_paid" | "reopen",
) {
  const [invoice] = await updateLocalInvoicePaymentStates(userId, [invoiceId], actionKind);
  return invoice ?? null;
}

function resolveLocalSyncedPaymentStatus(amountPaid: number, grandTotal: number) {
  if (amountPaid <= 0) {
    return "pending" as const;
  }

  if (amountPaid + 0.01 >= grandTotal) {
    return "paid" as const;
  }

  return "partial" as const;
}

function toPaidAtIso(dateValue: string | null) {
  if (!dateValue) {
    return null;
  }

  return new Date(`${dateValue}T12:00:00.000Z`).toISOString();
}

export async function listLocalBankMovementsForUser(userId: string) {
  const data = await readLocalCoreData();
  return [...data.bankMovements]
    .filter((movement) => movement.user_id === userId)
    .sort((left, right) => {
      const bookingSort = right.booking_date.localeCompare(left.booking_date);

      if (bookingSort !== 0) {
        return bookingSort;
      }

      return right.created_at.localeCompare(left.created_at);
    });
}

export async function getLocalBankMovementById(userId: string, movementId: string) {
  const movements = await listLocalBankMovementsForUser(userId);
  return movements.find((movement) => movement.id === movementId) ?? null;
}

export async function createLocalBankMovementRecords({
  userId,
  rows,
}: {
  userId: string;
  rows: Array<{
    accountLabel: string;
    bookingDate: string;
    valueDate: string | null;
    description: string;
    counterpartyName: string | null;
    amount: number;
    currency: string;
    direction: BankMovementDirection;
    balance: number | null;
    sourceFileName: string | null;
    sourceHash: string;
    rawRow: Record<string, unknown>;
  }>;
}) {
  return updateLocalCoreData(async (data) => {
    const existingHashes = new Set(
      data.bankMovements
        .filter((movement) => movement.user_id === userId)
        .map((movement) => movement.source_hash),
    );
    const timestamp = nowIso();
    const inserted: BankMovementRecord[] = [];

    for (const row of rows) {
      if (existingHashes.has(row.sourceHash)) {
        continue;
      }

      const movement: BankMovementRecord = {
        id: randomUUID(),
        user_id: userId,
        account_label: row.accountLabel,
        booking_date: row.bookingDate,
        value_date: row.valueDate,
        description: row.description,
        counterparty_name: row.counterpartyName,
        amount: row.amount,
        currency: row.currency,
        direction: row.direction,
        balance: row.balance,
        status: "pending",
        matched_invoice_id: null,
        matched_expense_id: null,
        notes: null,
        source_file_name: row.sourceFileName,
        source_hash: row.sourceHash,
        raw_row: row.rawRow,
        imported_at: timestamp,
        created_at: timestamp,
        updated_at: timestamp,
      };

      data.bankMovements.push(movement);
      inserted.push(movement);
      existingHashes.add(row.sourceHash);
    }

    if (inserted.length > 0) {
      createLocalAuditEvent(data, {
        userId,
        actorType: "user",
        actorId: userId,
        source: "banking",
        action: "bank_movements_imported",
        entityType: "bank_movements",
        entityId: null,
        afterJson: {
          inserted: inserted.length,
        },
        contextJson: {
          sourceFiles: Array.from(
            new Set(inserted.map((movement) => movement.source_file_name).filter(Boolean)),
          ),
          sourceHashes: inserted.map((movement) => movement.source_hash),
        },
      });
    }

    return inserted;
  });
}

export async function reconcileLocalBankMovement({
  userId,
  movementId,
  actionKind,
  targetId,
  notes,
}: {
  userId: string;
  movementId: string;
  actionKind: "match_invoice" | "match_expense" | "ignore" | "clear";
  targetId?: string;
  notes?: string | null;
}) {
  return updateLocalCoreData(async (data) => {
    const movement = data.bankMovements.find(
      (candidate) => candidate.user_id === userId && candidate.id === movementId,
    );

    if (!movement) {
      return null;
    }

    const timestamp = nowIso();
    const beforeMovement = buildBankMovementAuditSnapshot(movement);

    if (actionKind === "match_invoice") {
      movement.status = "reconciled";
      movement.matched_invoice_id = targetId ?? null;
      movement.matched_expense_id = null;
      movement.notes = notes ?? movement.notes ?? "Conciliado manualmente con una factura.";
    } else if (actionKind === "match_expense") {
      movement.status = "reconciled";
      movement.matched_invoice_id = null;
      movement.matched_expense_id = targetId ?? null;
      movement.notes = notes ?? movement.notes ?? "Conciliado manualmente con un gasto.";
    } else if (actionKind === "ignore") {
      movement.status = "ignored";
      movement.matched_invoice_id = null;
      movement.matched_expense_id = null;
      movement.notes = notes ?? movement.notes ?? "Marcado como ignorado manualmente.";
    } else {
      movement.status = "pending";
      movement.matched_invoice_id = null;
      movement.matched_expense_id = null;
      movement.notes = notes ?? null;
    }

    movement.updated_at = timestamp;
    createLocalAuditEvent(data, {
      userId,
      actorType: "user",
      actorId: userId,
      source: "banking",
      action: `bank_movement_${actionKind}`,
      entityType: "bank_movement",
      entityId: movement.id,
      beforeJson: beforeMovement,
      afterJson: buildBankMovementAuditSnapshot(movement),
    });
    return movement;
  });
}

export async function syncLocalInvoicePaymentStatusFromBankMatches(
  userId: string,
  invoiceIds: string[],
) {
  return updateLocalCoreData(async (data) => {
    const beforeSnapshots = new Map<string, ReturnType<typeof buildInvoiceAuditSnapshot>>();

    for (const invoiceId of invoiceIds) {
      const invoice = data.invoices.find(
        (candidate) => candidate.user_id === userId && candidate.id === invoiceId,
      );

      if (invoice) {
        beforeSnapshots.set(invoice.id, buildInvoiceAuditSnapshot(invoice));
      }
    }

    const synced = syncLocalInvoicePaymentStatusInData(data, userId, invoiceIds);

    synced.forEach((invoice) => {
      const beforeSnapshot = beforeSnapshots.get(invoice.id);
      const afterSnapshot = buildInvoiceAuditSnapshot(invoice);

      if (JSON.stringify(beforeSnapshot) === JSON.stringify(afterSnapshot)) {
        return;
      }

      createLocalAuditEvent(data, {
        userId,
        actorType: "system",
        actorId: "banking-sync",
        source: "collections",
        action: "invoice_payment_synced_from_banking",
        entityType: "invoice",
        entityId: invoice.id,
        beforeJson: beforeSnapshot ?? null,
        afterJson: afterSnapshot,
      });
    });

    return synced;
  });
}

function syncLocalInvoicePaymentStatusInData(
  data: LocalCoreData,
  userId: string,
  invoiceIds: string[],
) {
  return syncLocalInvoicePaymentStatusWithMovements(
    data.invoices,
    data.bankMovements,
    userId,
    invoiceIds,
  );
}

function syncLocalInvoicePaymentStatusWithMovements(
  invoices: InvoiceRecord[],
  bankMovements: BankMovementRecord[],
  userId: string,
  invoiceIds: string[],
) {
  const uniqueInvoiceIds = Array.from(
    new Set(invoiceIds.map((invoiceId) => invoiceId.trim()).filter(Boolean)),
  );

  if (uniqueInvoiceIds.length === 0) {
    return [];
  }

  const synced: InvoiceRecord[] = [];

  for (const invoiceId of uniqueInvoiceIds) {
    const invoice = invoices.find(
      (candidate) => candidate.user_id === userId && candidate.id === invoiceId,
    );

    if (!invoice) {
      continue;
    }

    const matchedMovements = bankMovements.filter(
      (movement) =>
        movement.user_id === userId &&
        movement.status === "reconciled" &&
        movement.direction === "credit" &&
        movement.matched_invoice_id === invoiceId,
    );

    const amountPaid = roundCurrency(
      matchedMovements.reduce((sum, movement) => sum + Math.abs(toNumber(movement.amount)), 0),
    );
    const latestBookingDate =
      matchedMovements
        .map((movement) => movement.booking_date)
        .filter(Boolean)
        .sort()
        .at(-1) ?? null;

    invoice.amount_paid = amountPaid;
    invoice.payment_status = resolveLocalSyncedPaymentStatus(
      amountPaid,
      roundCurrency(toNumber(invoice.grand_total)),
    );
    invoice.paid_at = invoice.payment_status === "paid" ? toPaidAtIso(latestBookingDate) : null;
    invoice.updated_at = nowIso();
    synced.push(invoice);
  }

  return synced;
}

export async function updateLocalInvoicePaymentStates(
  userId: string,
  invoiceIds: string[],
  actionKind: "mark_paid" | "reopen",
) {
  if (canUseStructuredLocalRepositories()) {
    const uniqueInvoiceIds = Array.from(
      new Set(invoiceIds.map((invoiceId) => invoiceId.trim()).filter(Boolean)),
    );

    if (uniqueInvoiceIds.length === 0) {
      return [];
    }

    const allInvoices = await listStructuredInvoiceRepositoryRecords(userId);
    if (allInvoices) {
      const beforeSnapshots = new Map<string, ReturnType<typeof buildInvoiceAuditSnapshot>>();
      const targetInvoices = allInvoices.filter((invoice) =>
        uniqueInvoiceIds.includes(invoice.id),
      );

      if (targetInvoices.length > 0) {
        targetInvoices.forEach((invoice) => {
          beforeSnapshots.set(invoice.id, buildInvoiceAuditSnapshot(invoice));
          invoice.updated_at = nowIso();

          if (actionKind === "mark_paid") {
            invoice.payment_status = "paid";
            invoice.amount_paid = roundCurrency(toNumber(invoice.grand_total));
            invoice.paid_at = invoice.updated_at;
          } else {
            invoice.payment_status = "pending";
            invoice.amount_paid = 0;
            invoice.paid_at = null;
          }
        });

        let resolvedUpdated = targetInvoices;

        if (actionKind === "reopen") {
          const bankMovements = await listLocalBankMovementsForUser(userId);
          resolvedUpdated = syncLocalInvoicePaymentStatusWithMovements(
            targetInvoices,
            bankMovements,
            userId,
            targetInvoices.map((invoice) => invoice.id),
          );
        }

        const auditEvents = resolvedUpdated.map((invoice) =>
          buildLocalAuditEventRecord({
            userId,
            actorType: "user",
            actorId: userId,
            source: "collections",
            action:
              actionKind === "mark_paid"
                ? "invoice_payment_marked_paid"
                : "invoice_payment_reopened",
            entityType: "invoice",
            entityId: invoice.id,
            beforeJson: beforeSnapshots.get(invoice.id) ?? null,
            afterJson: buildInvoiceAuditSnapshot(invoice),
          }),
        );
        const saved = await persistStructuredInvoiceRepositoryState({
          invoices: resolvedUpdated,
          auditEvents,
        });

        if (saved) {
          return resolvedUpdated;
        }
      }
    }
  }

  return updateLocalCoreData(async (data) => {
    const uniqueInvoiceIds = Array.from(
      new Set(invoiceIds.map((invoiceId) => invoiceId.trim()).filter(Boolean)),
    );

    if (uniqueInvoiceIds.length === 0) {
      return [];
    }

    const updated: InvoiceRecord[] = [];
    const beforeSnapshots = new Map<string, ReturnType<typeof buildInvoiceAuditSnapshot>>();

    for (const invoiceId of uniqueInvoiceIds) {
      const invoice = data.invoices.find(
        (candidate) => candidate.user_id === userId && candidate.id === invoiceId,
      );

      if (!invoice) {
        continue;
      }

      beforeSnapshots.set(invoice.id, buildInvoiceAuditSnapshot(invoice));
      invoice.updated_at = nowIso();

      if (actionKind === "mark_paid") {
        invoice.payment_status = "paid";
        invoice.amount_paid = roundCurrency(toNumber(invoice.grand_total));
        invoice.paid_at = invoice.updated_at;
      } else {
        invoice.payment_status = "pending";
        invoice.amount_paid = 0;
        invoice.paid_at = null;
      }

      updated.push(invoice);
    }

    if (actionKind === "reopen" && updated.length > 0) {
      const reopened = syncLocalInvoicePaymentStatusInData(
        data,
        userId,
        updated.map((invoice) => invoice.id),
      );
      reopened.forEach((invoice) => {
        createLocalAuditEvent(data, {
          userId,
          actorType: "user",
          actorId: userId,
          source: "collections",
          action: "invoice_payment_reopened",
          entityType: "invoice",
          entityId: invoice.id,
          beforeJson: beforeSnapshots.get(invoice.id) ?? null,
          afterJson: buildInvoiceAuditSnapshot(invoice),
        });
      });
      return reopened;
    }

    updated.forEach((invoice) => {
      createLocalAuditEvent(data, {
        userId,
        actorType: "user",
        actorId: userId,
        source: "collections",
        action: "invoice_payment_marked_paid",
        entityType: "invoice",
        entityId: invoice.id,
        beforeJson: beforeSnapshots.get(invoice.id) ?? null,
        afterJson: buildInvoiceAuditSnapshot(invoice),
      });
    });

    return updated;
  }, {
    structuredSections: ["invoices", "auditEvents"],
  });
}

export async function listLocalMessageConnectionsForUser(userId: string) {
  const data = await readLocalCoreData();
  return sortByUpdatedAtDescending(
    data.messageConnections.filter((connection) => connection.user_id === userId),
  );
}

export async function ensureLocalMessageConnection({
  userId,
  channel,
  label,
  inboundKey,
  verifyToken,
  status = "draft",
  metadata = {},
}: {
  userId: string;
  channel: MessageChannel;
  label: string;
  inboundKey: string;
  verifyToken: string;
  status?: MessageConnectionStatus;
  metadata?: Record<string, unknown>;
}) {
  return updateLocalCoreData(async (data) => {
    const timestamp = nowIso();
    const existing = data.messageConnections.find(
      (candidate) => candidate.user_id === userId && candidate.channel === channel,
    );

    if (existing) {
      const beforeConnection = buildMessageConnectionAuditSnapshot(existing);
      existing.label = label;
      existing.inbound_key = inboundKey;
      existing.verify_token = verifyToken;
      existing.status = status;
      existing.metadata = {
        ...existing.metadata,
        ...metadata,
      };
      existing.updated_at = timestamp;

      const afterConnection = buildMessageConnectionAuditSnapshot(existing);
      if (JSON.stringify(beforeConnection) !== JSON.stringify(afterConnection)) {
        createLocalAuditEvent(data, {
          userId,
          actorType: "user",
          actorId: userId,
          source: "messaging",
          action: "message_connection_updated",
          entityType: "message_connection",
          entityId: existing.id,
          beforeJson: beforeConnection,
          afterJson: afterConnection,
        });
      }
      return existing;
    }

    const connection: MessageConnection = {
      id: randomUUID(),
      user_id: userId,
      channel,
      label,
      status,
      inbound_key: inboundKey,
      verify_token: verifyToken,
      metadata,
      created_at: timestamp,
      updated_at: timestamp,
    };

    data.messageConnections.push(connection);
    createLocalAuditEvent(data, {
      userId,
      actorType: "user",
      actorId: userId,
      source: "messaging",
      action: "message_connection_created",
      entityType: "message_connection",
      entityId: connection.id,
      afterJson: buildMessageConnectionAuditSnapshot(connection),
    });
    return connection;
  });
}

export async function getLocalMessageConnectionByInboundKey(
  inboundKey: string,
  channel: MessageChannel,
) {
  const data = await readLocalCoreData();
  return (
    data.messageConnections.find(
      (connection) =>
        connection.channel === channel && connection.inbound_key === inboundKey,
    ) ?? null
  );
}

export async function listLocalMessageThreadsForUser(userId: string) {
  const data = await readLocalCoreData();
  return sortByPrimaryDateDescending(
    data.messageThreads.filter((thread) => thread.user_id === userId),
    (thread) => thread.last_message_at,
  );
}

export async function getLocalMessageThreadById(userId: string, threadId: string) {
  const threads = await listLocalMessageThreadsForUser(userId);
  return threads.find((thread) => thread.id === threadId) ?? null;
}

export async function listLocalMessageRecordsForThread(userId: string, threadId: string) {
  const data = await readLocalCoreData();
  return data.messageRecords
    .filter((record) => record.user_id === userId && record.thread_id === threadId)
    .sort((left, right) => left.received_at.localeCompare(right.received_at));
}

export async function upsertLocalInboundMessage({
  connection,
  parsedMessage,
  urgency,
  urgencyScore,
}: {
  connection: MessageConnection;
  parsedMessage: {
    channel: MessageChannel;
    externalChatId: string;
    externalContactId: string | null;
    externalMessageId: string | null;
    firstName: string | null;
    lastName: string | null;
    fullName: string;
    phone: string | null;
    telegramUsername: string | null;
    body: string;
    messageType: string;
    senderName: string | null;
    receivedAt: string;
    rawPayload: Record<string, unknown>;
  };
  urgency: MessageUrgency;
  urgencyScore: number;
}) {
  return updateLocalCoreData(async (data) => {
    const preview = parsedMessage.body.slice(0, 180);
    let createdThread = false;
    let thread = data.messageThreads.find(
      (candidate) =>
        candidate.user_id === connection.user_id &&
        candidate.channel === parsedMessage.channel &&
        candidate.external_chat_id === parsedMessage.externalChatId,
    );

    if (!thread) {
      thread = {
        id: randomUUID(),
        user_id: connection.user_id,
        connection_id: connection.id,
        channel: parsedMessage.channel,
        external_chat_id: parsedMessage.externalChatId,
        external_contact_id: parsedMessage.externalContactId,
        first_name: parsedMessage.firstName,
        last_name: parsedMessage.lastName,
        full_name: parsedMessage.fullName,
        phone: parsedMessage.phone,
        telegram_username: parsedMessage.telegramUsername,
        urgency,
        urgency_score: urgencyScore,
        urgency_locked: false,
        unread_count: 1,
        last_message_preview: preview,
        last_message_direction: "inbound",
        last_message_at: parsedMessage.receivedAt,
        metadata: {},
        created_at: parsedMessage.receivedAt,
        updated_at: parsedMessage.receivedAt,
      };
      data.messageThreads.push(thread);
      createdThread = true;
    } else {
      thread.connection_id = connection.id;
      thread.external_contact_id =
        parsedMessage.externalContactId ?? thread.external_contact_id;
      thread.first_name = parsedMessage.firstName ?? thread.first_name;
      thread.last_name = parsedMessage.lastName ?? thread.last_name;
      thread.full_name = parsedMessage.fullName || thread.full_name;
      thread.phone = parsedMessage.phone ?? thread.phone;
      thread.telegram_username = parsedMessage.telegramUsername ?? thread.telegram_username;
      if (!thread.urgency_locked) {
        thread.urgency = urgency;
        thread.urgency_score = Math.max(thread.urgency_score, urgencyScore);
      }
      thread.unread_count += 1;
      thread.last_message_preview = preview;
      thread.last_message_direction = "inbound";
      thread.last_message_at = parsedMessage.receivedAt;
      thread.updated_at = parsedMessage.receivedAt;
    }

    if (parsedMessage.externalMessageId) {
      const existingMessage = data.messageRecords.find(
        (candidate) =>
          candidate.user_id === connection.user_id &&
          candidate.channel === parsedMessage.channel &&
          candidate.external_message_id === parsedMessage.externalMessageId,
      );

      if (existingMessage) {
        return thread;
      }
    }

    const messageRecord: MessageRecord = {
      id: randomUUID(),
      user_id: connection.user_id,
      thread_id: thread.id,
      channel: parsedMessage.channel,
      external_message_id: parsedMessage.externalMessageId,
      direction: "inbound",
      sender_name: parsedMessage.senderName,
      body: parsedMessage.body,
      message_type: parsedMessage.messageType,
      received_at: parsedMessage.receivedAt,
      raw_payload: parsedMessage.rawPayload,
      created_at: parsedMessage.receivedAt,
    };

    data.messageRecords.push(messageRecord);

    connection.status = "active";
    connection.updated_at = nowIso();

    if (createdThread) {
      createLocalAuditEvent(data, {
        userId: connection.user_id,
        actorType: "system",
        actorId: connection.channel,
        source: "messaging",
        action: "message_thread_created",
        entityType: "message_thread",
        entityId: thread.id,
        afterJson: buildMessageThreadAuditSnapshot(thread),
        contextJson: {
          connectionId: connection.id,
        },
      });
    }

    createLocalAuditEvent(data, {
      userId: connection.user_id,
      actorType: "system",
      actorId: connection.channel,
      source: "messaging",
      action: "message_inbound_received",
      entityType: "message_record",
      entityId: messageRecord.id,
      afterJson: {
        channel: messageRecord.channel,
        threadId: messageRecord.thread_id,
        senderName: messageRecord.sender_name,
        messageType: messageRecord.message_type,
        receivedAt: messageRecord.received_at,
      },
      contextJson: {
        connectionId: connection.id,
        externalMessageId: messageRecord.external_message_id,
        threadUrgency: thread.urgency,
      },
    });

    return thread;
  });
}

export async function markLocalMessageThreadRead(userId: string, threadId: string) {
  return updateLocalCoreData(async (data) => {
    const thread = data.messageThreads.find(
      (candidate) => candidate.user_id === userId && candidate.id === threadId,
    );

    if (!thread) {
      return null;
    }

    const beforeThread = buildMessageThreadAuditSnapshot(thread);
    thread.unread_count = 0;
    thread.updated_at = nowIso();
    createLocalAuditEvent(data, {
      userId,
      actorType: "user",
      actorId: userId,
      source: "messaging",
      action: "message_thread_marked_read",
      entityType: "message_thread",
      entityId: thread.id,
      beforeJson: beforeThread,
      afterJson: buildMessageThreadAuditSnapshot(thread),
    });
    return thread;
  });
}

export async function setLocalMessageThreadUrgency(
  userId: string,
  threadId: string,
  urgency: MessageUrgency,
  urgencyScore: number,
) {
  return updateLocalCoreData(async (data) => {
    const thread = data.messageThreads.find(
      (candidate) => candidate.user_id === userId && candidate.id === threadId,
    );

    if (!thread) {
      return null;
    }

    const beforeThread = buildMessageThreadAuditSnapshot(thread);
    thread.urgency = urgency;
    thread.urgency_score = urgencyScore;
    thread.urgency_locked = true;
    thread.updated_at = nowIso();
    createLocalAuditEvent(data, {
      userId,
      actorType: "user",
      actorId: userId,
      source: "messaging",
      action: "message_thread_urgency_set",
      entityType: "message_thread",
      entityId: thread.id,
      beforeJson: beforeThread,
      afterJson: buildMessageThreadAuditSnapshot(thread),
    });
    return thread;
  });
}

export async function unlockLocalMessageThreadUrgency(userId: string, threadId: string) {
  return updateLocalCoreData(async (data) => {
    const thread = data.messageThreads.find(
      (candidate) => candidate.user_id === userId && candidate.id === threadId,
    );

    if (!thread) {
      return null;
    }

    const beforeThread = buildMessageThreadAuditSnapshot(thread);
    thread.urgency_locked = false;
    thread.updated_at = nowIso();
    createLocalAuditEvent(data, {
      userId,
      actorType: "user",
      actorId: userId,
      source: "messaging",
      action: "message_thread_urgency_unlocked",
      entityType: "message_thread",
      entityId: thread.id,
      beforeJson: beforeThread,
      afterJson: buildMessageThreadAuditSnapshot(thread),
    });
    return thread;
  });
}

export async function listLocalMailThreadsForUser(userId: string) {
  const data = await readLocalCoreData();
  return sortByPrimaryDateDescending(
    data.mailThreads.filter((thread) => thread.user_id === userId),
    (thread) => thread.last_message_at,
  );
}

export async function getLocalMailThreadById(userId: string, threadId: string) {
  const threads = await listLocalMailThreadsForUser(userId);
  return threads.find((thread) => thread.id === threadId) ?? null;
}

export async function listLocalMailMessagesForThread(userId: string, threadId: string) {
  const data = await readLocalCoreData();
  return data.mailMessages
    .filter((message) => message.user_id === userId && message.thread_id === threadId)
    .sort((left, right) => left.received_at.localeCompare(right.received_at));
}

export async function listLocalMailSyncRunsForUser(userId: string, limit = 5) {
  const data = await readLocalCoreData();
  return [...data.mailSyncRuns]
    .filter((run) => run.user_id === userId)
    .sort((left, right) => right.created_at.localeCompare(left.created_at))
    .slice(0, limit);
}

export async function logLocalMailSyncRun({
  userId,
  source,
  status,
  importedCount,
  detail,
}: {
  userId: string;
  source: MailSyncRun["source"];
  status: MailSyncRun["status"];
  importedCount: number;
  detail: string | null;
}) {
  return updateLocalCoreData(async (data) => {
    const timestamp = nowIso();
    const run: MailSyncRun = {
      id: randomUUID(),
      user_id: userId,
      source,
      status,
      imported_count: importedCount,
      detail,
      created_at: timestamp,
    };

    data.mailSyncRuns.push(run);
    return run;
  });
}

export async function upsertLocalMailEntries({
  userId,
  entries,
  source = "imap",
}: {
  userId: string;
  entries: Array<{
    messageId: string;
    fromName: string | null;
    fromEmail: string;
    toEmails: string[];
    subject: string | null;
    bodyText: string;
    bodyHtml: string | null;
    receivedAt: string;
    rawHeaders: Record<string, unknown>;
    urgency: MessageUrgency;
    urgencyScore: number;
  }>;
  source?: MailThread["source"];
}) {
  return updateLocalCoreData(async (data) => {
    let importedCount = 0;

    for (const entry of entries) {
      const existingMessage = data.mailMessages.find(
        (candidate) =>
          candidate.user_id === userId &&
          candidate.source === source &&
          candidate.external_message_id === entry.messageId,
      );

      if (existingMessage) {
        continue;
      }

      const preview = entry.bodyText.slice(0, 220);
      let thread = data.mailThreads.find(
        (candidate) =>
          candidate.user_id === userId &&
          candidate.source === source &&
          candidate.external_thread_key === entry.fromEmail,
      );

      if (!thread) {
        thread = {
          id: randomUUID(),
          user_id: userId,
          source,
          external_thread_key: entry.fromEmail,
          from_name: entry.fromName,
          from_email: entry.fromEmail,
          subject: entry.subject,
          urgency: entry.urgency,
          urgency_score: entry.urgencyScore,
          unread_count: 0,
          last_message_preview: preview,
          last_message_at: entry.receivedAt,
          metadata: {},
          created_at: entry.receivedAt,
          updated_at: entry.receivedAt,
        };
        data.mailThreads.push(thread);
      }

      data.mailMessages.push({
        id: randomUUID(),
        user_id: userId,
        thread_id: thread.id,
        source,
        external_message_id: entry.messageId,
        from_name: entry.fromName,
        from_email: entry.fromEmail,
        to_emails: entry.toEmails,
        subject: entry.subject,
        body_text: entry.bodyText,
        body_html: entry.bodyHtml,
        received_at: entry.receivedAt,
        raw_headers: entry.rawHeaders,
        created_at: entry.receivedAt,
      });

      const isNewest =
        new Date(entry.receivedAt).getTime() >= new Date(thread.last_message_at).getTime();
      thread.from_name = entry.fromName ?? thread.from_name;
      thread.subject = isNewest ? entry.subject : thread.subject;
      thread.urgency =
        entry.urgencyScore >= thread.urgency_score ? entry.urgency : thread.urgency;
      thread.urgency_score = Math.max(thread.urgency_score, entry.urgencyScore);
      thread.unread_count += 1;
      thread.last_message_preview = isNewest ? preview : thread.last_message_preview;
      thread.last_message_at = isNewest ? entry.receivedAt : thread.last_message_at;
      thread.updated_at = entry.receivedAt;
      importedCount += 1;
    }

    return importedCount;
  });
}

export async function markLocalMailThreadRead(userId: string, threadId: string) {
  return updateLocalCoreData(async (data) => {
    const thread = data.mailThreads.find(
      (candidate) => candidate.user_id === userId && candidate.id === threadId,
    );

    if (!thread) {
      return null;
    }

    thread.unread_count = 0;
    thread.updated_at = nowIso();
    return thread;
  });
}

export async function listLocalInvoiceRemindersForUser(userId: string) {
  const mirrored = await listStructuredInvoiceRepositoryReminders(userId);

  if (mirrored) {
    return mirrored;
  }

  const data = await readLocalCoreData();
  return data.invoiceReminders
    .filter((reminder) => reminder.user_id === userId)
    .sort((left, right) => right.sent_at.localeCompare(left.sent_at));
}

export async function recordLocalInvoiceReminder({
  userId,
  invoiceId,
  recipientEmail,
  subject,
  triggerMode,
  batchKey,
}: {
  userId: string;
  invoiceId: string;
  recipientEmail: string;
  subject: string;
  triggerMode: InvoiceReminderRecord["trigger_mode"];
  batchKey: string | null;
}) {
  if (canUseStructuredLocalRepositories()) {
    const invoice = await getStructuredInvoiceRepositoryRecord(userId, invoiceId);

    if (invoice) {
      const timestamp = nowIso();
      const updatedInvoice: InvoiceRecord = {
        ...invoice,
        last_reminder_at: timestamp,
        reminder_count: (invoice.reminder_count ?? 0) + 1,
        updated_at: timestamp,
      };
      const reminder: InvoiceReminderRecord = {
        id: randomUUID(),
        user_id: userId,
        invoice_id: invoiceId,
        delivery_channel: "email",
        trigger_mode: triggerMode,
        batch_key: batchKey,
        recipient_email: recipientEmail,
        subject,
        status: "sent",
        error_message: null,
        sent_at: timestamp,
        created_at: timestamp,
      };
      const saved = await persistStructuredInvoiceRepositoryState({
        invoices: [updatedInvoice],
        invoiceReminders: [reminder],
      });

      if (saved) {
        return reminder;
      }
    }
  }

  return updateLocalCoreData(async (data) => {
    const invoice = data.invoices.find(
      (candidate) => candidate.user_id === userId && candidate.id === invoiceId,
    );

    if (!invoice) {
      return null;
    }

    const timestamp = nowIso();
    invoice.last_reminder_at = timestamp;
    invoice.reminder_count = (invoice.reminder_count ?? 0) + 1;
    invoice.updated_at = timestamp;

    const reminder: InvoiceReminderRecord = {
      id: randomUUID(),
      user_id: userId,
      invoice_id: invoiceId,
      delivery_channel: "email",
      trigger_mode: triggerMode,
      batch_key: batchKey,
      recipient_email: recipientEmail,
      subject,
      status: "sent",
      error_message: null,
      sent_at: timestamp,
      created_at: timestamp,
    };

    data.invoiceReminders.push(reminder);
    return reminder;
  }, {
    structuredSections: ["invoices", "invoiceReminders"],
  });
}

export async function getLocalMonthlyInvoiceUsage(userId: string, monthStartIso: string) {
  const mirrored = await getStructuredLocalMonthlyInvoiceUsage(userId, monthStartIso);

  if (mirrored !== null) {
    return mirrored;
  }

  const invoices = await listLocalInvoicesForUser(userId);
  return invoices.filter((invoice) => invoice.issue_date >= monthStartIso).length;
}

export async function getLocalDailyAiUsage(userId: string, usageDate: string) {
  const mirrored = await getStructuredLocalDailyAiUsage(userId, usageDate);

  if (mirrored !== null) {
    return mirrored;
  }

  const data = await readLocalCoreData();
  return data.aiUsage.find(
    (entry) => entry.user_id === userId && entry.date === usageDate,
  )?.calls_count ?? 0;
}

export async function incrementLocalDailyAiUsage(userId: string, usageDate: string, limit: number | null) {
  return updateLocalCoreData(async (data) => {
    let entry = data.aiUsage.find(
      (candidate) => candidate.user_id === userId && candidate.date === usageDate,
    );

    if (!entry) {
      entry = {
        user_id: userId,
        date: usageDate,
        calls_count: 0,
      };
      data.aiUsage.push(entry);
    }

    if (limit !== null && entry.calls_count >= limit) {
      return null;
    }

    entry.calls_count += 1;
    return entry.calls_count;
  });
}

export async function replaceLocalUserData({
  userId,
  email,
  profile,
  clients,
  feedbackEntries,
  auditEvents,
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
}: {
  userId: string;
  email: string;
  profile: Profile | null;
  clients: ClientRecord[];
  feedbackEntries: FeedbackEntryRecord[];
  auditEvents: LocalAuditEventRecord[];
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
  aiUsage: LocalAiUsage[];
}) {
  return runLocalCoreMutation(async () => {
    const data = await readLocalCoreData();
    const timestamp = nowIso();
    const existingUser = data.users.find((candidate) => candidate.id === userId);

    if (existingUser) {
      existingUser.email = email;
      existingUser.updated_at = timestamp;
    } else {
      data.users.push({
        id: userId,
        email,
        password_hash: hashPassword(randomUUID()),
        created_at: timestamp,
        updated_at: timestamp,
      });
    }

    data.profiles = data.profiles.filter((candidate) => candidate.id !== userId);
    if (profile) {
      data.profiles.push({
        ...profile,
        id: userId,
        email,
      });
    }

    data.clients = [
      ...data.clients.filter((candidate) => candidate.user_id !== userId),
      ...clients.map((client) => ({
        ...client,
        user_id: userId,
      })),
    ];

    data.feedbackEntries = [
      ...data.feedbackEntries.filter((candidate) => candidate.user_id !== userId),
      ...feedbackEntries.map((entry) => ({
        ...entry,
        user_id: userId,
      })),
    ];

    data.auditEvents = [
      ...data.auditEvents.filter((candidate) => candidate.user_id !== userId),
      ...auditEvents.map((event) => ({
        ...event,
        user_id: userId,
      })),
    ];

    data.invoices = [
      ...data.invoices.filter((candidate) => candidate.user_id !== userId),
      ...invoices.map((invoice) => ({
        ...invoice,
        user_id: userId,
      })),
    ];

    data.invoiceReminders = [
      ...data.invoiceReminders.filter((candidate) => candidate.user_id !== userId),
      ...invoiceReminders.map((reminder) => ({
        ...reminder,
        user_id: userId,
      })),
    ];

    data.bankMovements = [
      ...data.bankMovements.filter((candidate) => candidate.user_id !== userId),
      ...bankMovements.map((movement) => ({
        ...movement,
        user_id: userId,
      })),
    ];

    data.messageConnections = [
      ...data.messageConnections.filter((candidate) => candidate.user_id !== userId),
      ...messageConnections.map((connection) => ({
        ...connection,
        user_id: userId,
      })),
    ];

    data.messageThreads = [
      ...data.messageThreads.filter((candidate) => candidate.user_id !== userId),
      ...messageThreads.map((thread) => ({
        ...thread,
        user_id: userId,
      })),
    ];

    data.messageRecords = [
      ...data.messageRecords.filter((candidate) => candidate.user_id !== userId),
      ...messageRecords.map((record) => ({
        ...record,
        user_id: userId,
      })),
    ];

    data.mailThreads = [
      ...data.mailThreads.filter((candidate) => candidate.user_id !== userId),
      ...mailThreads.map((thread) => ({
        ...thread,
        user_id: userId,
      })),
    ];

    data.mailMessages = [
      ...data.mailMessages.filter((candidate) => candidate.user_id !== userId),
      ...mailMessages.map((message) => ({
        ...message,
        user_id: userId,
      })),
    ];

    data.mailSyncRuns = [
      ...data.mailSyncRuns.filter((candidate) => candidate.user_id !== userId),
      ...mailSyncRuns.map((run) => ({
        ...run,
        user_id: userId,
      })),
    ];

    data.commercialDocuments = [
      ...data.commercialDocuments.filter((candidate) => candidate.user_id !== userId),
      ...commercialDocuments.map((document) => ({
        ...document,
        user_id: userId,
      })),
    ];

    data.documentSignatureRequests = [
      ...data.documentSignatureRequests.filter((candidate) => candidate.user_id !== userId),
      ...documentSignatureRequests.map((request) => ({
        ...request,
        user_id: userId,
      })),
    ];

    data.expenses = [
      ...data.expenses.filter((candidate) => candidate.user_id !== userId),
      ...expenses.map((expense) => ({
        ...expense,
        user_id: userId,
      })),
    ];

    data.aiUsage = [
      ...data.aiUsage.filter((candidate) => candidate.user_id !== userId),
      ...aiUsage.map((entry) => ({
        ...entry,
        user_id: userId,
      })),
    ];

    data.counters.invoice_number = data.invoices.reduce(
      (max, invoice) => Math.max(max, invoice.invoice_number),
      0,
    );
    data.counters.quote_number = data.commercialDocuments
      .filter((document) => document.document_type === "quote")
      .reduce((max, document) => Math.max(max, document.document_number), 0);
    data.counters.delivery_note_number = data.commercialDocuments
      .filter((document) => document.document_type === "delivery_note")
      .reduce((max, document) => Math.max(max, document.document_number), 0);
    const structuredPrimaryPersisted =
      canUseStructuredLocalRepositories() &&
      (await replaceStructuredLocalIdentityForUser({
        user:
          data.users.find((candidate) => candidate.id === userId) ??
          data.users[data.users.length - 1]!,
        profile:
          data.profiles.find((candidate) => candidate.id === userId) ?? null,
        authRateLimits: data.authRateLimits.filter(
          (candidate) => candidate.email_key === getNormalizedEmail(email),
        ),
      })) &&
      (await replaceStructuredClientRepositoryRecords(userId, data.clients.filter((candidate) => candidate.user_id === userId))) &&
      (await replaceStructuredFeedbackRepositoryRecords(
        userId,
        data.feedbackEntries.filter((candidate) => candidate.user_id === userId),
      )) &&
      (await replaceStructuredAuditRepositoryRecords(
        userId,
        data.auditEvents.filter((candidate) => candidate.user_id === userId),
      )) &&
      (await replaceStructuredInvoiceRepositoryStateForUser({
        userId,
        invoices: data.invoices.filter((candidate) => candidate.user_id === userId),
        invoiceReminders: data.invoiceReminders.filter((candidate) => candidate.user_id === userId),
        counters: data.counters,
      }));

    await writeLocalCoreData(data, {
      skipStructuredMirrorSync: structuredPrimaryPersisted,
    });
  });
}

export async function fileToDataUrl(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${buffer.toString("base64")}`;
}
