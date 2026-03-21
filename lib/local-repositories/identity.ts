import "server-only";

import type {
  AppUserRecord,
  LocalAuditEventRecord,
  LocalAuthRateLimitRecord,
  Profile,
} from "@/lib/types";
import {
  getStructuredLocalAuthRateLimitById,
  getStructuredLocalFirstUser,
  getStructuredLocalUserByEmail,
  getStructuredLocalUserById,
  getStructuredLocalUserCount,
  persistStructuredLocalMutation,
  replaceStructuredLocalAuthRateLimitsForEmail,
} from "@/lib/local-db";

export async function getStructuredIdentityRepositoryUserCount() {
  return getStructuredLocalUserCount();
}

export async function getStructuredIdentityRepositoryFirstUser() {
  return getStructuredLocalFirstUser();
}

export async function getStructuredIdentityRepositoryUserById(userId: string) {
  return getStructuredLocalUserById(userId);
}

export async function getStructuredIdentityRepositoryUserByEmail(email: string) {
  return getStructuredLocalUserByEmail(email);
}

export async function getStructuredIdentityRepositoryAuthRateLimitById(
  rateLimitId: string,
) {
  return getStructuredLocalAuthRateLimitById(rateLimitId);
}

export async function saveStructuredIdentityRepositoryState({
  user,
  profile,
  authRateLimit,
  auditEvents,
}: {
  user?: (AppUserRecord & { password_hash: string }) | null;
  profile?: Profile | null;
  authRateLimit?: LocalAuthRateLimitRecord | null;
  auditEvents?: LocalAuditEventRecord[];
}) {
  return persistStructuredLocalMutation({
    users: user ? [user] : [],
    profiles: profile ? [profile] : [],
    authRateLimits: authRateLimit ? [authRateLimit] : [],
    auditEvents: auditEvents ?? [],
  });
}

export async function replaceStructuredIdentityRepositoryAuthRateLimits(
  emailKey: string,
  authRateLimits: LocalAuthRateLimitRecord[],
) {
  return replaceStructuredLocalAuthRateLimitsForEmail(emailKey, authRateLimits);
}
