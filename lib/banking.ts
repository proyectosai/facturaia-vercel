import "server-only";

import { cache } from "react";
import { createHash } from "node:crypto";

import {
  demoBankMovements,
  demoExpenses,
  demoInvoices,
  getDemoBankMovementById,
  isDemoMode,
} from "@/lib/demo";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  BankMovementDirection,
  BankMovementRecord,
  BankMovementStatus,
  ExpenseRecord,
  InvoiceRecord,
} from "@/lib/types";
import { createSlug, formatInvoiceNumber, roundCurrency, toNumber } from "@/lib/utils";

export type BankMovementFilters = {
  query?: string;
  status?: "all" | BankMovementStatus;
  direction?: "all" | BankMovementDirection;
};

export type ParsedBankMovementInput = {
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
};

export type BankMatchCandidate = {
  id: string;
  kind: "invoice" | "expense";
  label: string;
  detail: string;
  amount: number;
  date: string | null;
  score: number;
  href: string;
};

export type BankMovementSummary = {
  total: number;
  pending: number;
  reconciled: number;
  ignored: number;
  incomingTotal: number;
  outgoingTotal: number;
  accounts: number;
};

export const bankMovementDirectionLabels: Record<BankMovementDirection, string> = {
  credit: "Ingreso",
  debit: "Cargo",
};

export const bankMovementStatusLabels: Record<BankMovementStatus, string> = {
  pending: "Pendiente",
  reconciled: "Conciliado",
  ignored: "Ignorado",
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

function normalizeMovement(record: BankMovementRecord): BankMovementRecord {
  return {
    ...record,
    amount: toNumber(record.amount),
    balance: record.balance === null ? null : toNumber(record.balance),
  };
}

function normalizeText(value: string | null | undefined) {
  return createSlug(value ?? "").replace(/-/g, "");
}

function matchesLooseText(source: string | null | undefined, candidate: string | null | undefined) {
  const left = normalizeText(source);
  const right = normalizeText(candidate);

  if (!left || !right) {
    return false;
  }

  return left.includes(right) || right.includes(left);
}

function differenceInDays(left: string | null | undefined, right: string | null | undefined) {
  if (!left || !right) {
    return Number.POSITIVE_INFINITY;
  }

  const leftDate = new Date(left);
  const rightDate = new Date(right);

  if (Number.isNaN(leftDate.getTime()) || Number.isNaN(rightDate.getTime())) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.abs(leftDate.getTime() - rightDate.getTime()) / (1000 * 60 * 60 * 24);
}

function parseDateValue(rawValue: string | null | undefined) {
  const value = rawValue?.trim();

  if (!value) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const normalized = value.replace(/\./g, "/");
  const dayFirst = normalized.match(/^(\d{1,2})[/-](\d{1,2})[/-](20\d{2})$/);

  if (dayFirst) {
    const [, day, month, year] = dayFirst;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const yearFirst = normalized.match(/^(20\d{2})[/-](\d{1,2})[/-](\d{1,2})$/);

  if (yearFirst) {
    const [, year, month, day] = yearFirst;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return null;
}

function parseAmountValue(rawValue: string | null | undefined) {
  const value = rawValue?.trim();

  if (!value) {
    return null;
  }

  let normalized = value
    .replace(/\s+/g, "")
    .replace(/[€$£]/g, "")
    .replace(/[^0-9,.-]/g, "");

  if (!normalized) {
    return null;
  }

  if (normalized.includes(",") && normalized.includes(".")) {
    if (normalized.lastIndexOf(",") > normalized.lastIndexOf(".")) {
      normalized = normalized.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = normalized.replace(/,/g, "");
    }
  } else if (normalized.includes(",")) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  }

  const amount = Number(normalized);
  return Number.isFinite(amount) ? roundCurrency(amount) : null;
}

function normalizeHeader(value: string) {
  return createSlug(value)
    .replace(/-/g, "")
    .replace(/ñ/g, "n");
}

function detectDelimiter(sampleLine: string) {
  const delimiters = [";", ",", "\t", "|"] as const;
  let best = ";";
  let bestCount = -1;

  for (const delimiter of delimiters) {
    const count = sampleLine.split(delimiter).length;

    if (count > bestCount) {
      best = delimiter;
      bestCount = count;
    }
  }

  return best;
}

function parseDelimitedRows(text: string, delimiter: string) {
  const rows: string[][] = [];
  let currentCell = "";
  let currentRow: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === "\"") {
      if (inQuotes && nextChar === "\"") {
        currentCell += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }

      continue;
    }

    if (!inQuotes && char === delimiter) {
      currentRow.push(currentCell.trim());
      currentCell = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      currentRow.push(currentCell.trim());
      currentCell = "";

      if (currentRow.some((cell) => cell.length > 0)) {
        rows.push(currentRow);
      }

      currentRow = [];
      continue;
    }

    currentCell += char;
  }

  currentRow.push(currentCell.trim());

  if (currentRow.some((cell) => cell.length > 0)) {
    rows.push(currentRow);
  }

  return rows;
}

