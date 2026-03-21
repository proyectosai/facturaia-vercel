import { DocumentStudyLab } from "@/components/ai/document-study-lab";
import { getCurrentAppUser } from "@/lib/auth";
import { getCurrentAiUsageSnapshot } from "@/lib/billing";
import { isDemoMode } from "@/lib/demo";
import { hasLocalAiEnv, getLocalAiEnv } from "@/lib/env";
import { listStudyDocumentsForUser } from "@/lib/document-study";

export default async function StudyAiPage() {
  const appUser = await getCurrentAppUser();
  const documents = await listStudyDocumentsForUser(appUser.id);
  const aiUsage = await getCurrentAiUsageSnapshot(appUser);
  const aiEnv = getLocalAiEnv();
  const demoMode = isDemoMode();

  return (
    <div className="space-y-6">
      <div className="max-w-4xl space-y-3">
        <p className="section-kicker">Estudio documental local</p>
        <h1 className="font-display text-5xl leading-none tracking-tight text-foreground">
          Pregunta sobre tu propia documentación y revisa las citas antes de decidir.
        </h1>
        <p className="text-lg leading-8 text-muted-foreground">
          Esta zona es la primera iteración real del estudio documental de FacturaIA:
          guarda notas y archivos de trabajo dentro de tu instalación, recupera
          fragmentos relevantes y, si LM Studio está disponible, redacta una
          respuesta con apoyo explícito en esos fragmentos.
          {!hasLocalAiEnv() ? " Si LM Studio no está configurado, verás una salida guiada sin LLM." : ""}
        </p>
      </div>

      <DocumentStudyLab
        initialDocuments={documents}
        model={aiEnv.LM_STUDIO_MODEL}
        localAiConfigured={hasLocalAiEnv()}
        initialAiUsed={aiUsage.used}
        aiLimit={aiUsage.limit}
        demoMode={demoMode}
      />
    </div>
  );
}
