import path from "node:path";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const port = Number(process.env.PORT || 3030);
const host = "127.0.0.1";
const baseUrl =
  process.env.NEXT_PUBLIC_APP_URL || `http://${host}:${port}`;

const nextBin = path.resolve(
  process.cwd(),
  "node_modules",
  "next",
  "dist",
  "bin",
  "next",
);

const routes = [
  "/",
  "/dashboard",
  "/new-invoice",
  "/invoices",
  "/gastos",
  "/cobros",
  "/banca",
  "/clientes",
  "/facturae",
  "/firmas",
  "/mail",
  "/messages",
  "/modules",
  "/system",
  "/renta",
  "/primeros-pasos",
];

async function waitForServer(url, attempts = 60) {
  for (let index = 0; index < attempts; index += 1) {
    try {
      const response = await fetch(url, { redirect: "manual" });

      if (response.status < 500) {
        return;
      }
    } catch {
      // El servidor aún no está listo.
    }

    await delay(1000);
  }

  throw new Error(`FacturaIA no respondió a tiempo en ${url}.`);
}

const child = spawn(
  process.execPath,
  [nextBin, "start", "--hostname", host, "--port", String(port)],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      FACTURAIA_DEMO_MODE: "1",
      NEXT_PUBLIC_APP_URL: baseUrl,
      PORT: String(port),
    },
  },
);

async function shutdown() {
  if (!child.killed) {
    child.kill("SIGTERM");
  }

  await delay(500);
}

async function main() {
  await waitForServer(baseUrl);

  for (const route of routes) {
    const response = await fetch(`${baseUrl}${route}`, {
      redirect: "manual",
    });

    if (!response.ok) {
      throw new Error(
        `Smoke test fallido en ${route}: ${response.status} ${response.statusText}`,
      );
    }
  }

  console.log(
    `Smoke demo completado correctamente sobre ${routes.length} rutas en ${baseUrl}.`,
  );
}

try {
  await main();
  await shutdown();
  process.exit(0);
} catch (error) {
  console.error(error);
  await shutdown();
  process.exit(1);
}
