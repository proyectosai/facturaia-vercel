import "server-only";

import { cache } from "react";

import {
  demoClients,
  demoCommercialDocuments,
  demoExpenses,
  demoInvoices,
  demoMailThreads,
  demoMessageThreads,
  isDemoMode,
  isLocalFileMode,
} from "@/lib/demo";
import {
  getInvoiceAmountOutstanding,
  getInvoiceCollectionState,
} from "@/lib/collections";
import {
  listLocalClientsForUser,
  listLocalCommercialDocumentsForUser,
  listLocalExpensesForUser,
  listLocalInvoicesForUser,
  listLocalMailThreadsForUser,
  listLocalMessageThreadsForUser,
} from "@/lib/local-core";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  ClientPriority,
  ClientRecord,
  ClientRelationKind,
  ClientStatus,
  CommercialDocumentRecord,
  ExpenseRecord,
  InvoiceRecord,
  MailThread,
  MessageThread,
} from "@/lib/types";
import { createSlug, formatInvoiceNumber, toNumber } from "@/lib/utils";

type ClientFilters = {
  query?: string;
  status?: "all" | ClientStatus;
  priority?: "all" | ClientPriority;
  relation?: "all" | ClientRelationKind;
};

type ClientCollections = {
  invoices: InvoiceRecord[];
  documents: CommercialDocumentRecord[];
  messages: MessageThread[];
  mailThreads: MailThread[];
  expenses: ExpenseRecord[];
};

export type ClientMetrics = {
  invoices: number;
  documents: number;
  messages: number;
  mails: number;
  expenses: number;
  totalBilled: number;
  outstandingAmount: number;
  overdueInvoices: number;
  pipelineAmount: number;
  lastActivityAt: string | null;
};

export type ClientListItem = ClientRecord & {
  metrics: ClientMetrics;
};

export type ClientActivityItem = {
  id: string;
  kind: "invoice" | "document" | "message" | "mail" | "expense";
  title: string;
  detail: string;
  at: string;
  href: string;
};

export type ClientActivitySnapshot = {
  invoices: InvoiceRecord[];
  documents: CommercialDocumentRecord[];
  messages: MessageThread[];
  mails: MailThread[];
  expenses: ExpenseRecord[];
  timeline: ClientActivityItem[];
  metrics: ClientMetrics;
};

export type DetectedClientSuggestion = {
  key: string;
  displayName: string;
  relationKind: ClientRelationKind;
  email: string | null;
  phone: string | null;
  nif: string | null;
  address: string | null;
  companyName: string | null;
  lastActivityAt: string | null;
  sourceLabels: string[];
  counts: Omit<
    ClientMetrics,
    "totalBilled" | "outstandingAmount" | "overdueInvoices" | "pipelineAmount" | "lastActivityAt"
  >;
};

export type ClientHubSummary = {
  savedClients: number;
  detectedSuggestions: number;
  activeClients: number;
  highPriorityClients: number;
};

export const clientStatusLabels: Record<ClientStatus, string> = {
  lead: "Lead",
  active: "Activo",
  paused: "Pausado",
  archived: "Archivado",
};

export const clientPriorityLabels: Record<ClientPriority, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
};

export const clientRelationLabels: Record<ClientRelationKind, string> = {
  client: "Cliente",
  supplier: "Proveedor",
  mixed: "Mixto",
};

function isMissingTable(error: { code?: string; message?: string } | null) {
  if (!error) {
    return false;
  }

  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    error.message?.includes("does not exist") === true
  );
}

function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function normalizePhone(value: string | null | undefined) {
  return value?.replace(/[^\d+]/g, "")?.replace(/^00/, "+") ?? "";
}

function normalizeNif(value: string | null | undefined) {
  return value?.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() ?? "";
}

function normalizeName(value: string | null | undefined) {
  return createSlug(value ?? "");
}

function namesLookRelated(left: string | null | undefined, right: string | null | undefined) {
  const normalizedLeft = normalizeName(left);
  const normalizedRight = normalizeName(right);

  if (!normalizedLeft || !normalizedRight) {
    return false;
  }

  return (
    normalizedLeft === normalizedRight ||
    normalizedLeft.includes(normalizedRight) ||
    normalizedRight.includes(normalizedLeft)
  );
}

