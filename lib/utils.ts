import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export function formatDateLong(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;

  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatDateShort(value: string | Date | null | undefined) {
  if (!value) {
    return "Pendiente";
  }

  const date = typeof value === "string" ? new Date(value) : value;

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatInvoiceNumber(value: number | string) {
  return `FAC-${String(value).padStart(6, "0")}`;
}

export function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return Number(value);
  }

  return 0;
}

export function getBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export function createSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
