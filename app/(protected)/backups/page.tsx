import { HardDriveDownload, ShieldCheck } from "lucide-react";

import { BackupCenter } from "@/components/backups/backup-center";
import { getBackupSummary } from "@/lib/backups";
import { requireUser } from "@/lib/auth";
import { isDemoMode } from "@/lib/demo";
import { getRemoteBackupState } from "@/lib/remote-backups";
import { Badge } from "@/components/ui/badge";

export default async function BackupsPage() {
  const user = await requireUser();
  const demoMode = isDemoMode();
  const [summary, remoteState] = await Promise.all([
    getBackupSummary(user.id),
    getRemoteBackupState(user.id),
  ]);

  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr] xl:items-end">
        <div className="max-w-4xl space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge>Backups</Badge>
            <Badge variant="success">Uso privado</Badge>
            {demoMode ? <Badge variant="secondary">Modo demo</Badge> : null}
          </div>

          <div className="space-y-3">
            <p className="section-kicker">Copias de seguridad</p>
            <h1 className="font-display text-5xl leading-none tracking-tight text-foreground">
              Exporta y restaura tu instalación sin depender de terceros.
            </h1>
            <p className="text-lg leading-8 text-muted-foreground">
              FacturaIA guarda aquí una salida clara para mover tus datos entre
              máquinas, preparar un respaldo manual o recuperar una instalación privada.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-[28px] bg-white/82 p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">Formato</p>
            <p className="mt-2 font-display text-3xl text-foreground">JSON</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Portable, legible y fácil de versionar en un entorno privado.
            </p>
          </div>
          <div className="rounded-[28px] bg-[color:rgba(19,45,52,0.94)] p-5 text-white shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-white/70">Cobertura actual</p>
                <p className="mt-2 font-display text-3xl text-white">
                  CRM, facturas, IA y mensajes
                </p>
                <p className="mt-2 text-sm leading-6 text-white/82">
                  Perfil fiscal, fichas del CRM, histórico de uso y bandeja opcional incluidos.
                </p>
              </div>
              <HardDriveDownload className="mt-1 h-5 w-5 text-white/70" />
            </div>
          </div>
        </div>
      </section>

      <BackupCenter
        summary={summary}
        demoMode={demoMode}
        remoteState={remoteState}
      />

      <div className="rounded-[28px] bg-[color:var(--color-panel)] p-6">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-1 h-5 w-5 text-[color:var(--color-success)]" />
          <p className="text-sm leading-7 text-muted-foreground">
            Recomendación práctica: guarda una copia antes de tocar migraciones,
            mover la app a otro servidor o limpiar datos manualmente desde Supabase.
          </p>
        </div>
      </div>
    </div>
  );
}
