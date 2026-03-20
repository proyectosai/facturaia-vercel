import "server-only";

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

export type EncryptionScope = "local-core" | "backup";

export type EncryptedPayloadEnvelope = {
  schemaVersion: 1;
  format: "facturaia-encrypted";
  scope: EncryptionScope;
  algorithm: "aes-256-gcm";
  kdf: "scrypt";
  salt: string;
  iv: string;
  tag: string;
  ciphertext: string;
  encryptedAt: string;
};

export class LocalEncryptionError extends Error {}

function getConfiguredPassphrase() {
  const value = process.env.FACTURAIA_ENCRYPTION_PASSPHRASE?.trim();
  return value ? value : null;
}

function isScopeEncryptionRequested(scope: EncryptionScope) {
  if (scope === "local-core") {
    return process.env.FACTURAIA_ENCRYPT_LOCAL_DATA === "1";
  }

  return process.env.FACTURAIA_ENCRYPT_BACKUPS === "1";
}

export function isLocalDataEncryptionRequested() {
  return isScopeEncryptionRequested("local-core");
}

export function isBackupEncryptionRequested() {
  return isScopeEncryptionRequested("backup");
}

export function hasConfiguredEncryptionPassphrase() {
  return Boolean(getConfiguredPassphrase());
}

export function getEncryptionStatus(scope: EncryptionScope) {
  const requested = isScopeEncryptionRequested(scope);
  const configured = hasConfiguredEncryptionPassphrase();

  return {
    requested,
    configured,
    active: requested && configured,
  };
}

function requireEncryptionPassphrase(scope: EncryptionScope) {
  const passphrase = getConfiguredPassphrase();

  if (!passphrase) {
    throw new LocalEncryptionError(
      scope === "local-core"
        ? "Falta FACTURAIA_ENCRYPTION_PASSPHRASE para descifrar o escribir el núcleo local cifrado."
        : "Falta FACTURAIA_ENCRYPTION_PASSPHRASE para descifrar o exportar backups cifrados.",
    );
  }

  return passphrase;
}

function deriveKey(passphrase: string, salt: Buffer) {
  return scryptSync(passphrase, salt, 32);
}

export function isEncryptedPayloadEnvelope(value: unknown): value is EncryptedPayloadEnvelope {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    candidate.schemaVersion === 1 &&
    candidate.format === "facturaia-encrypted" &&
    (candidate.scope === "local-core" || candidate.scope === "backup") &&
    candidate.algorithm === "aes-256-gcm" &&
    candidate.kdf === "scrypt" &&
    typeof candidate.salt === "string" &&
    typeof candidate.iv === "string" &&
    typeof candidate.tag === "string" &&
    typeof candidate.ciphertext === "string" &&
    typeof candidate.encryptedAt === "string"
  );
}

export function tryParseEncryptedEnvelope(raw: string) {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return isEncryptedPayloadEnvelope(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function encryptTextForScope(
  plaintext: string,
  scope: EncryptionScope,
): EncryptedPayloadEnvelope {
  const passphrase = requireEncryptionPassphrase(scope);
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = deriveKey(passphrase, salt);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return {
    schemaVersion: 1,
    format: "facturaia-encrypted",
    scope,
    algorithm: "aes-256-gcm",
    kdf: "scrypt",
    salt: salt.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
    encryptedAt: new Date().toISOString(),
  };
}

export function decryptEncryptedEnvelope(
  envelope: EncryptedPayloadEnvelope,
  expectedScope: EncryptionScope,
) {
  if (envelope.scope !== expectedScope) {
    throw new LocalEncryptionError(
      `El contenido cifrado no corresponde a ${expectedScope}.`,
    );
  }

  const passphrase = requireEncryptionPassphrase(expectedScope);

  try {
    const salt = Buffer.from(envelope.salt, "base64");
    const iv = Buffer.from(envelope.iv, "base64");
    const tag = Buffer.from(envelope.tag, "base64");
    const ciphertext = Buffer.from(envelope.ciphertext, "base64");
    const key = deriveKey(passphrase, salt);
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);

    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
  } catch (error) {
    throw new LocalEncryptionError(
      error instanceof Error && error.message
        ? `No se ha podido descifrar ${expectedScope}. Revisa la passphrase configurada.`
        : `No se ha podido descifrar ${expectedScope}.`,
    );
  }
}