function matchesContactIdentity(
  client: Pick<
    ClientRecord,
    | "display_name"
    | "company_name"
    | "first_name"
    | "last_name"
    | "email"
    | "phone"
    | "nif"
  >,
  candidate: {
    displayName?: string | null;
    companyName?: string | null;
    email?: string | null;
    phone?: string | null;
    nif?: string | null;
  },
) {
  const clientEmail = normalizeEmail(client.email);
  const clientPhone = normalizePhone(client.phone);
  const clientNif = normalizeNif(client.nif);
  const candidateEmail = normalizeEmail(candidate.email);
  const candidatePhone = normalizePhone(candidate.phone);
  const candidateNif = normalizeNif(candidate.nif);

  if (clientEmail && candidateEmail && clientEmail === candidateEmail) {
    return true;
  }

  if (clientPhone && candidatePhone && clientPhone === candidatePhone) {
    return true;
  }

  if (clientNif && candidateNif && clientNif === candidateNif) {
    return true;
  }

  const clientNames = [
    client.display_name,
    client.company_name,
    [client.first_name, client.last_name].filter(Boolean).join(" "),
  ];

  return clientNames.some(
    (name) =>
      namesLookRelated(name, candidate.displayName) ||
      namesLookRelated(name, candidate.companyName),
  );
}

function getMostRecentDate(dates: Array<string | null | undefined>) {
  const valid = dates.filter(Boolean) as string[];

  if (valid.length === 0) {
    return null;
  }

  return valid.sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0];
}

async function safeSelectArray<T>(
  query: PromiseLike<{ data: T[] | null; error: { code?: string; message?: string } | null }>,
  label: string,
) {
  const result = await query;

  if (result.error) {
    if (isMissingTable(result.error)) {
      return [];
    }

    throw new Error(`No se ha podido cargar ${label}.`);
  }

  return (result.data ?? []) as T[];
}

const getClientCollections = cache(async (userId: string): Promise<ClientCollections> => {
  if (isDemoMode()) {
    return {
      invoices: demoInvoices,
      documents: demoCommercialDocuments,
      messages: demoMessageThreads,
      mailThreads: demoMailThreads,
      expenses: demoExpenses,
    };
  }

  if (isLocalFileMode()) {
    return {
      invoices: await listLocalInvoicesForUser(userId),
      documents: await listLocalCommercialDocumentsForUser(userId),
      messages: await listLocalMessageThreadsForUser(userId),
      mailThreads: await listLocalMailThreadsForUser(userId),
      expenses: await listLocalExpensesForUser(userId),
    };
  }

  const supabase = await createServerSupabaseClient();

  const [invoices, documents, messages, mailThreads, expenses] = await Promise.all([
    safeSelectArray<InvoiceRecord>(
      supabase
        .from("invoices")
        .select("*")
        .eq("user_id", userId)
        .order("issue_date", { ascending: false }),
      "las facturas",
    ),
    safeSelectArray<CommercialDocumentRecord>(
      supabase
        .from("commercial_documents")
        .select("*")
        .eq("user_id", userId)
        .order("issue_date", { ascending: false }),
      "los documentos comerciales",
    ),
    safeSelectArray<MessageThread>(
      supabase
        .from("message_threads")
        .select("*")
        .eq("user_id", userId)
        .order("last_message_at", { ascending: false }),
      "los mensajes",
    ),
    safeSelectArray<MailThread>(
      supabase
        .from("mail_threads")
        .select("*")
        .eq("user_id", userId)
        .order("last_message_at", { ascending: false }),
      "los hilos de correo",
    ),
    safeSelectArray<ExpenseRecord>(
      supabase
        .from("expenses")
        .select("*")
        .eq("user_id", userId)
        .order("expense_date", { ascending: false }),
      "los gastos",
    ),
  ]);

  return {
    invoices,
    documents,
    messages,
    mailThreads,
    expenses,
  };
});

