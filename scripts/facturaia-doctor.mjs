import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const cwd = process.cwd();

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const result = {};

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "");
    result[key] = value;
  }

  return result;
}

function loadMergedEnv() {
  const files = [".env", ".env.local", ".env.development.local"];
  const merged = {};

  for (const file of files) {
    Object.assign(merged, parseEnvFile(path.join(cwd, file)));
  }

  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === "string") {
      merged[key] = value;
    }
  }

  return merged;
}

function getMissingKeys(env, keys) {
  return keys.filter((key) => !String(env[key] ?? "").trim());
}

function printCheck(title, missing, note) {
  const ready = missing.length === 0;
  const marker = ready ? "OK" : "WARN";

  console.log(`- [${marker}] ${title}`);

  if (note) {
    console.log(`  ${note}`);
  }

  if (!ready) {
    console.log(`  Faltan: ${missing.join(", ")}`);
  }
}

const env = loadMergedEnv();
const nodeMajor = Number(process.versions.node.split(".")[0] ?? "0");
const localModeEnabled = String(env.FACTURAIA_LOCAL_MODE ?? "").trim() === "1";
const encryptLocalData = String(env.FACTURAIA_ENCRYPT_LOCAL_DATA ?? "").trim() === "1";
const encryptBackups = String(env.FACTURAIA_ENCRYPT_BACKUPS ?? "").trim() === "1";
const localSessionMaxAgeHours = Number(env.FACTURAIA_LOCAL_SESSION_MAX_AGE_HOURS ?? "168");
const localLoginMaxAttempts = Number(env.FACTURAIA_LOCAL_LOGIN_MAX_ATTEMPTS ?? "5");
const localLoginLockoutMinutes = Number(env.FACTURAIA_LOCAL_LOGIN_LOCKOUT_MINUTES ?? "15");
const encryptionPassphraseMissing =
  (encryptLocalData || encryptBackups)
    ? getMissingKeys(env, ["FACTURAIA_ENCRYPTION_PASSPHRASE"])
    : [];
const supabaseMissing = getMissingKeys(env, [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
]);
const appUrlMissing = getMissingKeys(env, ["NEXT_PUBLIC_APP_URL"]);
const lmStudioMissing = getMissingKeys(env, ["LM_STUDIO_BASE_URL", "LM_STUDIO_MODEL"]);
const ollamaOcrMissing = getMissingKeys(env, ["OLLAMA_BASE_URL", "OLLAMA_OCR_MODEL"]);

const mailProvider = String(env.MAIL_PROVIDER || "").trim().toLowerCase();
const smtpMissing =
  mailProvider === "smtp"
    ? getMissingKeys(env, [
        "SMTP_HOST",
        "SMTP_PORT",
        "SMTP_USERNAME",
        "SMTP_PASSWORD",
        "SMTP_FROM_EMAIL",
      ])
    : [];
const resendMissing =
  mailProvider === "resend"
    ? getMissingKeys(env, ["RESEND_API_KEY", "RESEND_FROM_EMAIL"])
    : [];

const inboundProvider = String(env.INBOUND_MAIL_PROVIDER || "").trim().toLowerCase();
const imapMissing =
  inboundProvider === "imap"
    ? getMissingKeys(env, ["IMAP_HOST", "IMAP_PORT", "IMAP_USERNAME", "IMAP_PASSWORD"])
    : [];

const remoteBackupProvider = String(env.REMOTE_BACKUP_PROVIDER || "").trim().toLowerCase();
const webdavMissing =
  remoteBackupProvider === "webdav"
    ? getMissingKeys(env, [
        "WEBDAV_BASE_URL",
        "WEBDAV_USERNAME",
        "WEBDAV_PASSWORD",
        "WEBDAV_BACKUP_PATH",
      ])
    : [];

