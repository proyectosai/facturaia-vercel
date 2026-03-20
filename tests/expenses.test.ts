import { describe, expect, test } from "vitest";

import { extractRawTextFromExpenseInput, getExpenseStoragePath } from "@/lib/expenses";

describe("expense helpers", () => {
  test("extracts plain text files without touching the PDF parser", async () => {
    const file = new File(["Factura proveedor\nTotal: 121,00"], "ticket.txt", {
      type: "text/plain",
    });

    const result = await extractRawTextFromExpenseInput({ file });

    expect(result).toEqual({
      rawText: "Factura proveedor\nTotal: 121,00",
      method: "plain_text",
    });
  });

  test("returns unavailable for unsupported file types", async () => {
    const file = new File(["binary"], "ticket.bin", {
      type: "application/octet-stream",
    });

    const result = await extractRawTextFromExpenseInput({ file });

    expect(result).toEqual({
      rawText: "",
      method: "unavailable",
    });
  });

  test("builds sanitized storage paths", () => {
    const storagePath = getExpenseStoragePath("user-1", "factura proveedor (abril).pdf");

    expect(storagePath).toContain("user-1/expenses/");
    expect(storagePath.endsWith("factura-proveedor--abril-.pdf")).toBe(true);
  });
});
