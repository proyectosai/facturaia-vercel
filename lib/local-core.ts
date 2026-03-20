import "server-only";

import path from "node:path";
import { createHash, createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { promises as fs } from "node:fs";

import type {
  AppUserRecord,
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
  InvoiceLineItemStored,
  InvoiceRecord,
  InvoiceReminderRecord,
  InvoiceTotals,
  ExpenseRecord,
  Profile,
} from "@/lib/types";
import { roundCurrency, toNumber } from "@/lib/utils";

type LocalCoreAuthUser = AppUserRecord & {
  password_hash: string;
};

type LocalAiUsage = {
  user_id: string;
  date: string;
  calls_count: number;
};

type LocalCoreData = {
  version: 1;
  users: LocalCoreAuthUser[];
  profiles: Profile[];
  clients: ClientRecord[];
  invoices: InvoiceRecord[];
  invoiceReminders: InvoiceReminderRecord[];
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
    invoices: [],
    invoiceReminders: [],
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
  return process.env.FACTURAIA_DATA_DIR?.trim() || path.join(process.cwd(), ".facturaia-local");
}

function getLocalDataFilePath() {
  return path.join(getLocalDataDir(), "core.json");
}

async function ensureLocalDataDir() {
  await fs.mkdir(getLocalDataDir(), { recursive: true });
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
  const filePath = getLocalDataFilePath();

  try {
    const raw = await fs.readFile(filePath, "utf8");
    return tryParseLocalCoreData(raw);
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
      return getDefaultLocalData();
    }

    throw error;
  }
}

async function writeLocalCoreData(data: LocalCoreData) {
  await ensureLocalDataDir();
  const filePath = getLocalDataFilePath();
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.${randomUUID()}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tempPath, filePath);
}

async function runLocalCoreMutation<T>(task: () => Promise<T>) {
  const pending = localCoreMutationQueue.then(task, task);
  localCoreMutationQueue = pending.then(() => undefined, () => undefined);
  return pending;
}

async function updateLocalCoreData<T>(updater: (data: LocalCoreData) => T | Promise<T>) {
  return runLocalCoreMutation(async () => {
    const data = await readLocalCoreData();
    const result = await updater(data);
    await writeLocalCoreData(data);
    return result;
  });
}

function nowIso() {
  return new Date().toISOString();
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

function getLocalSessionSecret() {
  return process.env.FACTURAIA_LOCAL_SESSION_SECRET?.trim() ||
    createHash("sha256")
      .update(`${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}:${getLocalDataDir()}`)
      .digest("hex");
}

export function getLocalSessionCookieName() {
  return LOCAL_SESSION_COOKIE;
}

export function signLocalSessionToken(userId: string) {
  const payload = `${userId}.${Date.now()}`;
  const signature = createHmac("sha256", getLocalSessionSecret())
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
  const payload = `${userId}.${issuedAt}`;
  const expected = createHmac("sha256", getLocalSessionSecret())
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
    const user: LocalCoreAuthUser = {
      id: randomUUID(),
      email,
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

    return user;
  });
}

export async function authenticateLocalUser(email: string, password: string) {
  const data = await readLocalCoreData();
  const user = data.users.find(
    (candidate) => candidate.email.trim().toLowerCase() === email.trim().toLowerCase(),
  );

  if (!user) {
    return null;
  }

  if (!verifyPassword(password, user.password_hash)) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    created_at: user.created_at,
    updated_at: user.updated_at,
  } satisfies AppUserRecord;
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
  return updateLocalCoreData(async (data) => {
    const timestamp = nowIso();
    const existing = data.profiles.find((candidate) => candidate.id === userId);

    if (existing) {
      existing.email = email;
      existing.full_name = fullName;
      existing.nif = nif;
      existing.address = address;
      existing.logo_url = logoUrl;
      existing.logo_path = null;
      existing.updated_at = timestamp;
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
  const data = await readLocalCoreData();
  return sortByUpdatedAtDescending(
    data.clients.filter((client) => client.user_id === userId),
  );
}

export async function getLocalClientById(userId: string, clientId: string) {
  const clients = await listLocalClientsForUser(userId);
  return clients.find((client) => client.id === clientId) ?? null;
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
  return updateLocalCoreData(async (data) => {
    const timestamp = nowIso();
    const existing = clientId
      ? data.clients.find(
          (candidate) => candidate.user_id === userId && candidate.id === clientId,
        )
      : null;

    if (existing) {
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
    return client;
  });
}

export async function listLocalInvoicesForUser(userId: string) {
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
  const invoices = await listLocalInvoicesForUser(userId);
  return invoices.find((invoice) => invoice.id === invoiceId) ?? null;
}

export async function getLocalInvoiceByPublicId(publicId: string) {
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
    return invoice;
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
    const documentNumber = data.counters[counterKey] + 1;
    data.counters[counterKey] = documentNumber;

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

    expense.review_status = expense.review_status === "draft" ? "reviewed" : "draft";
    expense.updated_at = nowIso();
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

    data.documentSignatureRequests.forEach((request) => {
      if (
        request.user_id === userId &&
        request.document_id === documentId &&
        request.status === "pending"
      ) {
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
    request.status = "revoked";
    request.responded_at = timestamp;
    request.updated_at = timestamp;
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

    return request;
  });
}

export async function updateLocalInvoicePaymentState(
  userId: string,
  invoiceId: string,
  actionKind: "mark_paid" | "reopen",
) {
  return updateLocalCoreData(async (data) => {
    const invoice = data.invoices.find(
      (candidate) => candidate.user_id === userId && candidate.id === invoiceId,
    );

    if (!invoice) {
      return null;
    }

    invoice.updated_at = nowIso();

    if (actionKind === "mark_paid") {
      invoice.payment_status = "paid";
      invoice.amount_paid = roundCurrency(toNumber(invoice.grand_total));
      invoice.paid_at = invoice.updated_at;
      return invoice;
    }

    invoice.payment_status = "pending";
    invoice.amount_paid = 0;
    invoice.paid_at = null;
    return invoice;
  });
}

export async function listLocalInvoiceRemindersForUser(userId: string) {
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
  });
}

export async function getLocalMonthlyInvoiceUsage(userId: string, monthStartIso: string) {
  const invoices = await listLocalInvoicesForUser(userId);
  return invoices.filter((invoice) => invoice.issue_date >= monthStartIso).length;
}

export async function getLocalDailyAiUsage(userId: string, usageDate: string) {
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
  invoices,
  invoiceReminders,
  commercialDocuments,
  documentSignatureRequests,
  expenses,
  aiUsage,
}: {
  userId: string;
  email: string;
  profile: Profile | null;
  clients: ClientRecord[];
  invoices: InvoiceRecord[];
  invoiceReminders: InvoiceReminderRecord[];
  commercialDocuments: CommercialDocumentRecord[];
  documentSignatureRequests: DocumentSignatureRequestRecord[];
  expenses: ExpenseRecord[];
  aiUsage: LocalAiUsage[];
}) {
  return updateLocalCoreData(async (data) => {
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
  });
}

export async function fileToDataUrl(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${buffer.toString("base64")}`;
}
