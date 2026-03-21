import "server-only";

import type {
  LocalAuditEventRecord,
  MailMessage,
  MailSyncRun,
  MailThread,
  MessageConnection,
  MessageRecord,
  MessageThread,
} from "@/lib/types";
import {
  getStructuredLocalMailMessageByExternalId,
  getStructuredLocalMailThreadByExternalKey,
  getStructuredLocalMailThreadById,
  getStructuredLocalMessageConnectionByInboundKey,
  getStructuredLocalMessageRecordByExternalId,
  getStructuredLocalMessageThreadByExternalChat,
  getStructuredLocalMessageThreadById,
  listStructuredLocalMailMessagesForThread,
  listStructuredLocalMailSyncRunsForUser,
  listStructuredLocalMailThreadsForUser,
  listStructuredLocalMessageConnectionsForUser,
  listStructuredLocalMessageRecordsForThread,
  listStructuredLocalMessageThreadsForUser,
  persistStructuredLocalMutation,
  replaceStructuredLocalMailStateForUser,
  replaceStructuredLocalMessagingStateForUser,
} from "@/lib/local-db";

export async function listStructuredMessagingConnections(userId: string) {
  return listStructuredLocalMessageConnectionsForUser(userId);
}

export async function getStructuredMessagingConnectionByInboundKey(
  inboundKey: string,
  channel: MessageConnection["channel"],
) {
  return getStructuredLocalMessageConnectionByInboundKey(inboundKey, channel);
}

export async function listStructuredMessagingThreads(userId: string) {
  return listStructuredLocalMessageThreadsForUser(userId);
}

export async function getStructuredMessagingThreadById(userId: string, threadId: string) {
  return getStructuredLocalMessageThreadById(userId, threadId);
}

export async function getStructuredMessagingThreadByExternalChat(
  userId: string,
  channel: MessageThread["channel"],
  externalChatId: string,
) {
  return getStructuredLocalMessageThreadByExternalChat(userId, channel, externalChatId);
}

export async function listStructuredMessagingRecords(userId: string, threadId: string) {
  return listStructuredLocalMessageRecordsForThread(userId, threadId);
}

export async function getStructuredMessagingRecordByExternalId(
  userId: string,
  channel: MessageRecord["channel"],
  externalMessageId: string,
) {
  return getStructuredLocalMessageRecordByExternalId(userId, channel, externalMessageId);
}

export async function persistStructuredMessagingState({
  messageConnections,
  messageThreads,
  messageRecords,
  auditEvents,
}: {
  messageConnections?: MessageConnection[];
  messageThreads?: MessageThread[];
  messageRecords?: MessageRecord[];
  auditEvents?: LocalAuditEventRecord[];
}) {
  return persistStructuredLocalMutation({
    messageConnections,
    messageThreads,
    messageRecords,
    auditEvents,
  });
}

export async function replaceStructuredMessagingStateForUser({
  userId,
  messageConnections,
  messageThreads,
  messageRecords,
}: {
  userId: string;
  messageConnections: MessageConnection[];
  messageThreads: MessageThread[];
  messageRecords: MessageRecord[];
}) {
  return replaceStructuredLocalMessagingStateForUser({
    userId,
    messageConnections,
    messageThreads,
    messageRecords,
  });
}

export async function listStructuredMailThreads(userId: string) {
  return listStructuredLocalMailThreadsForUser(userId);
}

export async function getStructuredMailThreadById(userId: string, threadId: string) {
  return getStructuredLocalMailThreadById(userId, threadId);
}

export async function getStructuredMailThreadByExternalKey(
  userId: string,
  source: MailThread["source"],
  externalThreadKey: string,
) {
  return getStructuredLocalMailThreadByExternalKey(userId, source, externalThreadKey);
}

export async function listStructuredMailMessages(userId: string, threadId: string) {
  return listStructuredLocalMailMessagesForThread(userId, threadId);
}

export async function getStructuredMailMessageByExternalId(
  userId: string,
  source: MailMessage["source"],
  externalMessageId: string,
) {
  return getStructuredLocalMailMessageByExternalId(userId, source, externalMessageId);
}

export async function listStructuredMailSyncRuns(userId: string, limit = 5) {
  return listStructuredLocalMailSyncRunsForUser(userId, limit);
}

export async function persistStructuredMailState({
  mailThreads,
  mailMessages,
  mailSyncRuns,
}: {
  mailThreads?: MailThread[];
  mailMessages?: MailMessage[];
  mailSyncRuns?: MailSyncRun[];
}) {
  return persistStructuredLocalMutation({
    mailThreads,
    mailMessages,
    mailSyncRuns,
  });
}

export async function replaceStructuredMailStateForUser({
  userId,
  mailThreads,
  mailMessages,
  mailSyncRuns,
}: {
  userId: string;
  mailThreads: MailThread[];
  mailMessages: MailMessage[];
  mailSyncRuns: MailSyncRun[];
}) {
  return replaceStructuredLocalMailStateForUser({
    userId,
    mailThreads,
    mailMessages,
    mailSyncRuns,
  });
}
