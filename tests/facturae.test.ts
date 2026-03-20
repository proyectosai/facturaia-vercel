import { describe, expect, test } from "vitest";

import { getFacturaeReadiness, renderFacturaeXml } from "@/lib/facturae";
import { demoInvoices } from "@/lib/demo";

describe("facturae readiness", () => {
  test("includes payment details and due date in the XML", () => {
    const invoice = demoInvoices.find((item) => item.invoice_number === 1024);

    expect(invoice).toBeTruthy();

    const xml = renderFacturaeXml(invoice!);

    expect(xml).toContain("<PaymentDetails>");
    expect(xml).toContain("<InstallmentDueDate>2026-03-22</InstallmentDueDate>");
    expect(xml).toContain("<PaymentMeans>04</PaymentMeans>");
  });

  test("marks invalid tax ids as blocking warnings", () => {
    const invoice = {
      ...demoInvoices[0]!,
      issuer_nif: "INVALIDO",
    };

    const prepared = getFacturaeReadiness(invoice);

    expect(prepared.isReady).toBe(false);
    expect(
      prepared.issues.some((issue) =>
        issue.message.includes("NIF del emisor no sigue un formato español reconocible"),
      ),
    ).toBe(true);
  });
});
