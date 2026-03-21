/* eslint-disable @typescript-eslint/no-require-imports */
const path = require("node:path");
const { spawn } = require("node:child_process");
const { setTimeout: delay } = require("node:timers/promises");
const { chromium } = require("@playwright/test");

const host = "127.0.0.1";
const port = Number(process.env.FACTURAIA_E2E_PORT || 3101);
const baseUrl = process.env.FACTURAIA_E2E_BASE_URL || `http://${host}:${port}`;
const mobileViewport = { width: 390, height: 844 };
const dataDir =
  process.env.FACTURAIA_E2E_DATA_DIR ||
  path.join(process.cwd(), ".facturaia-e2e");

const userEmail = "asesor@despacho.local";
const userPassword = "ClaveSegura123";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function waitForServer(url, attempts = 120) {
  for (let index = 0; index < attempts; index += 1) {
    try {
      const response = await fetch(url, { redirect: "manual" });

      if (response.status < 500) {
        return;
      }
    } catch {
      // El servidor todavía está arrancando.
    }

    await delay(1000);
  }

  throw new Error(`FacturaIA no respondió a tiempo en ${url}.`);
}

function getServerEnv() {
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
  };
}

async function startLocalServer() {
  const child = spawn(process.execPath, ["scripts/start-local-e2e.mjs"], {
    cwd: process.cwd(),
    env: getServerEnv(),
    stdio: "inherit",
  });

  await waitForServer(baseUrl);

  return child;
}

async function stopLocalServer(child) {
  if (!child || child.killed) {
    return;
  }

  child.kill("SIGTERM");
  await delay(500);
}

async function waitForUrlPattern(page, pattern, timeoutMs = 30_000) {
  await page.waitForURL(pattern, {
    timeout: timeoutMs,
    waitUntil: "load",
  });
}

function assertNoRouteError(page) {
  const currentUrl = new URL(page.url());
  const error = currentUrl.searchParams.get("error");

  if (error) {
    throw new Error(`La app redirigió con error: ${decodeURIComponent(error)}`);
  }
}

async function clickButton(page, namePattern) {
  const button = page.getByRole("button", { name: namePattern }).first();
  await button.waitFor({ state: "visible", timeout: 30_000 });
  await button.click();
}

async function waitForPrimaryAction(page, namePattern) {
  const button = page.getByRole("button", { name: namePattern }).first();

  try {
    await button.waitFor({ state: "visible", timeout: 5_000 });
    return;
  } catch {
    const link = page.getByRole("link", { name: namePattern }).first();
    await link.waitFor({ state: "visible", timeout: 30_000 });
  }
}

async function loginLocalUser(page) {
  await page.goto(`${baseUrl}/login`, { waitUntil: "load" });
  await page.getByLabel("Email de acceso").fill(userEmail);
  await page.getByLabel("Contraseña").fill(userPassword);
  await page.getByRole("button", { name: /entrar con cuenta local/i }).click();
  await waitForUrlPattern(page, /\/dashboard/);
}

async function setSerializedLines(page, lines) {
  const serializedLines = JSON.stringify(lines);

  await page.locator('input[name="lines"]').evaluate((input, value) => {
    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, serializedLines);

  await page.waitForFunction(
    (expectedLines) => {
      const input = document.querySelector('input[name="lines"]');
      return typeof input?.getAttribute("value") === "string" &&
        input.getAttribute("value") === expectedLines;
    },
    serializedLines,
  );
}

async function assertHealthyRoute(page, route) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: "load" });
  const main = page.locator("main").last();
  await main.waitFor({ state: "visible", timeout: 30_000 });

  const mainText = await main.innerText();

  assert(
    !/Runtime ZodError|Application error|NEXT_REDIRECT|Something went wrong|Server Error/i.test(mainText),
    `La ruta ${route} mostró un error visible.`,
  );
}

