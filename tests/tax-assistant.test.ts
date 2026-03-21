import { afterEach, describe, expect, test } from "vitest";

import { generateSpanishTaxAssistantReply } from "@/lib/ai";

const originalEnv = {
  LM_STUDIO_BASE_URL: process.env.LM_STUDIO_BASE_URL,
  LM_STUDIO_MODEL: process.env.LM_STUDIO_MODEL,
  LM_STUDIO_API_KEY: process.env.LM_STUDIO_API_KEY,
};

afterEach(() => {
  process.env.LM_STUDIO_BASE_URL = originalEnv.LM_STUDIO_BASE_URL;
  process.env.LM_STUDIO_MODEL = originalEnv.LM_STUDIO_MODEL;
  process.env.LM_STUDIO_API_KEY = originalEnv.LM_STUDIO_API_KEY;
});

describe("tax assistant fallback", () => {
  test(
    "returns a guided response with official sources when local AI is not configured",
    { timeout: 15000 },
    async () => {
      delete process.env.LM_STUDIO_BASE_URL;
      delete process.env.LM_STUDIO_MODEL;
      delete process.env.LM_STUDIO_API_KEY;

      const result = await generateSpanishTaxAssistantReply({
        message: "Necesito ordenar la renta de un autonomo con alquiler y acciones.",
        clientName: "Nexo Digital S.L.",
        taxYear: "2025",
        clientSummary: "Autonomo en estimacion directa con un alquiler y ventas de acciones.",
        providedDocuments: "Datos fiscales, certificados bancarios y libro de gastos.",
      });

      expect(result.provider).toBe("FacturaIA");
      expect(result.model).toBe("Plantillas internas");
      expect(result.text).toContain("Checklist base para abrir o revisar el expediente");
      expect(result.text).toContain("Campaña de Renta en la AEAT");
      expect(result.text).toContain("Aviso: este asistente ayuda a preparar y revisar expedientes");
    },
  );
});