function pickCell(
  row: string[],
  normalizedHeaders: string[],
  candidateHeaders: string[],
) {
  const candidates = candidateHeaders.map(normalizeHeader);

  for (const candidate of candidates) {
    const index = normalizedHeaders.indexOf(candidate);

    if (index >= 0) {
      return row[index] ?? "";
    }
  }

  return "";
}

function buildSourceHash({
  accountLabel,
  fileName,
  bookingDate,
  description,
  amount,
  valueDate,
  rowIndex,
}: {
  accountLabel: string;
  fileName: string | null;
  bookingDate: string;
  description: string;
  amount: number;
  valueDate: string | null;
  rowIndex: number;
}) {
  return createHash("sha1")
    .update(
      JSON.stringify({
        accountLabel,
        fileName,
        bookingDate,
        valueDate,
        description,
        amount,
        rowIndex,
      }),
    )
    .digest("hex");
}

export function parseBankCsvFile({
  fileText,
  fileName,
  accountLabel,
}: {
  fileText: string;
  fileName?: string | null;
  accountLabel: string;
}) {
  const cleaned = fileText.replace(/^\uFEFF/, "").trim();

  if (!cleaned) {
    throw new Error("El CSV bancario está vacío.");
  }

  const firstLine = cleaned.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = detectDelimiter(firstLine);
  const rows = parseDelimitedRows(cleaned, delimiter);

  if (rows.length < 2) {
    throw new Error("El CSV debe incluir cabecera y al menos un movimiento.");
  }

  const headers = rows[0];
  const normalizedHeaders = headers.map(normalizeHeader);
  const parsed: ParsedBankMovementInput[] = [];

  for (const [rowIndex, row] of rows.slice(1).entries()) {
    const bookingDate = parseDateValue(
      pickCell(row, normalizedHeaders, [
        "fecha",
        "fecha operacion",
        "fecha operación",
        "fecha movimiento",
        "booking date",
        "date",
        "fecha apunte",
      ]),
    );

    if (!bookingDate) {
      continue;
    }

    const valueDate = parseDateValue(
      pickCell(row, normalizedHeaders, ["fecha valor", "value date"]),
    );
    const description =
      pickCell(row, normalizedHeaders, [
        "concepto",
        "descripcion",
        "descripción",
        "detalle",
        "details",
        "description",
        "concept",
      ]) || "Movimiento sin concepto";
    const counterpartyName =
      pickCell(row, normalizedHeaders, [
        "contraparte",
        "beneficiario",
        "ordenante",
        "emisor",
        "titular",
        "counterparty",
        "partner",
        "nombre",
      ]) || null;
    const currency =
      pickCell(row, normalizedHeaders, ["moneda", "currency", "divisa"]).toUpperCase() ||
      "EUR";
    const balance = parseAmountValue(
      pickCell(row, normalizedHeaders, ["saldo", "balance", "saldo final"]),
    );

    const directAmount = parseAmountValue(
      pickCell(row, normalizedHeaders, ["importe", "amount", "importe eur", "monto"]),
    );
    const creditAmount = parseAmountValue(
      pickCell(row, normalizedHeaders, ["abono", "ingreso", "credit", "entrada"]),
    );
    const debitAmount = parseAmountValue(
      pickCell(row, normalizedHeaders, ["cargo", "salida", "debit", "withdrawal"]),
    );

    let amount = directAmount;
    let direction: BankMovementDirection | null = null;

    if (creditAmount !== null && Math.abs(creditAmount) > 0) {
      amount = Math.abs(creditAmount);
      direction = "credit";
    } else if (debitAmount !== null && Math.abs(debitAmount) > 0) {
      amount = -Math.abs(debitAmount);
      direction = "debit";
    } else if (amount !== null) {
      direction = amount >= 0 ? "credit" : "debit";
      amount = direction === "credit" ? Math.abs(amount) : -Math.abs(amount);
    }

    if (amount === null || direction === null) {
      continue;
    }

    const rawRow = Object.fromEntries(
      headers.map((header, index) => [header, row[index] ?? ""]),
    );

    parsed.push({
      accountLabel: accountLabel.trim(),
      bookingDate,
      valueDate,
      description: description.trim(),
      counterpartyName: counterpartyName?.trim() || null,
      amount,
      currency,
      direction,
      balance,
      sourceFileName: fileName ?? null,
      sourceHash: buildSourceHash({
        accountLabel,
        fileName: fileName ?? null,
        bookingDate,
        valueDate,
        description,
        amount,
        rowIndex,
      }),
      rawRow,
    });
  }

  if (parsed.length === 0) {
    throw new Error(
      "No se han detectado movimientos válidos. Revisa la cabecera del CSV y usa columnas como fecha, concepto e importe.",
    );
  }

  return parsed;
}

