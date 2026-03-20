import { cache } from "react";

import {
  demoMessageConnections,
  demoMessageRecords,
  demoMessageThreads,
  getDemoThreadById,
  isDemoMode,
  isLocalFileMode,
} from "@/lib/demo";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  MessageChannel,
  MessageConnection,
  MessageRecord,
  MessageSortKey,
  MessageThread,
  MessageUrgency,
} from "@/lib/types";

type MessageInboxFilters = {
  q?: string;
  channel?: "all" | MessageChannel;
  urgency?: "all" | MessageUrgency;
  sort?: MessageSortKey;
};

type ParsedInboundMessage = {
  channel: MessageChannel;
  externalChatId: string;
  externalContactId: string | null;
  externalMessageId: string | null;
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  phone: string | null;
  telegramUsername: string | null;
  body: string;
  messageType: string;
  senderName: string | null;
  receivedAt: string;
  rawPayload: Record<string, unknown>;
};

const HIGH_URGENCY_PATTERNS = [
  "urgente",
  "urgencia",
  "hoy",
  "ahora",
  "cuanto antes",
  "lo antes posible",
  "asap",
  "vencid",
  "problema",
  "error",
  "incidencia",
  "pago pendiente",
  "no funciona",
  "esta tarde",
];

const MEDIUM_URGENCY_PATTERNS = [
  "mañana",
  "esta semana",
  "presupuesto",
  "factura",
  "propuesta",
  "contrato",
  "revisión",
  "revisar",
  "confirmar",
  "cuando puedas",
];

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function normalizeSearchValue(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function splitDisplayName(value: string | null | undefined) {
  const cleaned = value?.trim().replace(/\s+/g, " ") ?? "";

  if (!cleaned) {
    return {
      firstName: null,
      lastName: null,
      fullName: "Contacto sin nombre",
    };
  }

  const segments = cleaned.split(" ");
  const firstName = segments[0] ?? null;
  const lastName = segments.length > 1 ? segments.slice(1).join(" ") : null;

  return {
    firstName,
    lastName,
    fullName: cleaned,
  };
}

function formatIncomingPlaceholder(messageType: string) {
  return {
    image: "[Imagen recibida]",
    audio: "[Audio recibido]",
    video: "[Vídeo recibido]",
    document: "[Documento recibido]",
    sticker: "[Sticker recibido]",
    location: "[Ubicación recibida]",
    contact: "[Contacto recibido]",
  }[messageType] ?? "[Mensaje recibido]";
}

export function getUrgencyMeta(text: string) {
  const normalized = normalizeSearchValue(text);

  if (HIGH_URGENCY_PATTERNS.some((pattern) => normalized.includes(pattern))) {
    return { urgency: "high" as const, score: 90 };
  }

  if (MEDIUM_URGENCY_PATTERNS.some((pattern) => normalized.includes(pattern))) {
    return { urgency: "medium" as const, score: 60 };
  }

  return { urgency: "low" as const, score: 20 };
}

export function getUrgencyLabel(urgency: MessageUrgency) {
  return {
    high: "Alta",
    medium: "Media",
    low: "Baja",
  }[urgency];
}

export function getChannelLabel(channel: MessageChannel) {
  return channel === "whatsapp" ? "WhatsApp" : "Telegram";
}

export function buildMessagingWebhookUrl(
  channel: MessageChannel,
  inboundKey: string,
) {
  return `${getAppUrl()}/api/integrations/${channel}/${inboundKey}`;
}

function sortThreads(threads: MessageThread[], sort: MessageSortKey) {
  const sorted = [...threads];

  if (sort === "urgency") {
    sorted.sort((a, b) => {
      if (b.urgency_score !== a.urgency_score) {
        return b.urgency_score - a.urgency_score;
      }

      return (
        new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
      );
    });

    return sorted;
  }

  if (sort === "name") {
    sorted.sort((a, b) => {
      const firstNameComparison = (a.first_name ?? a.full_name).localeCompare(
        b.first_name ?? b.full_name,
        "es",
        { sensitivity: "base" },
      );

      if (firstNameComparison !== 0) {
        return firstNameComparison;
      }

      const lastNameComparison = (a.last_name ?? "").localeCompare(
        b.last_name ?? "",
        "es",
        { sensitivity: "base" },
      );

      if (lastNameComparison !== 0) {
        return lastNameComparison;
      }

      return (
        new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
      );
    });

    return sorted;
  }

  if (sort === "surname") {
    sorted.sort((a, b) => {
      const lastNameComparison = (a.last_name ?? a.full_name).localeCompare(
        b.last_name ?? b.full_name,
        "es",
        { sensitivity: "base" },
      );

      if (lastNameComparison !== 0) {
        return lastNameComparison;
      }

      const firstNameComparison = (a.first_name ?? "").localeCompare(
        b.first_name ?? "",
        "es",
        { sensitivity: "base" },
      );

      if (firstNameComparison !== 0) {
        return firstNameComparison;
      }

      return (
        new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
      );
    });

    return sorted;
  }

  sorted.sort(
    (a, b) =>
      new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime(),
  );
  return sorted;
}

function applyInboxFilters(
  threads: MessageThread[],
  {
    q = "",
    channel = "all",
    urgency = "all",
    sort = "recent",
  }: Required<MessageInboxFilters>,
) {
  const query = normalizeSearchValue(q);

  const filtered = threads.filter((thread) => {
    if (channel !== "all" && thread.channel !== channel) {
      return false;
    }

    if (urgency !== "all" && thread.urgency !== urgency) {
      return false;
    }

    if (!query) {
      return true;
    }

    return [
      thread.full_name,
      thread.first_name,
      thread.last_name,
      thread.phone,
      thread.telegram_username,
      thread.last_message_preview,
    ]
      .filter(Boolean)
      .some((value) => normalizeSearchValue(String(value)).includes(query));
  });

  return sortThreads(filtered, sort);
}

function getDefaultConnectionLabel(channel: MessageChannel) {
  return channel === "whatsapp"
    ? "WhatsApp Business"
    : "Bot de Telegram";
}

function buildLocalMessageConnection(
  userId: string,
  channel: MessageChannel,
): MessageConnection {
  const timestamp = "2026-03-20T00:00:00.000Z";
  const suffix = `${userId}-${channel}`.replace(/[^a-zA-Z0-9]/g, "").slice(-18) || channel;

  return {
    id: `local-${channel}-${userId}`,
    user_id: userId,
    channel,
    label: getDefaultConnectionLabel(channel),
    status: "draft",
    inbound_key: `local-${channel}-${suffix}`,
    verify_token: `local-verify-${suffix}`,
    metadata: {
      localMode: true,
    },
    created_at: timestamp,
    updated_at: timestamp,
  };
}

async function ensureSingleConnection(
  userId: string,
  channel: MessageChannel,
): Promise<MessageConnection> {
  if (isDemoMode()) {
    return (
      demoMessageConnections.find(
        (connection) =>
          connection.user_id === userId && connection.channel === channel,
      ) ?? demoMessageConnections[0]
    );
  }

  if (isLocalFileMode()) {
    return buildLocalMessageConnection(userId, channel);
  }

  const supabase = await createServerSupabaseClient();
  const { data: existing } = await supabase
    .from("message_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("channel", channel)
    .maybeSingle();

  if (existing) {
    return existing as MessageConnection;
  }

  const { data: created, error } = await supabase
    .from("message_connections")
    .insert({
      user_id: userId,
      channel,
      label: getDefaultConnectionLabel(channel),
    })
    .select("*")
    .single();

  if (error || !created) {
    throw new Error(`No se ha podido preparar la conexión de ${getChannelLabel(channel)}.`);
  }

  return created as MessageConnection;
}

export const ensureMessageConnections = cache(async (userId: string) => {
  const [whatsapp, telegram] = await Promise.all([
    ensureSingleConnection(userId, "whatsapp"),
    ensureSingleConnection(userId, "telegram"),
  ]);

  return { whatsapp, telegram };
});

export async function getCurrentMessageConnections(userId: string) {
  if (isDemoMode()) {
    return {
      whatsapp: demoMessageConnections.find(
        (connection) => connection.channel === "whatsapp",
      )!,
      telegram: demoMessageConnections.find(
        (connection) => connection.channel === "telegram",
      )!,
    };
  }

  if (isLocalFileMode()) {
    return {
      whatsapp: buildLocalMessageConnection(userId, "whatsapp"),
      telegram: buildLocalMessageConnection(userId, "telegram"),
    };
  }

  return ensureMessageConnections(userId);
}

export async function getMessageThreadsForUser(
  userId: string,
  filters: MessageInboxFilters = {},
) {
  const safeFilters: Required<MessageInboxFilters> = {
    q: filters.q ?? "",
    channel: filters.channel ?? "all",
    urgency: filters.urgency ?? "all",
    sort: filters.sort ?? "recent",
  };

  if (isDemoMode()) {
    return applyInboxFilters(
      demoMessageThreads.filter((thread) => thread.user_id === userId),
      safeFilters,
    );
  }

  if (isLocalFileMode()) {
    return applyInboxFilters([], safeFilters);
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("message_threads")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    throw new Error("No se ha podido cargar la bandeja de mensajes.");
  }

  return applyInboxFilters((data as MessageThread[] | null) ?? [], safeFilters);
}

export async function getThreadMessagesForUser(userId: string, threadId: string) {
  if (isDemoMode()) {
    return demoMessageRecords
      .filter((message) => message.user_id === userId && message.thread_id === threadId)
      .sort(
        (a, b) =>
          new Date(a.received_at).getTime() - new Date(b.received_at).getTime(),
      );
  }

  if (isLocalFileMode()) {
    return [];
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("message_messages")
    .select("*")
    .eq("user_id", userId)
    .eq("thread_id", threadId)
    .order("received_at", { ascending: true });

  if (error) {
    throw new Error("No se han podido cargar los mensajes de este cliente.");
  }

  return (data as MessageRecord[] | null) ?? [];
}

export async function getThreadForUser(userId: string, threadId: string) {
  if (isDemoMode()) {
    return getDemoThreadById(threadId);
  }

  if (isLocalFileMode()) {
    return null;
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("message_threads")
    .select("*")
    .eq("user_id", userId)
    .eq("id", threadId)
    .maybeSingle();

  if (error) {
    throw new Error("No se ha podido abrir la conversación.");
  }

  return (data as MessageThread | null) ?? null;
}

export function parseTelegramMessage(payload: Record<string, unknown>) {
  const message = payload.message as
    | {
        message_id?: number;
        date?: number;
        text?: string;
        caption?: string;
        chat?: { id?: number | string };
        from?: {
          first_name?: string;
          last_name?: string;
          username?: string;
        };
        photo?: unknown[];
        document?: unknown;
        audio?: unknown;
        voice?: unknown;
        video?: unknown;
        sticker?: unknown;
      }
    | undefined;

  if (!message?.chat?.id) {
    return null;
  }

  const inferredType =
    typeof message.text === "string"
      ? "text"
      : message.photo
        ? "image"
        : message.document
          ? "document"
          : message.audio || message.voice
            ? "audio"
            : message.video
              ? "video"
              : message.sticker
                ? "sticker"
                : "text";

  const body =
    message.text ??
    message.caption ??
    formatIncomingPlaceholder(inferredType);
  const fullNameParts = splitDisplayName(
    [message.from?.first_name, message.from?.last_name].filter(Boolean).join(" "),
  );

  return {
    channel: "telegram" as const,
    externalChatId: String(message.chat.id),
    externalContactId: message.from?.username
      ? `tg_${message.from.username}`
      : `tg_${String(message.chat.id)}`,
    externalMessageId:
      typeof message.message_id === "number" ? String(message.message_id) : null,
    firstName: fullNameParts.firstName,
    lastName: fullNameParts.lastName,
    fullName: fullNameParts.fullName,
    phone: null,
    telegramUsername: message.from?.username ?? null,
    body,
    messageType: inferredType,
    senderName: fullNameParts.fullName,
    receivedAt: new Date((message.date ?? Date.now() / 1000) * 1000).toISOString(),
    rawPayload: payload,
  } satisfies ParsedInboundMessage;
}

export function parseWhatsAppMessage(
  payload: Record<string, unknown>,
  value: Record<string, unknown>,
  message: Record<string, unknown>,
) {
  const contacts = Array.isArray(value.contacts)
    ? (value.contacts as Record<string, unknown>[])
    : [];
  const from = String(message.from ?? "");

  if (!from) {
    return null;
  }

  const contact =
    contacts.find((item) => String(item.wa_id ?? "") === from) ?? contacts[0];
  const profileName = String(
    (contact?.profile as Record<string, unknown> | undefined)?.name ?? from,
  );
  const nameParts = splitDisplayName(profileName);
  const messageType = String(message.type ?? "text");
  const body =
    messageType === "text"
      ? String(
          ((message.text as Record<string, unknown> | undefined)?.body as
            | string
            | undefined) ?? "",
        ) || formatIncomingPlaceholder(messageType)
      : String(
          ((message[messageType] as Record<string, unknown> | undefined)?.caption as
            | string
            | undefined) ?? "",
        ) || formatIncomingPlaceholder(messageType);

  return {
    channel: "whatsapp" as const,
    externalChatId: from,
    externalContactId: `wa_${from}`,
    externalMessageId: String(message.id ?? "") || null,
    firstName: nameParts.firstName,
    lastName: nameParts.lastName,
    fullName: nameParts.fullName,
    phone: from,
    telegramUsername: null,
    body,
    messageType,
    senderName: nameParts.fullName,
    receivedAt: new Date(
      Number(String(message.timestamp ?? Date.now() / 1000)) * 1000,
    ).toISOString(),
    rawPayload: payload,
  } satisfies ParsedInboundMessage;
}

async function getConnectionByInboundKey(
  inboundKey: string,
  channel: MessageChannel,
) {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("message_connections")
    .select("*")
    .eq("channel", channel)
    .eq("inbound_key", inboundKey)
    .maybeSingle();

  if (error) {
    throw new Error(`No se ha podido localizar la conexión de ${getChannelLabel(channel)}.`);
  }

  return (data as MessageConnection | null) ?? null;
}

async function upsertInboundMessage(
  connection: MessageConnection,
  parsedMessage: ParsedInboundMessage,
) {
  const supabase = createAdminSupabaseClient();
  const { urgency, score } = getUrgencyMeta(parsedMessage.body);
  const preview = parsedMessage.body.slice(0, 180);
  const { data: existingThread } = await supabase
    .from("message_threads")
    .select("*")
    .eq("user_id", connection.user_id)
    .eq("channel", parsedMessage.channel)
    .eq("external_chat_id", parsedMessage.externalChatId)
    .maybeSingle();

  let thread = existingThread as MessageThread | null;

  if (!thread) {
    const { data: createdThread, error } = await supabase
      .from("message_threads")
      .insert({
        user_id: connection.user_id,
        connection_id: connection.id,
        channel: parsedMessage.channel,
        external_chat_id: parsedMessage.externalChatId,
        external_contact_id: parsedMessage.externalContactId,
        first_name: parsedMessage.firstName,
        last_name: parsedMessage.lastName,
        full_name: parsedMessage.fullName,
        phone: parsedMessage.phone,
        telegram_username: parsedMessage.telegramUsername,
        urgency,
        urgency_score: score,
        unread_count: 1,
        last_message_preview: preview,
        last_message_direction: "inbound",
        last_message_at: parsedMessage.receivedAt,
      })
      .select("*")
      .single();

    if (error || !createdThread) {
      throw new Error("No se ha podido crear la conversación del cliente.");
    }

    thread = createdThread as MessageThread;
  } else {
    const nextUrgency =
      thread.urgency_locked && thread.urgency ? thread.urgency : urgency;
    const nextUrgencyScore = thread.urgency_locked
      ? thread.urgency_score
      : Math.max(thread.urgency_score, score);

    const { data: updatedThread, error } = await supabase
      .from("message_threads")
      .update({
        connection_id: connection.id,
        external_contact_id:
          parsedMessage.externalContactId ?? thread.external_contact_id,
        first_name: parsedMessage.firstName ?? thread.first_name,
        last_name: parsedMessage.lastName ?? thread.last_name,
        full_name: parsedMessage.fullName || thread.full_name,
        phone: parsedMessage.phone ?? thread.phone,
        telegram_username: parsedMessage.telegramUsername ?? thread.telegram_username,
        urgency: nextUrgency,
        urgency_score: nextUrgencyScore,
        unread_count: thread.unread_count + 1,
        last_message_preview: preview,
        last_message_direction: "inbound",
        last_message_at: parsedMessage.receivedAt,
      })
      .eq("id", thread.id)
      .select("*")
      .single();

    if (error || !updatedThread) {
      throw new Error("No se ha podido actualizar la conversación del cliente.");
    }

    thread = updatedThread as MessageThread;
  }

  if (parsedMessage.externalMessageId) {
    const { data: existingMessage } = await supabase
      .from("message_messages")
      .select("id")
      .eq("user_id", connection.user_id)
      .eq("channel", parsedMessage.channel)
      .eq("external_message_id", parsedMessage.externalMessageId)
      .maybeSingle();

    if (existingMessage) {
      return thread;
    }
  }

  const { error: insertMessageError } = await supabase
    .from("message_messages")
    .insert({
      user_id: connection.user_id,
      thread_id: thread.id,
      channel: parsedMessage.channel,
      external_message_id: parsedMessage.externalMessageId,
      direction: "inbound",
      sender_name: parsedMessage.senderName,
      body: parsedMessage.body,
      message_type: parsedMessage.messageType,
      received_at: parsedMessage.receivedAt,
      raw_payload: parsedMessage.rawPayload,
    });

  if (insertMessageError) {
    throw new Error("No se ha podido guardar el mensaje entrante.");
  }

  await supabase
    .from("message_connections")
    .update({
      status: "active",
    })
    .eq("id", connection.id);

  return thread;
}

export async function ingestTelegramWebhook(
  inboundKey: string,
  payload: Record<string, unknown>,
) {
  const connection = await getConnectionByInboundKey(inboundKey, "telegram");

  if (!connection) {
    return { ok: false as const, reason: "missing_connection" };
  }

  const parsedMessage = parseTelegramMessage(payload);

  if (!parsedMessage) {
    return { ok: true as const, stored: 0 };
  }

  await upsertInboundMessage(connection, parsedMessage);
  return { ok: true as const, stored: 1 };
}

export async function verifyWhatsAppConnection(
  inboundKey: string,
  verifyToken: string | null,
) {
  const connection = await getConnectionByInboundKey(inboundKey, "whatsapp");

  if (!connection) {
    return false;
  }

  const matches = connection.verify_token === verifyToken;

  if (matches) {
    const supabase = createAdminSupabaseClient();
    await supabase
      .from("message_connections")
      .update({ status: "active" })
      .eq("id", connection.id);
  }

  return matches;
}

export async function ingestWhatsAppWebhook(
  inboundKey: string,
  payload: Record<string, unknown>,
) {
  const connection = await getConnectionByInboundKey(inboundKey, "whatsapp");

  if (!connection) {
    return { ok: false as const, reason: "missing_connection" };
  }

  const entries = Array.isArray(payload.entry)
    ? (payload.entry as Record<string, unknown>[])
    : [];
  let stored = 0;

  for (const entry of entries) {
    const changes = Array.isArray(entry.changes)
      ? (entry.changes as Record<string, unknown>[])
      : [];

    for (const change of changes) {
      const value =
        (change.value as Record<string, unknown> | undefined) ?? {};
      const messages = Array.isArray(value.messages)
        ? (value.messages as Record<string, unknown>[])
        : [];

      for (const message of messages) {
        const parsedMessage = parseWhatsAppMessage(payload, value, message);

        if (!parsedMessage) {
          continue;
        }

        await upsertInboundMessage(connection, parsedMessage);
        stored += 1;
      }
    }
  }

  return { ok: true as const, stored };
}
