import { afterEach, describe, expect, test, vi } from "vitest";

import { extractRawTextFromExpenseInput, getExpenseStoragePath } from "@/lib/expenses";

const ORIGINAL_ENV = { ...process.env };

function resetEnv() {
  for (const key of Object.keys(process.env)) {
    delete process.env[key];
  }

  Object.assign(process.env, ORIGINAL_ENV);
}

afterEach(() => {
  resetEnv();
  vi.restoreAllMocks();
});

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

  test("uses Ollama OCR for supported images when configured", async () => {
    process.env.OLLAMA_BASE_URL = "http://127.0.0.1:11434";
    process.env.OLLAMA_OCR_MODEL = "glm-ocr:latest";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          message: {
            content: "REPSOL\nTOTAL 45,67\nIVA 7,92",
          },
        }),
      }),
    );

    const file = new File(["fake-image"], "ticket.jpg", {
      type: "image/jpeg",
    });

    const result = await extractRawTextFromExpenseInput({ file });

    expect(result).toEqual({
      rawText: "REPSOL\nTOTAL 45,67\nIVA 7,92",
      method: "image_ocr",
    });
  });

  test("builds sanitized storage paths", () => {
    const storagePath = getExpenseStoragePath("user-1", "factura proveedor (abril).pdf");

    expect(storagePath).toContain("user-1/expenses/");
    expect(storagePath.endsWith("factura-proveedor--abril-.pdf")).toBe(true);
  });
});