async function assertNoHorizontalOverflow(page, route, tolerance = 8) {
  await page.waitForTimeout(250);
  const metrics = await page.evaluate(() => {
    const offenders = [];

    for (const el of document.querySelectorAll("body *")) {
      const insideHorizontalScroller = Boolean(
        el.closest(".overflow-x-auto"),
      );
      const rect = el.getBoundingClientRect();

      if (insideHorizontalScroller) {
        continue;
      }

      if (rect.width > 0 && rect.right > window.innerWidth + 4) {
        offenders.push({
          tag: el.tagName,
          className: typeof el.className === "string" ? el.className : "",
          text: (el.textContent || "").trim().slice(0, 140),
          right: rect.right,
          width: rect.width,
        });
      }
    }

    return {
      innerWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body?.scrollWidth ?? 0,
      offenders: offenders.slice(0, 5),
    };
  });

  const widest = Math.max(metrics.documentWidth, metrics.bodyWidth);

  assert(
    widest <= metrics.innerWidth + tolerance,
    `La ruta ${route} tiene overflow horizontal en móvil (${widest}px > ${metrics.innerWidth}px). Offenders: ${JSON.stringify(metrics.offenders)}`,
  );
}

async function exportBackupSnapshot(page) {
  const response = await page.evaluate(async () => {
    const backupResponse = await fetch("/api/backups/export", {
      method: "GET",
    });

    return {
      ok: backupResponse.ok,
      status: backupResponse.status,
      text: await backupResponse.text(),
    };
  });

  assert(response.ok, `El export de backups devolvió ${response.status}.`);
  const parsed = JSON.parse(response.text);

  if (parsed?.payload && typeof parsed.payload === "object") {
    return parsed.payload;
  }

  return parsed;
}

async function waitForPaidInvoice(page, invoiceId, timeoutMs = 30_000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const backup = await exportBackupSnapshot(page);
    const invoice = backup.invoices.find((candidate) => candidate.id === invoiceId);

    if (invoice?.payment_status === "paid") {
      return invoice;
    }

    await delay(1000);
  }

  throw new Error(`La factura ${invoiceId} no quedó marcada como cobrada a tiempo.`);
}

async function runCriticalLocalFlow(page) {
  await loginLocalUser(page);

  await page.goto(`${baseUrl}/new-invoice`, { waitUntil: "load" });
  await page.locator("#issuerName").waitFor({ state: "visible", timeout: 30_000 });
  await page.locator("#issuerName").fill("Asesoria Martin Fiscal");
  await page.locator("#issuerNif").fill("B12345678");
  await page.locator("#issuerAddress").fill("Calle Alcalá 100, 28009 Madrid");
  await page.locator("#clientName").fill("Empresa Norte S.L.");
  await page.locator("#clientNif").fill("B76543210");
  await page.locator("#clientAddress").fill("Avenida de Europa 15, Pozuelo");
  await page.locator("#clientEmail").fill("admin@empresanorte.es");
  await setSerializedLines(page, [
    {
      description: "Servicio mensual de asesoría fiscal y contable",
      quantity: 1,
      unitPrice: 350,
      vatRate: 21,
    },
  ]);
  await clickButton(page, /generar factura/i);
  await waitForUrlPattern(page, /\/invoices\?created=/);
  assertNoRouteError(page);
  await page.locator("main").last().waitFor({ state: "visible", timeout: 30_000 });
  const createdInvoiceId = new URL(page.url()).searchParams.get("created");
  assert(createdInvoiceId, "La URL de creación no devuelve el identificador de la factura.");

  await page.goto(`${baseUrl}/cobros`, { waitUntil: "load" });
  await clickButton(page, /marcar cobrada/i);
  const paidInvoice = await waitForPaidInvoice(page, createdInvoiceId);
  await page.goto(`${baseUrl}/cobros?updated=1`, { waitUntil: "load" });
  assertNoRouteError(page);

  assert(
    paidInvoice.payment_status === "paid",
    "La factura no quedó marcada como cobrada en el backup local.",
  );
}

