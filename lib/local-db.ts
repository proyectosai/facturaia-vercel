import "server-only";

import path from "node:path";
import { promises as fs } from "node:fs";

import initSqlJs, { type Database, type SqlJsStatic } from "sql.js";

let sqlJsPromise: Promise<SqlJsStatic> | null = null;

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
      // Next puede empaquetar require.resolve como un id numérico en el
      // bundle del servidor. Apuntar al wasm desde process.cwd() evita esa
      // ruptura en build y E2E local.
      locateFile: () => wasmFilePath,
    });
  }

  return sqlJsPromise;
}

export function getLocalDataDir() {
  return process.env.FACTURAIA_DATA_DIR?.trim() || path.join(process.cwd(), ".facturaia-local");
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
  `);
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

async function persistDatabase(db: Database) {
  await ensureLocalDataDir();
  const filePath = getLocalDatabaseFilePath();
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
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

export async function writeLocalStateText(payloadText: string) {
  const db = await openDatabase();

  try {
    writePayloadToDatabase(db, payloadText);
    await persistDatabase(db);
  } finally {
    db.close();
  }
}
