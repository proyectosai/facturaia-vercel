import { Badge } from "@/components/ui/badge";
import { RentaAssistant } from "@/components/tax/renta-assistant";
import { getCurrentAiUsageSnapshot } from "@/lib/billing";
import { getLocalAiEnv, hasLocalAiEnv } from "@/lib/env";
import { getCurrentAppUser } from "@/lib/auth";

function getDefaultTaxYear() {
  return String(new Date().getFullYear() - 1);
}

export default async function RentaPage() {
  const appUser = await getCurrentAppUser();
  const aiUsage = await getCurrentAiUsageSnapshot(appUser);
  const localAiReady = hasLocalAiEnv();
  const modelLabel = localAiReady
    ? getLocalAiEnv().LM_STUDIO_MODEL
    : "Plantillas y checklist";

  return (
    <div className="space-y-6">
      <div className="max-w-5xl space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge>Asistente fiscal</Badge>
          <Badge variant="secondary">IRPF / Renta España</Badge>
          <Badge variant={localAiReady ? "success" : "secondary"}>
            {localAiReady ? "IA local lista" : "Modo guiado"}
          </Badge>
        </div>

        <p className="section-kicker">Apoyo profesional para expedientes de renta</p>
        <h1 className="font-display text-5xl leading-none tracking-tight text-foreground">
          Ordena documentación, detecta huecos y prepara el trabajo antes de presentar.
        </h1>
        <p className="text-lg leading-8 text-muted-foreground">
          Este módulo no pretende cerrar declaraciones por ti. Sirve para ayudar a
          un profesional fiscal a confeccionar rentas de clientes en España con una
          combinación de checklist, fuentes oficiales y asistencia con IA local.
          Hoy llevas {aiUsage.used} consultas IA registradas en esta instalación.
        </p>
      </div>

      <RentaAssistant
        defaultTaxYear={getDefaultTaxYear()}
        modelLabel={modelLabel}
        hasLocalAi={localAiReady}
      />
    </div>
  );
}
