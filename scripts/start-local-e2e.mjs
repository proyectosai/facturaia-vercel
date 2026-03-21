import path from "node:path";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const host = "127.0.0.1";
const port = Number(process.env.PORT || 3101);
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `http://${host}:${port}`;
const dataDir =
  process.env.FACTURAIA_E2E_DATA_DIR ||
  process.env.FACTURAIA_DATA_DIR ||
  path.join(process.cwd(), ".facturaia-e2e");
const distDir =
  process.env.FACTURAIA_NEXT_DIST_DIR ||
  path.join(process.cwd(), ".next-e2e");
const tsconfigPath = path.join(process.cwd(), "tsconfig.json");
const strayUsersDir = path.join(process.cwd(), "Users");
const nextBin = path.resolve(
  process.cwd(),
  "node_modules",
  "next",
  "dist",
  "bin",
  "next",
);

function getLocalEnv() {
  return {
    ...process.env,
    PORT: String(port),
    NEXT_PUBLIC_APP_URL: baseUrl,
    FACTURAIA_LOCAL_MODE: "1",
    FACTURAIA_LOCAL_BOOTSTRAP: "1",
    FACTURAIA_LOCAL_SESSION_SECRET:
      process.env.FACTURAIA_LOCAL_SESSION_SECRET || "playwright-local-secret",
    FACTURAIA_DATA_DIR: dataDir,
    FACTURAIA_E2E_DATA_DIR: dataDir,
    FACTURAIA_NEXT_DIST_DIR: distDir,
  };
}

function runNext(command, extraArgs = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [nextBin, command, ...extraArgs], {
      stdio: "inherit",
      env: getLocalEnv(),
    });

    child.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`Next ${command} terminó por señal ${signal}.`));
        return;
      }

      if (code === 0) {
        resolve(undefined);
        return;
      }

      reject(new Error(`Next ${command} terminó con código ${code}.`));
    });
  });
}

async function runBuildPreservingTsconfig() {
  let originalTsconfig = null;

  try {
    originalTsconfig = await readFile(tsconfigPath, "utf8");
  } catch {
    originalTsconfig = null;
  }

  try {
    await runNext("build");
  } finally {
    await rm(strayUsersDir, { recursive: true, force: true });

    if (originalTsconfig !== null) {
      await writeFile(tsconfigPath, originalTsconfig, "utf8");
    }
  }
}

async function waitForServer(url, attempts = 90) {
  for (let index = 0; index < attempts; index += 1) {
    try {
      const response = await fetch(url, { redirect: "manual" });

      if (response.status < 500) {
        return;
      }
    } catch {
      // El servidor todavía no responde.
    }

    await delay(1000);
  }

  throw new Error(`FacturaIA no respondió a tiempo en ${url}.`);
}

async function main() {
  await rm(dataDir, { recursive: true, force: true });
  await mkdir(dataDir, { recursive: true });
  await rm(distDir, { recursive: true, force: true });
  await rm(strayUsersDir, { recursive: true, force: true });

  if (process.env.FACTURAIA_E2E_SKIP_BUILD !== "1") {
    await runBuildPreservingTsconfig();
  }

  const server = spawn(
    process.execPath,
    [nextBin, "start", "--hostname", host, "--port", String(port)],
    {
      stdio: "inherit",
      env: getLocalEnv(),
    },
  );

  const shutdown = async () => {
    if (!server.killed) {
      server.kill("SIGTERM");
      await delay(500);
    }
  };

  process.on("SIGTERM", async () => {
    await shutdown();
    process.exit(0);
  });

  process.on("SIGINT", async () => {
    await shutdown();
    process.exit(0);
  });

  server.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 1);
  });

  await waitForServer(baseUrl);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
