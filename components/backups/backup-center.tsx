"use client";

import { useRef, useState } from "react";
import {
  AlertTriangle,
  DatabaseBackup,
  Download,
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

type BackupSummary = {
  invoices: number;
  aiUsageRows: number;
  messageConnections: number;
  messageThreads: number;
  messageRecords: number;
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

export function BackupCenter({
  summary,
  demoMode,
}: {
  summary: BackupSummary;
  demoMode: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState("");

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
        | { restored?: BackupSummary };

      if (!response.ok) {
        throw new Error(
          "error" in (payload ?? {})
            ? (payload as { error?: string }).error
            : "No se ha podido restaurar la copia de seguridad.",
        );
      }

      toast.success("Copia restaurada. Recarga la página para ver el nuevo estado.");
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

  return (
    <div className="space-y-6">
      {demoMode ? (
        <div className="status-banner">
          Estás en modo demo local. Puedes exportar una copia de ejemplo, pero la restauración real está desactivada.
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Facturas", value: summary.invoices },
          { label: "Registros IA", value: summary.aiUsageRows },
          { label: "Conexiones", value: summary.messageConnections },
          { label: "Conversaciones", value: summary.messageThreads },
          { label: "Mensajes", value: summary.messageRecords },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className="font-display text-4xl text-foreground">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="overflow-hidden bg-[linear-gradient(150deg,rgba(255,255,255,0.95),rgba(232,246,242,0.9))]">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-white p-3 text-[color:var(--color-brand)]">
                <DatabaseBackup className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Exportar copia completa</CardTitle>
                <CardDescription>
                  Descarga un JSON con perfil, facturas, IA y mensajería del usuario autenticado.
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

            <Button onClick={handleExport} disabled={isExporting}>
              {isExporting ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Descargar backup JSON
            </Button>
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
                onChange={(event) =>
                  setSelectedFileName(event.target.files?.[0]?.name ?? "")
                }
                disabled={demoMode || isRestoring}
              />
              <p className="text-sm text-muted-foreground">
                {selectedFileName
                  ? `Archivo seleccionado: ${selectedFileName}`
                  : "Selecciona un JSON exportado previamente desde FacturaIA."}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={handleRestore} disabled={demoMode || isRestoring}>
                {isRestoring ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Restaurar copia
              </Button>
              <div className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-panel)] px-4 py-2 text-sm text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-[color:var(--color-success)]" />
                Operación pensada para instalaciones privadas
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
