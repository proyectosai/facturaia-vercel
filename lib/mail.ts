import "server-only";

import nodemailer from "nodemailer";
import { z } from "zod";

import { getResendClient } from "@/lib/resend";

const resendSchema = z.object({
  RESEND_API_KEY: z.string().min(1),
  RESEND_FROM_EMAIL: z.string().min(1),
});

const smtpSchema = z.object({
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
  SMTP_USERNAME: z.string().min(1),
  SMTP_PASSWORD: z.string().min(1),
  SMTP_FROM_EMAIL: z.string().min(1),
});

export type OutboundMailConfig =
  | {
      provider: "resend";
      fromEmail: string;
    }
  | {
      provider: "smtp";
      host: string;
      port: number;
      secure: boolean;
      username: string;
      password: string;
      fromEmail: string;
    };

export type OutboundMailStatus = {
  configured: boolean;
  providerLabel: string;
  fromLabel: string;
  detail: string;
};

export type TransactionalMailAttachment = {
  filename: string;
  content: Buffer;
};

export type TransactionalMailPayload = {
  to: string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  attachments?: TransactionalMailAttachment[];
};

function hasResendConfig() {
  return Boolean(process.env.RESEND_API_KEY) && Boolean(process.env.RESEND_FROM_EMAIL);
}

function hasSmtpConfig() {
  return (
    Boolean(process.env.SMTP_HOST) &&
    Boolean(process.env.SMTP_USERNAME) &&
    Boolean(process.env.SMTP_PASSWORD) &&
    Boolean(process.env.SMTP_FROM_EMAIL)
  );
}

function resolveMailProviderPreference() {
  const explicit = process.env.MAIL_PROVIDER?.trim().toLowerCase();

  if (explicit === "smtp" || explicit === "resend") {
    return explicit;
  }

  if (hasSmtpConfig()) {
    return "smtp";
  }

  if (hasResendConfig()) {
    return "resend";
  }

  return null;
}

export function getOutboundMailConfig(): OutboundMailConfig | null {
  const provider = resolveMailProviderPreference();

  if (!provider) {
    return null;
  }

  if (provider === "smtp") {
    let parsed: z.infer<typeof smtpSchema>;

    try {
      parsed = smtpSchema.parse({
        SMTP_HOST: process.env.SMTP_HOST,
        SMTP_PORT: process.env.SMTP_PORT,
        SMTP_SECURE: process.env.SMTP_SECURE,
        SMTP_USERNAME: process.env.SMTP_USERNAME,
        SMTP_PASSWORD: process.env.SMTP_PASSWORD,
        SMTP_FROM_EMAIL: process.env.SMTP_FROM_EMAIL,
      });
    } catch {
      throw new Error(
        "La configuración SMTP está incompleta. Revisa host, puerto, usuario, contraseña y remitente.",
      );
    }

    return {
      provider: "smtp",
      host: parsed.SMTP_HOST,
      port: parsed.SMTP_PORT,
      secure: parsed.SMTP_SECURE ?? parsed.SMTP_PORT === 465,
      username: parsed.SMTP_USERNAME,
      password: parsed.SMTP_PASSWORD,
      fromEmail: parsed.SMTP_FROM_EMAIL,
    };
  }

  let parsed: z.infer<typeof resendSchema>;

  try {
    parsed = resendSchema.parse({
      RESEND_API_KEY: process.env.RESEND_API_KEY,
      RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
    });
  } catch {
    throw new Error(
      "La configuración de Resend está incompleta. Revisa la API key y el remitente.",
    );
  }

  return {
    provider: "resend",
    fromEmail: parsed.RESEND_FROM_EMAIL,
  };
}

export function getOutboundMailStatusSummary(): OutboundMailStatus {
  try {
    const config = getOutboundMailConfig();

    if (!config) {
      return {
        configured: false,
        providerLabel: "No configurado",
        fromLabel: "Sin remitente",
        detail:
          "Activa SMTP o Resend para enviar facturas y correos de prueba desde FacturaIA.",
      };
    }

    if (config.provider === "smtp") {
      return {
        configured: true,
        providerLabel: "SMTP",
        fromLabel: config.fromEmail,
        detail: `${config.host}:${config.port} · usuario ${config.username}`,
      };
    }

    return {
      configured: true,
      providerLabel: "Resend",
      fromLabel: config.fromEmail,
      detail: "Proveedor transaccional externo listo para usar.",
    };
  } catch {
    return {
      configured: false,
      providerLabel: "Configuración incompleta",
      fromLabel: "Sin remitente",
      detail: "Revisa las variables de entorno del módulo de correo saliente.",
    };
  }
}

export async function sendTransactionalEmail(payload: TransactionalMailPayload) {
  const config = getOutboundMailConfig();

  if (!config) {
    throw new Error(
      "El módulo de correo saliente no está configurado. Activa SMTP o Resend primero.",
    );
  }

  if (config.provider === "smtp") {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.username,
        pass: config.password,
      },
    });

    await transporter.sendMail({
      from: config.fromEmail,
      to: payload.to.join(", "),
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      replyTo: payload.replyTo,
      attachments: payload.attachments,
    });

    return {
      provider: "smtp" as const,
      fromEmail: config.fromEmail,
    };
  }

  const resend = getResendClient();
  const { error } = await resend.emails.send({
    from: config.fromEmail,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
    replyTo: payload.replyTo,
    attachments: payload.attachments,
  });

  if (error) {
    throw new Error("El proveedor de correo no ha podido enviar el mensaje.");
  }

  return {
    provider: "resend" as const,
    fromEmail: config.fromEmail,
  };
}
