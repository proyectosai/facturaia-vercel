"use client";

import Link from "next/link";
import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CloudUpload,
  DatabaseBackup,
  Download,
  HardDriveDownload,
  LoaderCircle,
  RotateCcw,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RemoteBackupRun } from "@/lib/types";

type BackupSummary = {
  clients: number;
  feedbackEntries: number;
  auditEvents: number;
  invoices: number;
  invoiceReminders: number;
  commercialDocuments: number;
  documentSignatureRequests: number;
  expenses: number;
  bankMovements: number;
  aiUsageRows: number;
  messageConnections: number;
  messageThreads: number;
  messageRecords: number;
  mailThreads: number;
  mailMessages: number;
};

type BackupManifest = {
  schemaVersion: 1;
  appVersion: string;
  exportedAt: string;
  source: "demo" | "live";
  appUrl: string;
  checksumAlgorithm: "sha256";
  modulesIncluded: string[];
  counts: BackupSummary;
};

type RestorePreviewPayload = {
  manifest: BackupManifest;
  currentSummary: BackupSummary;
  incomingSummary: BackupSummary;
};

type RestoreAppliedPayload = RestorePreviewPayload & {
  restoredSummary: BackupSummary;
};

type RemoteBackupState = {
  configured: boolean;
  providerLabel: string;
  targetLabel: string;
  latestRuns: RemoteBackupRun[];
};

function extractFileName(contentDisposition: string | null) {
  if (!contentDisposition) {
    return null;
  }

  const match = contentDisposition.match(/filename="([^"]+)"/i);
  return match?.[1] ?? null;
}

