import { describe, expect, test } from "vitest";

import {
  assertAllowedUpload,
  getSecurityHeaders,
  UploadValidationError,
  uploadRules,
} from "@/lib/security";

describe("security helpers", () => {
  test("returns critical security headers", () => {
    const headers = getSecurityHeaders();
    const headerKeys = headers.map((item) => item.key);

    expect(headerKeys).toContain("X-Frame-Options");
    expect(headerKeys).toContain("Content-Security-Policy");
    expect(headerKeys).toContain("X-Content-Type-Options");
  });

  test("rejects disallowed logo mime types", () => {
    const file = new File(["svg"], "logo.svg", { type: "image/svg+xml" });

    expect(() => assertAllowedUpload(file, uploadRules.logo)).toThrow(
      UploadValidationError,
    );
  });
});