function applyBankFilters(movements: BankMovementRecord[], filters: BankMovementFilters = {}) {
  const query = filters.query?.trim().toLowerCase() ?? "";

  return movements.filter((movement) => {
    if (filters.status && filters.status !== "all" && movement.status !== filters.status) {
      return false;
    }

    if (
      filters.direction &&
      filters.direction !== "all" &&
      movement.direction !== filters.direction
    ) {
      return false;
    }

    if (!query) {
      return true;
    }

    const haystack = [
      movement.account_label,
      movement.description,
      movement.counterparty_name,
      movement.notes,
      movement.source_file_name,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}

const getBankMatchingCollections = cache(
  async (userId: string): Promise<{ invoices: InvoiceRecord[]; expenses: ExpenseRecord[] }> => {
    if (isDemoMode()) {
      return {
        invoices: demoInvoices,
        expenses: demoExpenses,
      };
    }

    const supabase = await createServerSupabaseClient();
    const [invoices, expenses] = await Promise.all([
      safeSelectArray<InvoiceRecord>(
        supabase
          .from("invoices")
          .select("*")
          .eq("user_id", userId)
          .order("issue_date", { ascending: false }),
        "las facturas",
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
      expenses,
    };
  },
);

export async function getBankMatchingDataForUser(userId: string) {
  return getBankMatchingCollections(userId);
}

export async function getBankMovementsForUser(
  userId: string,
  filters: BankMovementFilters = {},
) {
  if (isDemoMode()) {
    return applyBankFilters(
      [...demoBankMovements].map(normalizeMovement).sort(
        (left, right) =>
          new Date(right.booking_date).getTime() - new Date(left.booking_date).getTime(),
      ),
      filters,
    );
  }

  const supabase = await createServerSupabaseClient();
  const movements = await safeSelectArray<BankMovementRecord>(
    supabase
      .from("bank_movements")
      .select("*")
      .eq("user_id", userId)
      .order("booking_date", { ascending: false })
      .order("created_at", { ascending: false }),
    "los movimientos bancarios",
  );

  return applyBankFilters(movements.map(normalizeMovement), filters);
}

export async function getBankMovementByIdForUser(userId: string, movementId: string) {
  if (isDemoMode()) {
    return getDemoBankMovementById(movementId);
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("bank_movements")
    .select("*")
    .eq("user_id", userId)
    .eq("id", movementId)
    .maybeSingle();

  if (error) {
    if (isMissingTable(error)) {
      return null;
    }

    throw new Error("No se ha podido cargar el movimiento bancario.");
  }

  return data ? normalizeMovement(data as BankMovementRecord) : null;
}

export function getBankMovementSummary(movements: BankMovementRecord[]): BankMovementSummary {
  const normalized = movements.map(normalizeMovement);
  const accounts = new Set(normalized.map((movement) => movement.account_label.trim()).filter(Boolean));

  return normalized.reduce<BankMovementSummary>(
    (summary, movement) => {
      summary.total += 1;
      summary[movement.status] += 1;

      if (movement.direction === "credit") {
        summary.incomingTotal = roundCurrency(
          summary.incomingTotal + Math.abs(toNumber(movement.amount)),
        );
      } else {
        summary.outgoingTotal = roundCurrency(
          summary.outgoingTotal + Math.abs(toNumber(movement.amount)),
        );
      }

      return summary;
    },
    {
      total: 0,
      pending: 0,
      reconciled: 0,
      ignored: 0,
      incomingTotal: 0,
      outgoingTotal: 0,
      accounts: accounts.size,
    },
  );
}

function scoreAmountMatch(left: number, right: number) {
  const difference = Math.abs(Math.abs(left) - Math.abs(right));

  if (difference <= 0.01) {
    return 65;
  }

  if (difference <= 1) {
    return 40;
  }

  if (difference <= 5) {
    return 20;
  }

  if (difference <= 15) {
    return 8;
  }

  return 0;
}

function scoreDateMatch(left: string | null | undefined, right: string | null | undefined) {
  const diff = differenceInDays(left, right);

  if (!Number.isFinite(diff)) {
    return 0;
  }

  if (diff <= 2) {
    return 18;
  }

  if (diff <= 7) {
    return 10;
  }

  if (diff <= 21) {
    return 4;
  }

  return 0;
}

function scoreTextMatch(...pairs: Array<[string | null | undefined, string | null | undefined]>) {
  return pairs.reduce((score, [left, right]) => score + (matchesLooseText(left, right) ? 14 : 0), 0);
}

export function getBankMatchSuggestionsForMovement(
  movement: BankMovementRecord,
  collections: {
    invoices: InvoiceRecord[];
    expenses: ExpenseRecord[];
  },
) {
  const amount = toNumber(movement.amount);

  if (movement.direction === "credit") {
    return collections.invoices
      .map<BankMatchCandidate | null>((invoice) => {
        const invoiceAmount = toNumber(invoice.grand_total);
        let score = scoreAmountMatch(amount, invoiceAmount);
        score += scoreDateMatch(movement.booking_date, invoice.issue_date);
        score += scoreTextMatch(
          [movement.description, formatInvoiceNumber(invoice.invoice_number)],
          [movement.counterparty_name, invoice.client_name],
          [movement.description, invoice.client_name],
        );

        if (score < 35) {
          return null;
        }

        return {
          id: invoice.id,
          kind: "invoice",
          label: formatInvoiceNumber(invoice.invoice_number),
          detail: `${invoice.client_name} · ${invoice.issue_date}`,
          amount: invoiceAmount,
          date: invoice.issue_date,
          score,
          href: "/invoices",
        };
      })
      .filter((candidate): candidate is BankMatchCandidate => candidate !== null)
      .sort((left, right) => right.score - left.score)
      .slice(0, 3);
  }

  return collections.expenses
    .map<BankMatchCandidate | null>((expense) => {
      const expenseAmount = expense.total_amount === null ? 0 : toNumber(expense.total_amount);

      if (!expenseAmount) {
        return null;
      }

      let score = scoreAmountMatch(amount, expenseAmount);
      score += scoreDateMatch(movement.booking_date, expense.expense_date);
      score += scoreTextMatch(
        [movement.counterparty_name, expense.vendor_name],
        [movement.description, expense.vendor_name],
      );

      if (score < 30) {
        return null;
      }

      return {
        id: expense.id,
        kind: "expense",
        label: expense.vendor_name ?? "Gasto sin proveedor",
        detail: `${expense.source_file_name ?? "Justificante"} · ${expense.expense_date ?? "Fecha pendiente"}`,
        amount: expenseAmount,
        date: expense.expense_date,
        score,
        href: "/gastos",
      };
    })
    .filter((candidate): candidate is BankMatchCandidate => candidate !== null)
    .sort((left, right) => right.score - left.score)
    .slice(0, 3);
}
