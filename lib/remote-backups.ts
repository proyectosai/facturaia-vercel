import "server-only";

import { z } from "zod";

import { isDemoMode } from "@/lib/demo";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { RemoteBackupRun } from "@/lib/types";

const remoteBackupEnvSchema = z.object({
  REMOTE_BACKUP_PROVIDER: z.literal("webdav"),
  WEBDAV_BASE_URL: z.string().url(),
  WEBDAV_USERNAME: z.string().min(1),
  WEBDAV_PASSWORD: z.string().min(1),
  WEBDAV_BACKUP_PATH: z.string().min(1).default("/FacturaIA"),
});

export type RemoteBackupConfig = {
  provider: "webdav";
  baseUrl: string;
  username: string;
  password: string;
  backupPath: string;
};

export type RemoteBackupState = {
  configured: boolean;
  providerLabel: string;
  targetLabel: string;
  latestRuns: RemoteBackupRun[];
};

function isMissingRemoteBackupTable(error: { code?: string; message?: string } | null) {
  if (!error) {
    return false;
  }

  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    error.message?.includes("remote_backup_runs") === true
  );
}

function normalizePath(path: string) {
  const trimmed = path.trim();
  if (!trimmed) {
    return "";
  }

  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeadingSlash.replace(/\/+$/, "");
}

function buildAuthHeader(username: string, password: string) {
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

function buildWebdavUrl(baseUrl: string, path: string) {
  const sanitizedBase = baseUrl.replace(/\/+$/, "");
  const normalizedPath = normalizePath(path);

  if (!normalizedPath) {
    return sanitizedBase;
  }

  return `${sanitizedBase}${normalizedPath
    .split("/")
    .map((segment, index) =>
      index === 0 ? segment : encodeURIComponent(segment),
    )
    .join("/")}`;
}

async function ensureWebdavCollection(config: RemoteBackupConfig, path: string) {
  const normalized = normalizePath(path);

  if (!normalized) {
    return;
  }

  const segments = normalized.split("/").filter(Boolean);
  let currentPath = "";

  for (const segment of segments) {
    currentPath += `/${segment}`;
    const response = await fetch(buildWebdavUrl(config.baseUrl, currentPath), {
      method: "MKCOL",
      headers: {
        Authorization: buildAuthHeader(config.username, config.password),
      },
      cache: "no-store",
    });

    if (![200, 201, 301, 302, 405].includes(response.status)) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(
        `No se ha podido preparar la carpeta remota (${response.status}). ${errorBody}`.trim(),
      );
    }
  }
}

export function getRemoteBackupConfig(): RemoteBackupConfig | null {
  if (!process.env.REMOTE_BACKUP_PROVIDER) {
    return null;
  }

  const parsed = remoteBackupEnvSchema.parse({
    REMOTE_BACKUP_PROVIDER: process.env.REMOTE_BACKUP_PROVIDER,
    WEBDAV_BASE_URL: process.env.WEBDAV_BASE_URL,
    WEBDAV_USERNAME: process.env.WEBDAV_USERNAME,
    WEBDAV_PASSWORD: process.env.WEBDAV_PASSWORD,
    WEBDAV_BACKUP_PATH: process.env.WEBDAV_BACKUP_PATH,
  });

  return {
    provider: parsed.REMOTE_BACKUP_PROVIDER,
    baseUrl: parsed.WEBDAV_BASE_URL,
    username: parsed.WEBDAV_USERNAME,
    password: parsed.WEBDAV_PASSWORD,
    backupPath: normalizePath(parsed.WEBDAV_BACKUP_PATH),
  };
}

export function getRemoteBackupStatusSummary() {
  try {
    const config = getRemoteBackupConfig();

    if (!config) {
      return {
        configured: false,
        providerLabel: "No configurado",
        targetLabel: "Añade variables WebDAV para activar backups remotos.",
      };
    }

    return {
      configured: true,
      providerLabel: "WebDAV / Nextcloud",
      targetLabel: `${config.baseUrl}${config.backupPath}`,
    };
  } catch {
    return {
      configured: false,
      providerLabel: "Configuración incompleta",
      targetLabel: "Revisa las variables del módulo WebDAV.",
    };
  }
}

export async function getRemoteBackupRuns(
  userId: string,
  limit = 5,
): Promise<RemoteBackupRun[]> {
  if (isDemoMode()) {
    return [];
  }

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("remote_backup_runs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingRemoteBackupTable(error)) {
      return [];
    }

    throw new Error("No se ha podido cargar el historial de backups remotos.");
  }

  return (data as RemoteBackupRun[] | null) ?? [];
}

export async function getRemoteBackupState(userId: string): Promise<RemoteBackupState> {
  const summary = getRemoteBackupStatusSummary();
  const latestRuns = await getRemoteBackupRuns(userId);

  return {
    ...summary,
    latestRuns,
  };
}

export async function logRemoteBackupRun(
  userId: string,
  payload: Omit<RemoteBackupRun, "id" | "user_id" | "created_at">,
) {
  if (isDemoMode()) {
    return null;
  }

  const admin = createAdminSupabaseClient();
  const { error } = await admin.from("remote_backup_runs").insert({
    user_id: userId,
    ...payload,
  });

  if (error) {
    if (isMissingRemoteBackupTable(error)) {
      return null;
    }

    throw new Error("No se ha podido registrar la ejecución del backup remoto.");
  }

  return true;
}

export function buildRemoteBackupFilename(userId: string, date = new Date()) {
  const stamp = date.toISOString().replace(/[:]/g, "-");
  return `facturaia-${userId}-${stamp}.json`;
}

export async function pushBackupToRemoteWebdav({
  userId,
  fileName,
  body,
}: {
  userId: string;
  fileName: string;
  body: string;
}) {
  const config = getRemoteBackupConfig();

  if (!config) {
    throw new Error("El módulo de backups remotos no está configurado.");
  }

  const remoteDirectory = `${config.backupPath}/${userId}`;
  await ensureWebdavCollection(config, remoteDirectory);
  const remotePath = `${remoteDirectory}/${fileName}`;
  const response = await fetch(buildWebdavUrl(config.baseUrl, remotePath), {
    method: "PUT",
    headers: {
      Authorization: buildAuthHeader(config.username, config.password),
      "Content-Type": "application/json; charset=utf-8",
    },
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `No se ha podido subir el backup remoto (${response.status}). ${errorBody}`.trim(),
    );
  }

  return {
    provider: "webdav" as const,
    remotePath,
    fileName,
  };
}
