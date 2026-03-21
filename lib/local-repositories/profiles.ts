import "server-only";

import type { LocalAuditEventRecord, Profile } from "@/lib/types";
import {
  getStructuredLocalProfileById,
  persistStructuredLocalMutation,
} from "@/lib/local-db";

export async function getStructuredProfileRepositoryRecord(userId: string) {
  return getStructuredLocalProfileById(userId);
}

export async function saveStructuredProfileRepositoryRecord({
  profile,
  auditEvent,
}: {
  profile: Profile;
  auditEvent?: LocalAuditEventRecord | null;
}) {
  const saved = await persistStructuredLocalMutation({
    profiles: [profile],
    auditEvents: auditEvent ? [auditEvent] : [],
  });

  return saved ? profile : null;
}