const criticalMissing = localModeEnabled
  ? [...appUrlMissing, ...getMissingKeys(env, ["FACTURAIA_LOCAL_SESSION_SECRET"])]
  : [...appUrlMissing, ...supabaseMissing];

console.log("");
console.log("FacturaIA doctor");
console.log("=================");
console.log(`Proyecto: ${cwd}`);
console.log(`Node.js: ${process.versions.node}`);
console.log(`Modo local: ${localModeEnabled ? "sí" : "no"}`);
console.log("");

console.log("- [INFO] Recomendado Node 20 o superior");
if (nodeMajor < 20) {
  console.log("  Tu versión actual es inferior a 20 y puede dar problemas con Next 15.");
}

printCheck("URL pública", appUrlMissing, "Base para enlaces mágicos, QR y rutas públicas.");
if (localModeEnabled) {
  printCheck(
    "Sesión local",
    getMissingKeys(env, ["FACTURAIA_LOCAL_SESSION_SECRET"]),
    "Necesaria para autenticación privada en instalación 100% local.",
  );
  console.log("- [INFO] Política de acceso local");
  console.log(
    `  Sesión: ${Number.isFinite(localSessionMaxAgeHours) ? localSessionMaxAgeHours : 168} h · Intentos: ${Number.isFinite(localLoginMaxAttempts) ? localLoginMaxAttempts : 5} · Bloqueo: ${Number.isFinite(localLoginLockoutMinutes) ? localLoginLockoutMinutes : 15} min`,
  );
  console.log("- [INFO] Supabase");
  console.log("  En modo local no es obligatorio para el núcleo privado de facturación.");
  if (encryptLocalData || encryptBackups) {
    printCheck(
      "Cifrado opcional",
      encryptionPassphraseMissing,
      "Necesario si quieres cifrar el fichero local o los backups JSON.",
    );
  } else {
    console.log("- [INFO] Cifrado opcional");
    console.log("  Define FACTURAIA_ENCRYPT_LOCAL_DATA=1 o FACTURAIA_ENCRYPT_BACKUPS=1 si quieres activarlo.");
  }
} else {
  printCheck(
    "Supabase",
    supabaseMissing,
    "Necesario para auth, base de datos, storage y módulos persistentes.",
  );
}
printCheck(
  "LM Studio",
  lmStudioMissing,
  "Opcional, pero recomendado para documentos y ayudas con IA local.",
);
printCheck(
  "Ollama OCR",
  ollamaOcrMissing,
  "Opcional para OCR automático de tickets e imágenes de gastos con GLM-OCR.",
);

if (mailProvider === "smtp" || mailProvider === "resend") {
  printCheck(
    `Correo saliente (${mailProvider})`,
    mailProvider === "smtp" ? smtpMissing : resendMissing,
    "Requerido para envío de facturas y recordatorios por email.",
  );
} else {
  console.log("- [INFO] Correo saliente");
  console.log("  Define MAIL_PROVIDER=smtp o MAIL_PROVIDER=resend si quieres usar envíos reales.");
}

if (inboundProvider === "imap") {
  printCheck("Correo entrante (IMAP)", imapMissing, "Opcional para bandeja interna y sincronización manual.");
} else {
  console.log("- [INFO] Correo entrante");
  console.log("  Define INBOUND_MAIL_PROVIDER=imap si quieres activar la bandeja IMAP.");
}

if (remoteBackupProvider === "webdav") {
  printCheck("Backup remoto WebDAV", webdavMissing, "Opcional para enviar snapshots a Nextcloud o WebDAV.");
} else {
  console.log("- [INFO] Backup remoto");
  console.log("  Define REMOTE_BACKUP_PROVIDER=webdav si quieres sincronización externa.");
}

console.log("");
if (criticalMissing.length > 0 || nodeMajor < 20) {
  console.log("Resultado: hay pasos pendientes antes de usar FacturaIA con datos reales.");
  process.exitCode = 1;
} else {
  console.log("Resultado: la base crítica del entorno está lista.");
}
