import { DocumentsStudio } from "@/components/ai/documents-studio";
import { getCurrentAppUser, getCurrentProfile } from "@/lib/auth";
import { getCurrentAiUsageSnapshot } from "@/lib/billing";
import { isDemoMode } from "@/lib/demo";
import { getLocalAiEnv } from "@/lib/env";

export default async function DocumentsAiPage() {
  const appUser = await getCurrentAppUser();
  const profile = await getCurrentProfile();
  const aiUsage = await getCurrentAiUsageSnapshot(appUser);
  const demoMode = isDemoMode();
  const aiEnv = getLocalAiEnv();

  return (
    <div className="space-y-6">
      <div className="max-w-4xl space-y-3">
        <p className="section-kicker">Documentos con IA local</p>
        <h1 className="font-display text-5xl leading-none tracking-tight text-foreground">
          Propuestas, presupuestos, contratos y mensajes listos para enviar.
        </h1>
        <p className="text-lg leading-8 text-muted-foreground">
          Esta zona usa el modelo local <strong className="text-foreground">{aiEnv.LM_STUDIO_MODEL}</strong> en
          <strong className="text-foreground"> LM Studio</strong> como sustituto de una API externa.
          Sirve para generar piezas reales, afinarlas en el editor y exportarlas a PDF o Word con mejor acabado.
        </p>
      </div>

      <DocumentsStudio
        model={aiEnv.LM_STUDIO_MODEL}
        initialAiUsed={aiUsage.used}
        aiLimit={aiUsage.limit}
        demoMode={demoMode}
        defaultLogoUrl={profile.logo_url ?? (demoMode ? "/demo-logo.png" : "")}
        defaultAdditionalText="Nota: Este documento contiene información comercial y debe revisarse antes de su envío o firma definitiva."
      />
    </div>
  );
}