export async function getClientsForUser(
  userId: string,
  {
    query = "",
    status = "all",
    priority = "all",
    relation = "all",
  }: ClientFilters = {},
) {
  const clients = isDemoMode()
    ? demoClients
    : isLocalFileMode()
      ? await listLocalClientsForUser(userId)
      : await (async () => {
        const supabase = await createServerSupabaseClient();
        const result = await supabase
          .from("clients")
          .select("*")
          .eq("user_id", userId)
          .order("updated_at", { ascending: false });

        if (result.error) {
          if (isMissingTable(result.error)) {
            return [];
          }

          throw new Error("No se ha podido cargar el CRM ligero.");
        }

        return (result.data ?? []) as ClientRecord[];
      })();

  const normalizedQuery = query.trim().toLowerCase();

  return clients.filter((client) => {
    if (status !== "all" && client.status !== status) {
      return false;
    }

    if (priority !== "all" && client.priority !== priority) {
      return false;
    }

    if (relation !== "all" && client.relation_kind !== relation) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return [
      client.display_name,
      client.company_name,
      client.first_name,
      client.last_name,
      client.email,
      client.phone,
      client.nif,
      client.address,
      client.notes,
      client.tags.join(" "),
    ]
      .filter(Boolean)
      .some((value) => value?.toLowerCase().includes(normalizedQuery));
  });
}

export async function getClientActivitySnapshotForUser(
  userId: string,
  client: ClientRecord,
): Promise<ClientActivitySnapshot> {
  const collections = await getClientCollections(userId);

  const invoices = collections.invoices.filter((invoice) =>
    matchesContactIdentity(client, {
      displayName: invoice.client_name,
      email: invoice.client_email,
      nif: invoice.client_nif,
    }),
  );

  const documents = collections.documents.filter((document) =>
    matchesContactIdentity(client, {
      displayName: document.client_name,
      email: document.client_email,
      nif: document.client_nif,
    }),
  );

  const messages = collections.messages.filter((thread) =>
    matchesContactIdentity(client, {
      displayName: thread.full_name,
      email: null,
      phone: thread.phone,
      nif: null,
    }),
  );

  const mails = collections.mailThreads.filter((thread) =>
    matchesContactIdentity(client, {
      displayName: thread.from_name,
      companyName: thread.from_name,
      email: thread.from_email,
    }),
  );

  const expenses = collections.expenses.filter((expense) =>
    matchesContactIdentity(client, {
      displayName: expense.vendor_name,
      nif: expense.vendor_nif,
    }),
  );

  const timeline: ClientActivityItem[] = [
    ...invoices.map((invoice) => ({
      id: `invoice-${invoice.id}`,
      kind: "invoice" as const,
      title: `Factura ${formatInvoiceNumber(invoice.invoice_number)}`,
      detail: `${invoice.client_name} · ${toNumber(invoice.grand_total).toFixed(2)} €`,
      at: invoice.issue_date,
      href: "/invoices",
    })),
    ...documents.map((document) => ({
      id: `document-${document.id}`,
      kind: "document" as const,
      title:
        document.document_type === "quote"
          ? `Presupuesto #${document.document_number}`
          : `Albarán #${document.document_number}`,
      detail: document.notes ?? document.client_name,
      at: document.issue_date,
      href: "/presupuestos",
    })),
    ...messages.map((thread) => ({
      id: `message-${thread.id}`,
      kind: "message" as const,
      title: `Mensaje ${thread.channel === "whatsapp" ? "WhatsApp" : "Telegram"}`,
      detail: thread.last_message_preview ?? thread.full_name,
      at: thread.last_message_at,
      href: `/messages?thread=${thread.id}`,
    })),
    ...mails.map((thread) => ({
      id: `mail-${thread.id}`,
      kind: "mail" as const,
      title: thread.subject ? `Correo: ${thread.subject}` : "Correo recibido",
      detail: thread.last_message_preview ?? thread.from_email,
      at: thread.last_message_at,
      href: `/mail?thread=${thread.id}`,
    })),
    ...expenses.map((expense) => ({
      id: `expense-${expense.id}`,
      kind: "expense" as const,
      title: `Gasto ${expense.vendor_name ?? "sin proveedor"}`,
      detail: expense.notes ?? expense.source_file_name ?? "Revisión contable",
      at: expense.expense_date ?? expense.created_at,
      href: "/gastos",
    })),
  ].sort((left, right) => new Date(right.at).getTime() - new Date(left.at).getTime());

  const metrics: ClientMetrics = {
    invoices: invoices.length,
    documents: documents.length,
    messages: messages.length,
    mails: mails.length,
    expenses: expenses.length,
    totalBilled: invoices.reduce((sum, invoice) => sum + toNumber(invoice.grand_total), 0),
    outstandingAmount: invoices.reduce(
      (sum, invoice) => sum + getInvoiceAmountOutstanding(invoice),
      0,
    ),
    overdueInvoices: invoices.filter(
      (invoice) => getInvoiceCollectionState(invoice) === "overdue",
    ).length,
    pipelineAmount: documents.reduce(
      (sum, document) =>
        document.status === "converted" ? sum : sum + toNumber(document.grand_total),
      0,
    ),
    lastActivityAt: getMostRecentDate([
      ...invoices.map((invoice) => invoice.issue_date),
      ...documents.map((document) => document.issue_date),
      ...messages.map((thread) => thread.last_message_at),
      ...mails.map((thread) => thread.last_message_at),
      ...expenses.map((expense) => expense.expense_date ?? expense.created_at),
    ]),
  };

  return {
    invoices,
    documents,
    messages,
    mails,
    expenses,
    timeline: timeline.slice(0, 10),
    metrics,
  };
}

