/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("/tmp/facturaia-qa-pw/node_modules/playwright");

async function main() {
  const baseUrl = process.env.FACTURAIA_E2E_BASE_URL || "http://127.0.0.1:3153";
  const corePath = process.env.FACTURAIA_E2E_CORE_PATH || "/tmp/facturaia-qa-3153b/core.json";
  const macChromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  const browser = await chromium.launch({
    headless: true,
    executablePath: fs.existsSync(macChromePath) ? macChromePath : undefined,
  });
  const page = await browser.newPage();
  const pageErrors = [];
  const consoleErrors = [];

  page.on("pageerror", (error) => pageErrors.push(String(error)));
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });

  function assertNoErrorInUrl() {
    const currentUrl = page.url();
    const parsed = new URL(currentUrl);
    const error = parsed.searchParams.get("error");

    if (error) {
      throw new Error(`La app redirigio con error: ${decodeURIComponent(error)}`);
    }
  }

  async function waitForUrlPattern(currentPage, pattern, timeoutMs = 30000) {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      if (pattern.test(currentPage.url())) {
        return;
      }

      await currentPage.waitForTimeout(250);
    }

    throw new Error(`Timeout esperando URL con patrón: ${pattern}`);
  }

  await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
  await page.getByLabel("Email de acceso").fill("asesor@despacho.local");
  await page.getByLabel("Contraseña").fill("ClaveSegura123");
  await Promise.all([
    page.waitForURL(/\/dashboard/),
    page.getByRole("button", { name: /entrar con cuenta local/i }).click(),
  ]);

  await page.goto(`${baseUrl}/profile`, { waitUntil: "networkidle" });
  await page.getByLabel(/nombre o raz[oó]n social/i).fill("Asesoria Martin Fiscal");
  await page.getByLabel(/^NIF$/).fill("B12345678");
  await page.getByLabel(/direcci[oó]n/i).fill("Calle Alcala 100, 28009 Madrid");
  await page.getByRole("button", { name: /guardar perfil/i }).click();
  await waitForUrlPattern(page, /updated=1/);
  assertNoErrorInUrl();

  await page.goto(`${baseUrl}/clientes`, { waitUntil: "networkidle" });
  await page.getByLabel("Nombre visible").fill("Empresa Norte S.L.");
  await page.getByLabel(/empresa o raz[oó]n social/i).fill("Empresa Norte S.L.");
  await page.getByLabel(/^Email$/).fill("admin@empresanorte.es");
  await page.getByLabel(/tel[eé]fono/i).fill("+34 600111222");
  await page.getByLabel(/^NIF$/).last().fill("B76543210");
  await page.getByLabel(/notas internas/i).fill("Cliente de prueba para validacion local.");
  await page.getByRole("button", { name: /guardar ficha/i }).click();
  await waitForUrlPattern(page, /created=1/);
  assertNoErrorInUrl();

  await page.goto(`${baseUrl}/gastos`, { waitUntil: "networkidle" });
  await page.locator("#expenseKind").selectOption("supplier_invoice");
  await page.getByLabel(/notas internas/i).fill("Factura de proveedor importada desde prueba local.");
  await page.getByLabel(/texto ocr opcional/i).fill(
    "Proveedor: Gestoria Externa SL\nNIF: B11223344\nFecha: 15/03/2026\nBase imponible: 100,00\nIVA: 21,00\nTotal: 121,00",
  );
  await page.setInputFiles("#sourceFile", {
    name: "factura-proveedor.txt",
    mimeType: "text/plain",
    buffer: Buffer.from(
      "Proveedor: Gestoria Externa SL\nNIF: B11223344\nFecha: 15/03/2026\nBase imponible: 100,00\nIVA: 21,00\nTotal: 121,00",
    ),
  });
  await page.locator("#sourceFile").evaluate((input) => input.form.requestSubmit());
  await waitForUrlPattern(page, /(created|error)=/);
  assertNoErrorInUrl();

  await page.goto(`${baseUrl}/presupuestos`, { waitUntil: "networkidle" });
  await page.getByLabel(/^Cliente$/).fill("Empresa Norte S.L.");
  await page.getByLabel("NIF cliente").fill("B76543210");
  await page.getByLabel("Email cliente").fill("admin@empresanorte.es");
  await page.getByLabel(/direcci[oó]n del cliente/i).fill(
    "Avenida de Europa 15, Pozuelo de Alarcon",
  );
  await page.locator("textarea").nth(2).fill("Servicio mensual de asesoria fiscal y contable");
  await page.locator('input[type="number"]').nth(1).fill("1");
  await page.locator('input[type="number"]').nth(2).fill("350");
  await page.waitForFunction(() => {
    const input = document.querySelector('input[name="lines"]');
    return typeof input?.getAttribute("value") === "string" &&
      input.getAttribute("value").includes("Servicio mensual de asesoria fiscal y contable");
  });
  await page.getByLabel(/notas internas u observaciones/i).fill(
    "Presupuesto generado en instalacion local.",
  );
  await page.getByRole("button", { name: /guardar presupuesto/i }).click();
  await waitForUrlPattern(page, /(created|error)=/);
  assertNoErrorInUrl();
  await page.goto(`${baseUrl}/presupuestos`, { waitUntil: "networkidle" });

  await page
    .locator("button:visible", { hasText: /solicitar firma/i })
    .first()
    .evaluate((button) => button.closest("form").requestSubmit());
  await waitForUrlPattern(page, /(created|error)=/);
  assertNoErrorInUrl();
  const publicHref = await page.locator('a[href*="/firma/"]').first().getAttribute("href");

  if (!publicHref) {
    throw new Error("No se encontro el enlace publico de firma.");
  }
  const publicUrl = new URL(publicHref, baseUrl);
  const normalizedPublicUrl = `${baseUrl}${publicUrl.pathname}${publicUrl.search}`;

  const publicPage = await browser.newPage();
  const publicErrors = [];
  publicPage.on("pageerror", (error) => publicErrors.push(String(error)));
  await publicPage.goto(normalizedPublicUrl, { waitUntil: "domcontentloaded" });
  await publicPage.waitForTimeout(3000);
  await publicPage.waitForSelector("#signerName");
  await publicPage.locator("#signerName").fill("Empresa Norte S.L.");
  await publicPage.locator("#signerEmail").fill("admin@empresanorte.es");
  await publicPage.locator("#signerNif").fill("B76543210");
  await publicPage.locator("#signerMessage").fill("Aceptado desde el portal publico local.");
  await publicPage.locator('input[name="acceptTerms"]').check();
  await publicPage
    .locator("button:visible", { hasText: /aceptar presupuesto|firmar albar[aá]n/i })
    .click();
  await waitForUrlPattern(publicPage, /accepted=1/);

  if (publicErrors.length > 0) {
    throw new Error(`Errores en la pagina publica: ${publicErrors.join(" | ")}`);
  }

  await publicPage.close();

  await page.goto(`${baseUrl}/presupuestos`, { waitUntil: "networkidle" });
  await page
    .locator("button:visible", { hasText: /convertir en factura/i })
    .first()
    .evaluate((button) => button.closest("form").requestSubmit());
  await page.waitForFunction(() => {
    return window.location.pathname === "/invoices" && /(created|error)=/.test(window.location.search);
  });
  assertNoErrorInUrl();

  const backupResponse = await page.request.get(`${baseUrl}/api/backups/export`);
  const backup = JSON.parse(await backupResponse.text());
  const core = JSON.parse(fs.readFileSync(corePath, "utf8"));
  console.log(
    JSON.stringify(
      {
        finalUrl: page.url(),
        publicUrl,
        corePath: path.resolve(corePath),
        pageErrors,
        consoleErrors,
        backupStatus: backupResponse.status(),
        backupCounts: {
          clients: backup.clients.length,
          expenses: backup.expenses.length,
          commercialDocuments: backup.commercialDocuments.length,
          documentSignatureRequests: backup.documentSignatureRequests.length,
          invoices: backup.invoices.length,
        },
        coreCounts: {
          clients: core.clients.length,
          expenses: core.expenses.length,
          commercialDocuments: core.commercialDocuments.length,
          documentSignatureRequests: core.documentSignatureRequests.length,
          invoices: core.invoices.length,
        },
      },
      null,
      2,
    ),
  );

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
