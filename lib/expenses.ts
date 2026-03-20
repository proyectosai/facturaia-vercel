import "server-only";

import path from "node:path";

import { PDFParse } from "pdf-parse";

import { extractExpenseDataFromText } from "@/lib/ai";
import { demoExpenses, getDemoExpenseById, isDemoMode } from "@/lib/demo";
import { hasLocalAiEnv } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  ExpenseExtractionMethod,
  ExpenseKind,
  ExpenseRecord,
  ExpenseReviewStatus,
} from "@/lib/types";
import { roundCurrency, toNumber } from "@/lib/utils";

export const expenseKindLabels: Record<ExpenseKind, string> = {
  ticket: "Ticket",
  supplier_invoice: "Factura proveedor",
};

export const expenseReviewStatusLabels: Record<ExpenseReviewStatus, string> = {
  draft: "Pendiente de revisar",
  reviewed: "Revisado",
};

export const expenseExtractionLabels: Record<ExpenseExtractionMethod, string> = {
  manual: "Texto pegado manualmente",
  pdf_text: "Texto extraído del PDF",
  plain_text: "Texto plano",
  unavailable: "Sin extracción automática",
};

function normalizeExpense(expense: ExpenseRecord): ExpenseRecord {
  return {
    ...expense,
    base_amount: expense.base_amount === null ? null : toNumber(expense.base_amount),
    vat_amount: expense.vat_amount === null ? null : toNumber(expense.vat_amount),
    total_amount: expense.total_amount === null ? null : toNumber(expense.total_amount),
  };
}

function cleanFilename(fileName: string) {
  return path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, "-");
}

export function getExpenseStoragePath(userId: string, fileName: string) {
  return `${userId}/expenses/${Date.now()}-${cleanFilename(fileName)}`;
}

export async function extractRawTextFromExpenseInput({
  file,
  manualText,
}: {
  file: File;
  manualText?: string;
}) {
  const cleanedManualText = manualText?.trim() ?? "";

  if (cleanedManualText) {
    return {
      rawText: cleanedManualText,
      method: "manual" as ExpenseExtractionMethod,
    };
  }

  if (file.type === "text/plain") {
    return {
      rawText: (await file.text()).trim(),
      method: "plain_text" as ExpenseExtractionMethod,
    };
  }

  if (file.type === "application/pdf") {
    const buffer = Buffer.from(await file.arrayBuffer());
    const parser = new PDFParse({ data: buffer });
    const parsed = await parser.getText();
    await parser.destroy();
    const rawText = parsed.text.trim();

    return {
      rawText,
      method: rawText ? ("pdf_text" as ExpenseExtractionMethod) : ("unavailable" as ExpenseExtractionMethod),
    };
  }

  return {
    rawText: "",
    method: "unavailable" as ExpenseExtractionMethod,
  };
}

function parseDateFromText(rawText: string) {
  const normalized = rawText.replace(/\./g, "/");
  const match = normalized.match(
    /\b(\d{1,2})[\/-](\d{1,2})[\/-](20\d{2})\b|\b(20\d{2})[\/-](\d{1,2})[\/-](\d{1,2})\b/,
  );

  if (!match) {
    return null;
  }

  if (match[1] && match[2] && match[3]) {
    return `${match[3]}-${String(Number(match[2])).padStart(2, "0")}-${String(
      Number(match[1]),
    ).padStart(2, "0")}`;
  }

  if (match[4] && match[5] && match[6]) {
    return `${match[4]}-${String(Number(match[5])).padStart(2, "0")}-${String(
      Number(match[6]),
    ).padStart(2, "0")}`;
  }

  return null;
}

function parseMoney(value: string) {
  let normalized = value.replace(/[^\d,.-]/g, "");

  if (normalized.includes(",") && normalized.includes(".")) {
    if (normalized.lastIndexOf(",") > normalized.lastIndexOf(".")) {
      normalized = normalized.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = normalized.replace(/,/g, "");
    }
  } else if (normalized.includes(",")) {
    normalized = normalized.replace(",", ".");
  }

  const number = Number(normalized);

  return Number.isFinite(number) ? roundCurrency(number) : null;
}

function pickLargestAmount(rawText: string) {
  const matches = [...rawText.matchAll(/\b\d{1,4}(?:[.,]\d{2})\b/g)];
  const amounts = matches
    .map((match) => parseMoney(match[0]))
    .filter((value): value is number => value !== null)
    .sort((left, right) => right - left);

  return amounts[0] ?? null;
}

function parseFieldByLabel(rawText: string, labels: string[]) {
  for (const label of labels) {
    const pattern = new RegExp(`${label}\\s*[:\\-]?\\s*([\\d.,]+)`, "i");
    const match = rawText.match(pattern);

    if (match?.[1]) {
      return parseMoney(match[1]);
    }
  }

  return null;
}

function extractVendorNif(rawText: string) {
  const nifPattern = /\b([A-HJNPQRSUVW]\d{7}[0-9A-J]|[XYZ]\d{7}[A-Z]|\d{8}[A-Z])\b/i;
  return rawText.match(nifPattern)?.[1]?.toUpperCase() ?? null;
}

function extractVendorName(rawText: string) {
  const lines = rawText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const candidate = lines.find((line) => {
    const lower = line.toLowerCase();

    return (
      line.length > 3 &&
      !lower.includes("fecha") &&
      !lower.includes("total") &&
      !lower.includes("iva") &&
      !lower.includes("base") &&
      !lower.includes("factura") &&
      !lower.includes("ticket") &&
      !lower.includes("cif") &&
      !lower.includes("nif")
    );
  });

  return candidate ?? null;
}

