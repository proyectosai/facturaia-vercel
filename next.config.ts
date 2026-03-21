import path from "node:path";
import type { NextConfig } from "next";

import { getSecurityHeaders } from "./lib/security";

const rawDistDir = process.env.FACTURAIA_NEXT_DIST_DIR?.trim();
const distDir = rawDistDir
  ? path.isAbsolute(rawDistDir)
    ? path.relative(process.cwd(), rawDistDir)
    : rawDistDir
  : undefined;

const nextConfig: NextConfig = {
  ...(distDir ? { distDir } : {}),
  outputFileTracingRoot: path.resolve(process.cwd()),
  serverExternalPackages: ["sql.js"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: getSecurityHeaders(),
      },
    ];
  },
};

export default nextConfig;
