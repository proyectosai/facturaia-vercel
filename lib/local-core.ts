import "server-only";

import path from "node:path";
import { createHash, createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { promises as fs } from "node:fs";

import type {
  AppUserRecord,
  InvoiceLineItemStored,
  InvoiceRecord,
  InvoiceReminderRecord,
  InvoiceTotals,
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
  invoices: InvoiceRecord[];
  invoiceReminders: InvoiceReminderRecord[];
  aiUsage: LocalAiUsage[];
  counters: {
    invoice_number: number;
  };
};

const LOCAL_SESSION_COOKIE = "facturaia-local-session";

function getDefaultLocalData(): LocalCoreData {
  return {
    version: 1,
    users: [],
    profiles: [],
    invoices: [],
    invoiceReminders: [],
    aiUsage: [],
    counters: {
      invoice_number: 0,
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

async function readLocalCoreData(): Promise<LocalCoreData> {
  const filePath = getLocalDataFilePath();

  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as LocalCoreData;
    return {
      ...getDefaultLocalData(),
      ...parsed,
      counters: {
        ...getDefaultLocalData().counters,
        ...(parsed.counters ?? {}),
      },
    };
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
  const tempPath = `${filePath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tempPath, filePath);
}

async function updateLocalCoreData<T>(updater: (data: LocalCoreData) => T | Promise<T>) {
  const data = await readLocalCoreData();
  const result = await updater(data);
  await writeLocalCoreData(data);
  return result;
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
  return updateLocalCoreData(async (data) => {
    let profile = data.profiles.find((candidate) => candidate.id === userId);

    if (!profile) {
      const timestamp = nowIso();
      profile = {
        id: userId,
        email: email ?? "",
        full_name: null,
        nif: null,
        address: null,
        logo_path: null,
        logo_url: null,
        created_at: timestamp,
        updated_at: timestamp,
      };
      data.profiles.push(profile);
    }

    return profile;
  });
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

export async function fileToDataUrl(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${buffer.toString("base64")}`;
}
