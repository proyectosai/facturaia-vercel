import "server-only";

import type { FeedbackEntryRecord } from "@/lib/types";
import {
  listStructuredLocalFeedbackEntriesForUser,
  persistStructuredLocalMutation,
  replaceStructuredLocalFeedbackEntriesForUser,
} from "@/lib/local-db";

export async function listStructuredFeedbackRepositoryRecords(userId: string) {
  return listStructuredLocalFeedbackEntriesForUser(userId);
}

export async function saveStructuredFeedbackRepositoryRecord(
  entry: FeedbackEntryRecord,
) {
  const saved = await persistStructuredLocalMutation({
    feedbackEntries: [entry],
  });

  return saved ? entry : null;
}

export async function replaceStructuredFeedbackRepositoryRecords(
  userId: string,
  feedbackEntries: FeedbackEntryRecord[],
) {
  return replaceStructuredLocalFeedbackEntriesForUser(userId, feedbackEntries);
}
