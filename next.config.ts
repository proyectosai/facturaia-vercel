import path from "node:path";
import type { NextConfig } from "next";

import { getSecurityHeaders } from "./lib/security";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(process.cwd()),
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