function mergeRelationKinds(
  current: ClientRelationKind,
  next: ClientRelationKind,
): ClientRelationKind {
  if (current === next) {
    return current;
  }

  return "mixed";
}

function buildDetectedKey(input: {
  email?: string | null;
  phone?: string | null;
  nif?: string | null;
  displayName?: string | null;
}) {
  return (
    normalizeEmail(input.email) ||
    normalizePhone(input.phone) ||
    normalizeNif(input.nif) ||
    normalizeName(input.displayName) ||
    crypto.randomUUID()
  );
}

export async function getDetectedClientSuggestionsForUser(
  userId: string,
  savedClients: ClientRecord[],
  query = "",
) {
  const collections = await getClientCollections(userId);
  const bucket = new Map<string, DetectedClientSuggestion>();

  function registerCandidate(seed: {
    displayName: string;
    companyName?: string | null;
    email?: string | null;
    phone?: string | null;
    nif?: string | null;
    address?: string | null;
    relationKind: ClientRelationKind;
    sourceLabel: string;
    sourceKind: keyof DetectedClientSuggestion["counts"];
    activityAt: string | null;
  }) {
    const key = buildDetectedKey(seed);
    const existing = bucket.get(key);

    if (!existing) {
      bucket.set(key, {
        key,
        displayName: seed.displayName,
        relationKind: seed.relationKind,
        email: seed.email ?? null,
        phone: seed.phone ?? null,
        nif: seed.nif ?? null,
        address: seed.address ?? null,
        companyName: seed.companyName ?? null,
        lastActivityAt: seed.activityAt,
        sourceLabels: [seed.sourceLabel],
        counts: {
          invoices: seed.sourceKind === "invoices" ? 1 : 0,
          documents: seed.sourceKind === "documents" ? 1 : 0,
          messages: seed.sourceKind === "messages" ? 1 : 0,
          mails: seed.sourceKind === "mails" ? 1 : 0,
          expenses: seed.sourceKind === "expenses" ? 1 : 0,
        },
      });
      return;
    }

    existing.relationKind = mergeRelationKinds(existing.relationKind, seed.relationKind);
    existing.lastActivityAt = getMostRecentDate([existing.lastActivityAt, seed.activityAt]);
    existing.email = existing.email ?? seed.email ?? null;
    existing.phone = existing.phone ?? seed.phone ?? null;
    existing.nif = existing.nif ?? seed.nif ?? null;
    existing.address = existing.address ?? seed.address ?? null;
    existing.companyName = existing.companyName ?? seed.companyName ?? null;
    existing.displayName = existing.displayName || seed.displayName;

    if (!existing.sourceLabels.includes(seed.sourceLabel)) {
      existing.sourceLabels.push(seed.sourceLabel);
    }

    existing.counts[seed.sourceKind] += 1;
  }

  collections.invoices.forEach((invoice) =>
    registerCandidate({
      displayName: invoice.client_name,
      companyName: invoice.client_name,
      email: invoice.client_email,
      nif: invoice.client_nif,
      address: invoice.client_address,
      relationKind: "client",
      sourceLabel: "Facturas",
      sourceKind: "invoices",
      activityAt: invoice.issue_date,
    }),
  );

  collections.documents.forEach((document) =>
    registerCandidate({
      displayName: document.client_name,
      companyName: document.client_name,
      email: document.client_email,
      nif: document.client_nif,
      address: document.client_address,
      relationKind: "client",
      sourceLabel: "Presupuestos y albaranes",
      sourceKind: "documents",
      activityAt: document.issue_date,
    }),
  );

  collections.messages.forEach((thread) =>
    registerCandidate({
      displayName: thread.full_name,
      phone: thread.phone,
      relationKind: "client",
      sourceLabel: "Mensajería",
      sourceKind: "messages",
      activityAt: thread.last_message_at,
    }),
  );

  collections.mailThreads.forEach((thread) =>
    registerCandidate({
      displayName: thread.from_name ?? thread.from_email,
      companyName: thread.from_name,
      email: thread.from_email,
      relationKind: "client",
      sourceLabel: "Correo",
      sourceKind: "mails",
      activityAt: thread.last_message_at,
    }),
  );

  collections.expenses.forEach((expense) =>
    registerCandidate({
      displayName: expense.vendor_name ?? "Proveedor sin nombre",
      companyName: expense.vendor_name,
      nif: expense.vendor_nif,
      relationKind: "supplier",
      sourceLabel: "Gastos",
      sourceKind: "expenses",
      activityAt: expense.expense_date ?? expense.created_at,
    }),
  );

  const normalizedQuery = query.trim().toLowerCase();

  return Array.from(bucket.values())
    .filter(
      (candidate) =>
        !savedClients.some((client) =>
          matchesContactIdentity(client, {
            displayName: candidate.displayName,
            companyName: candidate.companyName,
            email: candidate.email,
            phone: candidate.phone,
            nif: candidate.nif,
          }),
        ),
    )
    .filter((candidate) => {
      if (!normalizedQuery) {
        return true;
      }

      return [
        candidate.displayName,
        candidate.companyName,
        candidate.email,
        candidate.phone,
        candidate.nif,
        candidate.address,
        candidate.sourceLabels.join(" "),
      ]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalizedQuery));
    })
    .sort((left, right) => {
      const rightTime = right.lastActivityAt ? new Date(right.lastActivityAt).getTime() : 0;
      const leftTime = left.lastActivityAt ? new Date(left.lastActivityAt).getTime() : 0;

      if (rightTime !== leftTime) {
        return rightTime - leftTime;
      }

      return left.displayName.localeCompare(right.displayName, "es", {
        sensitivity: "base",
      });
    });
}