async function downloadResponseFile(response: Response, fallbackName: string) {
  const blob = await response.blob();
  const fileName =
    extractFileName(response.headers.get("Content-Disposition")) ?? fallbackName;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function formatRunDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

const summaryLabels: Record<keyof BackupSummary, string> = {
  clients: "Fichas CRM",
  feedbackEntries: "Feedback",
  auditEvents: "Eventos auditoría",
  invoices: "Facturas",
  invoiceReminders: "Recordatorios",
  commercialDocuments: "Pre-facturación",
  documentSignatureRequests: "Solicitudes firma",
  expenses: "Gastos",
  bankMovements: "Mov. banca",
  aiUsageRows: "Registros IA",
  messageConnections: "Conexiones",
  messageThreads: "Conversaciones",
  messageRecords: "Mensajes",
  mailThreads: "Hilos correo",
  mailMessages: "Emails",
};

const summaryOrder = Object.keys(summaryLabels) as Array<keyof BackupSummary>;

function getSummaryComparisonRows(current: BackupSummary, incoming: BackupSummary) {
  return summaryOrder.map((key) => {
    const currentValue = current[key];
    const incomingValue = incoming[key];

    return {
      key,
      label: summaryLabels[key],
      currentValue,
      incomingValue,
      delta: incomingValue - currentValue,
    };
  });
}

export function BackupCenter({
  summary,
  demoMode,
  remoteState,
}: {
  summary: BackupSummary;
  demoMode: boolean;
  remoteState: RemoteBackupState;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isPushingRemote, setIsPushingRemote] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [restorePreview, setRestorePreview] = useState<RestorePreviewPayload | null>(
    null,
  );
  const [appliedRestore, setAppliedRestore] = useState<RestoreAppliedPayload | null>(
    null,
  );

  async function handleExport() {
    setIsExporting(true);

    try {
      const response = await fetch("/api/backups/export", {
        method: "GET",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(
          payload?.error ?? "No se ha podido generar la copia de seguridad.",
        );
      }

      await downloadResponseFile(response, "facturaia-backup.json");
      toast.success("Copia de seguridad descargada.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se ha podido descargar la copia de seguridad.",
      );
    } finally {
      setIsExporting(false);
    }
  }

  async function handleRestore() {
    const file = fileInputRef.current?.files?.[0];

    if (!file) {
      toast.error("Selecciona antes un archivo JSON de copia de seguridad.");
      return;
    }

    setIsRestoring(true);

    try {
      const formData = new FormData();
      formData.append("backup", file);

      const response = await fetch("/api/backups/restore", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | (RestorePreviewPayload & { restoredSummary: BackupSummary });

      if (!response.ok) {
        throw new Error(
          "error" in (payload ?? {})
            ? (payload as { error?: string }).error
            : "No se ha podido restaurar la copia de seguridad.",
        );
      }

      if (
        !payload ||
        !("manifest" in payload) ||
        !("restoredSummary" in payload) ||
        !payload.manifest
      ) {
        throw new Error("La restauración terminó sin devolver un resumen válido.");
      }

      setAppliedRestore({
        manifest: payload.manifest,
        currentSummary: payload.currentSummary,
        incomingSummary: payload.incomingSummary,
        restoredSummary: payload.restoredSummary,
      });
      setRestorePreview({
        manifest: payload.manifest,
        currentSummary: payload.currentSummary,
        incomingSummary: payload.incomingSummary,
      });

      toast.success("Copia restaurada correctamente. Revisa el resumen aplicado.");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se ha podido restaurar la copia de seguridad.",
      );
    } finally {
      setIsRestoring(false);
    }
  }

  async function inspectBackupFile(file: File) {
    setIsPreviewing(true);
    setRestorePreview(null);
    setAppliedRestore(null);

    try {
      const formData = new FormData();
      formData.append("backup", file);
      formData.append("dryRun", "1");

      const response = await fetch("/api/backups/restore", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | (RestorePreviewPayload & { dryRun?: boolean });

      if (!response.ok) {
        throw new Error(
          "error" in (payload ?? {})
            ? (payload as { error?: string }).error
            : "No se ha podido validar la copia de seguridad.",
        );
      }

      if (!payload || !("manifest" in payload) || !payload.manifest) {
        throw new Error("La validación del backup no devolvió un manifest válido.");
      }

      setRestorePreview({
        manifest: payload.manifest,
        currentSummary: payload.currentSummary,
        incomingSummary: payload.incomingSummary,
      });
      toast.success("Copia validada. Ya puedes revisar el impacto antes de restaurar.");
    } catch (error) {
      setRestorePreview(null);
      toast.error(
        error instanceof Error
          ? error.message
          : "No se ha podido validar la copia de seguridad.",
      );
    } finally {
      setIsPreviewing(false);
    }
  }

  async function handleBackupFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedFileName(file?.name ?? "");
    setRestorePreview(null);
    setAppliedRestore(null);

    if (!file || demoMode) {
      return;
    }

    await inspectBackupFile(file);
  }

  async function handleRemotePush() {
    setIsPushingRemote(true);

    try {
      const response = await fetch("/api/backups/push", {
        method: "POST",
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | { remotePath?: string; fileName?: string };

      if (!response.ok) {
        throw new Error(
          "error" in (payload ?? {})
            ? (payload as { error?: string }).error
            : "No se ha podido enviar el backup remoto.",
        );
      }

      toast.success(
        "Backup remoto enviado correctamente a tu almacenamiento externo.",
      );
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se ha podido enviar el backup remoto.",
      );
    } finally {
      setIsPushingRemote(false);
    }
  }

  const visibleSummary = appliedRestore?.restoredSummary ?? summary;
  const stats = summaryOrder.map((key) => ({
    label: summaryLabels[key],
    value: visibleSummary[key],
  }));
  const previewRows = restorePreview
    ? getSummaryComparisonRows(restorePreview.currentSummary, restorePreview.incomingSummary)
    : [];
  const appliedRows = appliedRestore
    ? getSummaryComparisonRows(appliedRestore.currentSummary, appliedRestore.restoredSummary)
    : [];

  return (
    <div className="space-y-6">
      {demoMode ? (
        <div className="status-banner">
          Estás en modo demo local. Puedes exportar una copia de ejemplo, pero la
          restauración real y el envío remoto están desactivados.
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-12">
        {stats.map((item) => (
          <Card key={item.label}>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className="font-display text-4xl text-foreground">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="overflow-hidden bg-[linear-gradient(150deg,rgba(255,255,255,0.95),rgba(232,246,242,0.9))]">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-white p-3 text-[color:var(--color-brand)]">
                <DatabaseBackup className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Exportar copia completa</CardTitle>
                <CardDescription>
                  Descarga un JSON con perfil, CRM, firmas, facturación, IA y mensajería del usuario autenticado.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-[26px] bg-white/82 p-5 text-sm leading-7 text-muted-foreground">
              Esta copia sirve para mover tu instalación entre equipos o mantener un
              respaldo manual antes de tocar la base de datos. No incluye binarios del
              storage: el logo se conserva como ruta y URL.
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={handleExport} disabled={isExporting}>
                {isExporting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Descargar backup JSON
              </Button>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/82 px-4 py-2 text-sm text-muted-foreground">
                <HardDriveDownload className="h-4 w-4 text-[color:var(--color-brand)]" />
                Copia local inmediata
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[color:var(--color-panel)] p-3 text-[color:var(--color-brand)]">
                <RotateCcw className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Restaurar en modo reemplazo</CardTitle>
                <CardDescription>
                  Sustituye tus datos actuales por el contenido del archivo importado.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-[26px] bg-[color:rgba(202,145,34,0.12)] p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-1 h-5 w-5 text-[color:#8b5b00]" />
                <p className="text-sm leading-7 text-[color:#6d4b00]">
                  La restauración elimina antes las facturas, el histórico de IA y la
                  mensajería actuales del usuario autenticado. Úsala como operación
                  consciente para migrar o recuperar tu instalación.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="backupFile">Archivo de backup</Label>
              <Input
                id="backupFile"
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleBackupFileChange}
                disabled={demoMode || isRestoring || isPreviewing}
              />
              <p className="text-sm text-muted-foreground">
                {selectedFileName
                  ? `Archivo seleccionado: ${selectedFileName}`
                  : "Selecciona un JSON exportado previamente desde FacturaIA."}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handleRestore}
                disabled={demoMode || isRestoring || isPreviewing}
              >
                {isRestoring ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Restaurar copia
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const file = fileInputRef.current?.files?.[0];

                  if (!file) {
                    toast.error("Selecciona antes un archivo JSON de copia de seguridad.");
                    return;
                  }

                  void inspectBackupFile(file);
                }}
                disabled={demoMode || isRestoring || isPreviewing}
              >
                {isPreviewing ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                Validar impacto
              </Button>
              <div className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-panel)] px-4 py-2 text-sm text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-[color:var(--color-success)]" />
                Operación pensada para instalaciones privadas
              </div>
            </div>

            {restorePreview ? (
              <div className="space-y-4 rounded-[26px] border border-border/60 bg-white/78 p-5">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-foreground">
                    Validación previa del backup
                  </p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Exportado el {formatRunDate(restorePreview.manifest.exportedAt)} desde{" "}
                    {restorePreview.manifest.appUrl}. Incluye los módulos:{" "}
                    {restorePreview.manifest.modulesIncluded.join(", ")}.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {previewRows.map((row) => (
                    <div
                      key={row.key}
                      className="rounded-[20px] bg-[color:var(--color-panel)] p-4"
                    >
                      <p className="text-sm text-muted-foreground">{row.label}</p>
                      <div className="mt-3 flex items-end justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                            Actual
                          </p>
                          <p className="font-display text-2xl text-foreground">
                            {row.currentValue}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                            Backup
                          </p>
                          <p className="font-display text-2xl text-foreground">
                            {row.incomingValue}
                          </p>
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-muted-foreground">
                        Cambio:{" "}
                        <span
                          className={
                            row.delta === 0
                              ? "text-foreground"
                              : row.delta > 0
                                ? "text-[color:var(--color-success)]"
                                : "text-[color:#a6451a]"
                          }
                        >
                          {row.delta > 0 ? `+${row.delta}` : row.delta}
                        </span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {appliedRestore ? (
              <div className="space-y-4 rounded-[26px] border border-[color:rgba(45,137,94,0.18)] bg-[color:rgba(225,244,236,0.7)] p-5">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-[color:#1f5b3f]">
                    Restauración aplicada
                  </p>
                  <p className="text-sm leading-6 text-[color:#355847]">
                    FacturaIA ha reemplazado el estado actual con la copia validada y ha
                    recalculado el resumen operativo de esta instalación.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {appliedRows.map((row) => (
                    <div key={row.key} className="rounded-[20px] bg-white/82 p-4">
                      <p className="text-sm text-muted-foreground">{row.label}</p>
                      <div className="mt-3 flex items-end justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                            Antes
                          </p>
                          <p className="font-display text-2xl text-foreground">
                            {row.currentValue}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                            Ahora
                          </p>
                          <p className="font-display text-2xl text-foreground">
                            {row.incomingValue}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="overflow-hidden bg-[linear-gradient(155deg,rgba(19,45,52,0.96),rgba(37,81,89,0.98))] text-white">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-white/12 p-3 text-white">
                <CloudUpload className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-white">Backups remotos</CardTitle>
                <CardDescription className="text-white/72">
                  Primer módulo adicional del sistema modular, ya operativo con WebDAV / Nextcloud.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-[26px] bg-white/10 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-white">
                  {remoteState.providerLabel}
                </p>
                <span className="rounded-full bg-white/14 px-3 py-1 text-xs uppercase tracking-[0.14em] text-white/80">
                  {remoteState.configured ? "Configurado" : "Pendiente"}
                </span>
              </div>
              <p className="mt-3 break-all text-sm leading-7 text-white/78">
                {remoteState.targetLabel}
              </p>
            </div>

            {remoteState.configured ? (
              <>
                <Button
                  onClick={handleRemotePush}
                  disabled={demoMode || isPushingRemote}
                  className="bg-white text-[color:rgba(19,45,52,0.96)] hover:bg-white/92"
                >
                  {isPushingRemote ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <CloudUpload className="h-4 w-4" />
                  )}
                  Enviar copia remota ahora
                </Button>

                <div className="space-y-3">
                  <p className="text-sm font-semibold text-white">
                    Últimas ejecuciones
                  </p>
                  {remoteState.latestRuns.length > 0 ? (
                    <div className="space-y-3">
                      {remoteState.latestRuns.map((run) => (
                        <div
                          key={run.id}
                          className="rounded-[22px] bg-white/10 p-4 text-sm"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-medium text-white">
                              {run.status === "success"
                                ? "Sincronización correcta"
                                : "Sincronización con error"}
                            </p>
                            <span className="text-white/72">
                              {formatRunDate(run.created_at)}
                            </span>
                          </div>
                          <p className="mt-2 break-all text-white/76">
                            {run.status === "success"
                              ? run.remote_path
                              : run.error_message ?? "Sin detalle adicional."}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[22px] bg-white/10 p-4 text-sm leading-7 text-white/76">
                      Todavía no hay ejecuciones registradas. Lanza la primera copia remota
                      desde este panel y quedará reflejada aquí.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="rounded-[22px] bg-white/10 p-4 text-sm leading-7 text-white/78">
                  Para activarlo necesitas definir `REMOTE_BACKUP_PROVIDER`,
                  `WEBDAV_BASE_URL`, `WEBDAV_USERNAME`, `WEBDAV_PASSWORD` y
                  `WEBDAV_BACKUP_PATH` en tu `.env.local` o en el panel de tu servidor.
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="secondary"
                    asChild
                    className="bg-white text-[color:rgba(19,45,52,0.96)] hover:bg-white/92"
                  >
                    <Link href="/modules">Ver módulo</Link>
                  </Button>
                  <Button
                    variant="outline"
                    asChild
                    className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
                  >
                    <Link href="/system">Revisar entorno</Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
