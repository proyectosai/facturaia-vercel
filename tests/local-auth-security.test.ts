import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  authenticateLocalUser,
  ensureInitialLocalUser,
  getLocalCoreSnapshot,
  listLocalAuditEventsForUser,
  signLocalSessionToken,
  verifyLocalSessionToken,
} from "@/lib/local-core";

const email = "asesor@despacho.local";
const password = "ClaveSegura123";

let localDataDir = "";

beforeEach(async () => {
  localDataDir = await mkdtemp(path.join(os.tmpdir(), "facturaia-local-auth-"));
  process.env.FACTURAIA_LOCAL_MODE = "1";
  process.env.FACTURAIA_DATA_DIR = localDataDir;
  process.env.FACTURAIA_LOCAL_SESSION_SECRET = "auth-local-secret";
  process.env.FACTURAIA_LOCAL_LOGIN_MAX_ATTEMPTS = "3";
  process.env.FACTURAIA_LOCAL_LOGIN_LOCKOUT_MINUTES = "15";
  process.env.FACTURAIA_LOCAL_SESSION_MAX_AGE_HOURS = "1";
});

afterEach(async () => {
  vi.useRealTimers();
  await rm(localDataDir, { recursive: true, force: true });
});

describe("local auth security", () => {
  test("expires local session tokens after the configured max age", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-21T10:00:00.000Z"));

    const token = signLocalSessionToken("user-session");

    expect(verifyLocalSessionToken(token)).toBe("user-session");

    vi.setSystemTime(new Date("2026-03-21T11:30:00.000Z"));

    expect(verifyLocalSessionToken(token)).toBeNull();
  });

  test("locks local login after repeated failures and records audit events", async () => {
    const user = await ensureInitialLocalUser(email, password);

    const first = await authenticateLocalUser(email, "ClaveMala111", {
      ipAddress: "127.0.0.1",
      userAgent: "Vitest",
    });
    const second = await authenticateLocalUser(email, "ClaveMala222", {
      ipAddress: "127.0.0.1",
      userAgent: "Vitest",
    });
    const third = await authenticateLocalUser(email, "ClaveMala333", {
      ipAddress: "127.0.0.1",
      userAgent: "Vitest",
    });
    const whileLocked = await authenticateLocalUser(email, password, {
      ipAddress: "127.0.0.1",
      userAgent: "Vitest",
    });

    expect(first).toMatchObject({
      status: "invalid",
      remainingAttempts: 2,
    });
    expect(second).toMatchObject({
      status: "invalid",
      remainingAttempts: 1,
    });
    expect(third.status).toBe("locked");
    expect(whileLocked.status).toBe("locked");

    const snapshot = await getLocalCoreSnapshot();
    const rateLimit = snapshot.authRateLimits.find(
      (entry) => entry.email_key === email && entry.scope === "local_login",
    );
    const events = await listLocalAuditEventsForUser(user.id, 10);

    expect(rateLimit?.failed_attempts).toBe(3);
    expect(rateLimit?.locked_until).toBeTruthy();
    expect(events.some((event) => event.action === "local_login_failed")).toBe(true);
    expect(events.some((event) => event.action === "local_login_locked")).toBe(true);
    expect(events.some((event) => event.action === "local_login_blocked")).toBe(true);
  });

  test("clears local login throttling after a successful sign-in", async () => {
    const user = await ensureInitialLocalUser(email, password);

    await authenticateLocalUser(email, "ClaveMala111", {
      ipAddress: "127.0.0.1",
      userAgent: "Vitest",
    });
    const success = await authenticateLocalUser(email, password, {
      ipAddress: "127.0.0.1",
      userAgent: "Vitest",
    });

    expect(success).toMatchObject({
      status: "success",
      user: {
        id: user.id,
        email,
      },
    });

    const snapshot = await getLocalCoreSnapshot();
    const events = await listLocalAuditEventsForUser(user.id, 10);

    expect(
      snapshot.authRateLimits.some((entry) => entry.email_key === email),
    ).toBe(false);
    expect(events.some((event) => event.action === "local_login_succeeded")).toBe(true);
  });
});