export async function getClientHubData(
  userId: string,
  filters: ClientFilters = {},
  selectedClientId?: string,
) {
  const clients = await getClientsForUser(userId, filters);
  const clientItems = await Promise.all(
    clients.map(async (client) => {
      const snapshot = await getClientActivitySnapshotForUser(userId, client);

      return {
        ...client,
        metrics: snapshot.metrics,
      } satisfies ClientListItem;
    }),
  );

  const selectedClient =
    (selectedClientId
      ? clientItems.find((client) => client.id === selectedClientId)
      : clientItems[0]) ?? clientItems[0] ?? null;

  const selectedSnapshot = selectedClient
    ? await getClientActivitySnapshotForUser(userId, selectedClient)
    : null;

  const detectedSuggestions = await getDetectedClientSuggestionsForUser(
    userId,
    clients,
    filters.query,
  );

  const summary: ClientHubSummary = {
    savedClients: clientItems.length,
    detectedSuggestions: detectedSuggestions.length,
    activeClients: clientItems.filter((client) => client.status === "active").length,
    highPriorityClients: clientItems.filter((client) => client.priority === "high").length,
  };

  return {
    clients: clientItems.sort((left, right) => {
      const rightTime = right.metrics.lastActivityAt
        ? new Date(right.metrics.lastActivityAt).getTime()
        : 0;
      const leftTime = left.metrics.lastActivityAt
        ? new Date(left.metrics.lastActivityAt).getTime()
        : 0;

      if (rightTime !== leftTime) {
        return rightTime - leftTime;
      }

      return left.display_name.localeCompare(right.display_name, "es", {
        sensitivity: "base",
      });
    }),
    selectedClient,
    selectedSnapshot,
    detectedSuggestions,
    summary,
  };
}
