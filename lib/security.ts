import path from "node:path";

type UploadRules = {
  label: string;
  maxBytes: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
};

export class UploadValidationError extends Error {}

export const uploadRules = {
  logo: {
    label: "logo",
    maxBytes: 2 * 1024 * 1024,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
    allowedExtensions: ["png", "jpg", "jpeg", "webp"],
  },
  expenseSource: {
    label: "justificante",
    maxBytes: 12 * 1024 * 1024,
    allowedMimeTypes: [
      "application/pdf",
      "text/plain",
      "image/png",
      "image/jpeg",
      "image/webp",
    ],
    allowedExtensions: ["pdf", "txt", "png", "jpg", "jpeg", "webp"],
  },
  studySource: {
    label: "documento de estudio",
    maxBytes: 12 * 1024 * 1024,
    allowedMimeTypes: [
      "application/pdf",
      "text/plain",
      "text/markdown",
      "text/x-markdown",
      "",
    ],
    allowedExtensions: ["pdf", "txt", "md", "markdown"],
  },
  backupJson: {
    label: "backup",
    maxBytes: 10 * 1024 * 1024,
    allowedMimeTypes: ["application/json", "text/json", ""],
    allowedExtensions: ["json"],
  },
} satisfies Record<string, UploadRules>;

function getFileExtension(fileName: string) {
  return path.extname(fileName).replace(".", "").toLowerCase();
}

export function sanitizeFileName(fileName: string) {
  return path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, "-");
}

export function assertAllowedUpload(file: File, rules: UploadRules) {
  if (file.size <= 0) {
    throw new UploadValidationError(`El ${rules.label} no contiene datos.`);
  }

  if (file.size > rules.maxBytes) {
    throw new UploadValidationError(
      `El ${rules.label} supera el límite de ${Math.round(
        rules.maxBytes / (1024 * 1024),
      )} MB.`,
    );
  }

  const extension = getFileExtension(file.name);

  if (!rules.allowedExtensions.includes(extension)) {
    throw new UploadValidationError(
      `El ${rules.label} debe estar en uno de estos formatos: ${rules.allowedExtensions.join(", ")}.`,
    );
  }

  if (file.type && !rules.allowedMimeTypes.includes(file.type)) {
    throw new UploadValidationError(
      `El tipo MIME del ${rules.label} no está permitido: ${file.type}.`,
    );
  }
}

export function getSecurityHeaders() {
  return [
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
    },
    {
      key: "Content-Security-Policy",
      value: [
        "default-src 'self'",
        "base-uri 'self'",
        "frame-ancestors 'none'",
        "object-src 'none'",
        "img-src 'self' data: blob: https:",
        "font-src 'self' data:",
        "style-src 'self' 'unsafe-inline'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "connect-src 'self' https: http: ws: wss:",
        "form-action 'self'",
      ].join("; "),
    },
  ];
}