function fallbackExpenseDraftFromText(rawText: string) {
  const totalAmount =
    parseFieldByLabel(rawText, ["total", "importe total", "a pagar"]) ??
    pickLargestAmount(rawText);
  const vatAmount = parseFieldByLabel(rawText, ["iva", "cuota iva"]);
  const baseAmount =
    parseFieldByLabel(rawText, ["base imponible", "base", "subtotal"]) ??
    (totalAmount !== null && vatAmount !== null
      ? roundCurrency(totalAmount - vatAmount)
      : null);

  return {
    vendorName: extractVendorName(rawText),
    vendorNif: extractVendorNif(rawText),
    expenseDate: parseDateFromText(rawText),
    baseAmount,
    vatAmount,
    totalAmount,
    notes: null,
    confidence: rawText.trim().length > 0 ? 0.5 : 0,
  };
}

async function parseExpenseDraftFromRawText({
  rawText,
  expenseKind,
  fileName,
}: {
  rawText: string;
  expenseKind: ExpenseKind;
  fileName?: string;
}) {
  if (!rawText.trim()) {
    return {
      source: "empty" as const,
      vendorName: null,
      vendorNif: null,
      expenseDate: null,
      baseAmount: null,
      vatAmount: null,
      totalAmount: null,
      notes: "No hay texto suficiente para proponer datos automáticamente.",
      confidence: 0,
    };
  }

  if (hasLocalAiEnv()) {
    try {
      return {
        source: "ai" as const,
        ...(await extractExpenseDataFromText({
          rawText,
          expenseKind,
          fileName,
        })),
      };
    } catch {
      return {
        source: "fallback" as const,
        ...fallbackExpenseDraftFromText(rawText),
      };
    }
  }

  return {
    source: "fallback" as const,
    ...fallbackExpenseDraftFromText(rawText),
  };
}

export async function getExpensesForUser(
  userId: string,
  filters: {
    query?: string;
    reviewStatus?: ExpenseReviewStatus | "all";
    expenseKind?: ExpenseKind | "all";
  } = {},
) {
  const query = filters.query?.trim().toLowerCase() ?? "";
  const reviewStatus = filters.reviewStatus ?? "all";
  const expenseKind = filters.expenseKind ?? "all";

  if (isDemoMode()) {
    return demoExpenses
      .map(normalizeExpense)
      .filter((expense) => expense.user_id === userId)
      .filter((expense) => (reviewStatus === "all" ? true : expense.review_status === reviewStatus))
      .filter((expense) => (expenseKind === "all" ? true : expense.expense_kind === expenseKind))
      .filter((expense) => {
        if (!query) {
          return true;
        }

        return [
          expense.vendor_name,
          expense.vendor_nif,
          expense.source_file_name,
          expense.notes,
        ].some((value) => String(value ?? "").toLowerCase().includes(query));
      })
      .sort((left, right) => {
        const leftDate = left.expense_date ?? left.created_at;
        const rightDate = right.expense_date ?? right.created_at;
        return new Date(rightDate).getTime() - new Date(leftDate).getTime();
      });
  }

  const supabase = await createServerSupabaseClient();
  let dbQuery = supabase
    .from("expenses")
    .select("*")
    .eq("user_id", userId)
    .order("expense_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (reviewStatus !== "all") {
    dbQuery = dbQuery.eq("review_status", reviewStatus);
  }

  if (expenseKind !== "all") {
    dbQuery = dbQuery.eq("expense_kind", expenseKind);
  }

  if (query) {
    dbQuery = dbQuery.or(
      `vendor_name.ilike.%${query}%,vendor_nif.ilike.%${query}%,source_file_name.ilike.%${query}%,notes.ilike.%${query}%`,
    );
  }

  const { data, error } = await dbQuery;

  if (error) {
    throw new Error("No se han podido cargar los gastos.");
  }

  return ((data as ExpenseRecord[] | null) ?? []).map(normalizeExpense);
}

export async function getExpenseByIdForUser(userId: string, expenseId: string) {
  if (isDemoMode()) {
    const expense = getDemoExpenseById(expenseId);
    return expense && expense.user_id === userId ? normalizeExpense(expense) : null;
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .eq("id", expenseId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error("No se ha podido cargar el gasto.");
  }

  return data ? normalizeExpense(data as ExpenseRecord) : null;
}

export function getExpensesSummary(expenses: ExpenseRecord[]) {
  return {
    total: expenses.length,
    draft: expenses.filter((expense) => expense.review_status === "draft").length,
    reviewed: expenses.filter((expense) => expense.review_status === "reviewed").length,
    totalAmount: roundCurrency(
      expenses.reduce((sum, expense) => sum + toNumber(expense.total_amount ?? 0), 0),
    ),
    thisMonthAmount: roundCurrency(
      expenses
        .filter((expense) => {
          if (!expense.expense_date) {
            return false;
          }

          const now = new Date();
          const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
          return expense.expense_date.startsWith(monthKey);
        })
        .reduce((sum, expense) => sum + toNumber(expense.total_amount ?? 0), 0),
    ),
  };
}

export function getExpensesOcrSupport() {
  return {
    pdfText: true,
    imageText: false,
    aiParsing: hasLocalAiEnv(),
    providerLabel: hasLocalAiEnv() ? "LM Studio" : "Heurística local",
  };
}

export async function buildExpenseDraftFromInput({
  file,
  expenseKind,
  manualText,
}: {
  file: File;
  expenseKind: ExpenseKind;
  manualText?: string;
}) {
  const extraction = await extractRawTextFromExpenseInput({ file, manualText });
  const draft = await parseExpenseDraftFromRawText({
    rawText: extraction.rawText,
    expenseKind,
    fileName: file.name,
  });

  return {
    extraction,
    draft,
  };
}