async function runProtectedRouteSweep(page) {
  const routes = [
    "/profile",
    "/clientes",
    "/gastos",
    "/presupuestos",
    "/firmas",
    "/messages",
    "/mail",
    "/feedback",
    "/banca",
    "/backups",
    "/system",
  ];

  for (const route of routes) {
    await assertHealthyRoute(page, route);
  }
}

async function runMobileRouteSweep(page) {
  const routes = [
    {
      route: "/dashboard",
      heading: /hola|autónomo/i,
      action: /nueva factura/i,
    },
    {
      route: "/new-invoice",
      heading: /emite una factura/i,
      action: /generar factura|generación real desactivada en demo/i,
    },
    {
      route: "/invoices",
      heading: /historial claro|mis facturas/i,
      action: /nueva factura/i,
    },
    {
      route: "/cobros",
      heading: /prioriza qué hay que cobrar|cobros y vencimientos/i,
      action: /aplicar filtros/i,
    },
    {
      route: "/profile",
      heading: /datos fiscales y control del entorno privado/i,
      action: /guardar perfil|guardado desactivado en demo/i,
    },
    {
      route: "/backups",
      heading: /exporta y restaura tu instalación/i,
      action: /descargar backup json/i,
    },
    {
      route: "/modules",
      heading: /instala poco a poco solo lo que realmente necesitas/i,
    },
    {
      route: "/instalacion",
      heading: /facturaia ya no está pensada como producto de pago/i,
      action: /abrir asistente/i,
    },
  ];

  for (const item of routes) {
    await page.goto(`${baseUrl}${item.route}`, { waitUntil: "load" });
    await page.locator("main").last().waitFor({ state: "visible", timeout: 45_000 });
    assertNoRouteError(page);
    await page.getByRole("heading", { name: item.heading }).first().waitFor({
      state: "visible",
      timeout: 30_000,
    });
    if (item.action) {
      await waitForPrimaryAction(page, item.action);
    }
    await assertNoHorizontalOverflow(page, item.route);
  }
}

async function main() {
  let server;
  let browser;

  try {
    server = await startLocalServer();
    browser = await chromium.launch({ headless: true });

    const page = await browser.newPage();
    const pageErrors = [];
    const consoleErrors = [];

    page.on("pageerror", (error) => pageErrors.push(String(error)));
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await runCriticalLocalFlow(page);
    await runProtectedRouteSweep(page);

    const mobileContext = await browser.newContext({
      viewport: mobileViewport,
    });
    const mobilePage = await mobileContext.newPage();

    try {
      await loginLocalUser(mobilePage);
      await runMobileRouteSweep(mobilePage);
    } finally {
      await mobileContext.close();
    }

    const backup = await exportBackupSnapshot(page);

    assert(backup.profile, "El backup no incluye perfil.");
    assert(backup.invoices.length >= 1, "El backup no incluye la factura creada.");

	    console.log(
	      JSON.stringify(
        {
          baseUrl,
          mobileViewport,
          dataDir: path.resolve(dataDir),
          finalUrl: page.url(),
          pageErrors,
          consoleErrors,
	          backupCounts: {
	            invoices: backup.invoices.length,
	            clients: (backup.clients ?? []).length,
	            expenses: (backup.expenses ?? []).length,
	            commercialDocuments: (backup.commercialDocuments ?? []).length,
	            signatures: (backup.documentSignatureRequests ?? []).length,
	            messages: (backup.messages?.threads ?? []).length,
	            mail: (backup.mail?.threads ?? []).length,
	            bankMovements: (backup.bankMovements ?? []).length,
	            feedback: (backup.feedbackEntries ?? []).length,
	          },
	        },
        null,
        2,
      ),
    );
  } finally {
    if (browser) {
      await browser.close();
    }

    if (server) {
      await stopLocalServer(server);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
