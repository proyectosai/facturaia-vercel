"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Minus, Plus, ReceiptText, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { createInvoiceAction } from "@/lib/actions/invoices";
import { calculateInvoicePreview } from "@/lib/invoice-math";
import type {
  AppUserRecord,
  InvoiceLineItemInput,
  Profile,
  VatRate,
} from "@/lib/types";
import { formatCurrency, roundCurrency } from "@/lib/utils";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

const DESCRIPTION_TEMPLATES = [
  "Servicio de consultoría estratégica",
  "Diseño y desarrollo web a medida",
  "Mantenimiento mensual y soporte técnico",
  "Auditoría y optimización de procesos",
];

function createEmptyLine(): InvoiceLineItemInput {
  return {
    description: "",
    quantity: 1,
    unitPrice: 0,
    vatRate: 21,
  };
}

function isValidDraft(value: unknown): value is {
  lines: InvoiceLineItemInput[];
  irpfRate: number;
  aiContext: string;
} {
  if (!value || typeof value !== "object") {
    return false;
  }

  const draft = value as {
    lines?: unknown;
    irpfRate?: unknown;
    aiContext?: unknown;
  };

  return (
    Array.isArray(draft.lines) &&
    typeof draft.irpfRate === "number" &&
    typeof draft.aiContext === "string"
  );
}

export function InvoiceForm({
  profile,
  appUser,
  aiUsage,
  demoMode = false,
}: {
  profile: Profile;
  appUser: AppUserRecord;
  aiUsage: {
    date: string;
    used: number;
    limit: number | null;
    remaining: number | null;
    blocked: boolean;
    effectivePlan: string;
  };
  demoMode?: boolean;
}) {
  const draftStorageKey = `facturaia.invoice-draft.${appUser.id}`;
  const [lines, setLines] = useState<InvoiceLineItemInput[]>([createEmptyLine()]);
  const [activeLine, setActiveLine] = useState(0);
  const [irpfRate, setIrpfRate] = useState(0);
  const [aiContext, setAiContext] = useState("");
  const [aiUsedToday, setAiUsedToday] = useState(aiUsage.used);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [isDraftReady, setIsDraftReady] = useState(false);
  const visibleLines = lines.filter((line) => line.description.trim().length > 0);
  const preview = calculateInvoicePreview(visibleLines, irpfRate);
  const canCreateInvoice = !demoMode;

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(draftStorageKey);

      if (!stored) {
        return;
      }

      const parsed = JSON.parse(stored) as unknown;

      if (!isValidDraft(parsed)) {
        return;
      }

      if (parsed.lines.length > 0) {
        setLines(parsed.lines);
      }

      setIrpfRate(parsed.irpfRate);
      setAiContext(parsed.aiContext);
    } catch {
      // Si el borrador local falla, continuamos con el estado inicial del formulario.
    } finally {
      setIsDraftReady(true);
    }
  }, [draftStorageKey]);

  useEffect(() => {
    if (!isDraftReady) {
      return;
    }

    window.localStorage.setItem(
      draftStorageKey,
      JSON.stringify({
        lines,
        irpfRate,
        aiContext,
      }),
    );
  }, [aiContext, draftStorageKey, irpfRate, isDraftReady, lines]);

  function setLineValue<T extends keyof InvoiceLineItemInput>(
    index: number,
    field: T,
    value: InvoiceLineItemInput[T],
  ) {
    setLines((current) =>
      current.map((line, currentIndex) =>
        currentIndex === index ? { ...line, [field]: value } : line,
      ),
    );
  }

  function addLine() {
    setLines((current) => [...current, createEmptyLine()]);
    setActiveLine(lines.length);
  }

  function removeLine(index: number) {
    setLines((current) => {
      if (current.length === 1) {
        return [createEmptyLine()];
      }

      return current.filter((_, currentIndex) => currentIndex !== index);
    });
    setActiveLine((current) => Math.max(0, current - 1));
  }

  function applyDescriptionTemplate(template: string) {
    setLines((current) =>
      current.map((line, index) =>
        index === activeLine
          ? {
              ...line,
              description: template,
            }
          : line,
      ),
    );
    toast.success("Plantilla aplicada en la línea activa.");
  }

  function clearDraft() {
    setLines([createEmptyLine()]);
    setActiveLine(0);
    setIrpfRate(0);
    setAiContext("");
    window.localStorage.removeItem(draftStorageKey);
    toast.success("Borrador local limpiado.");
  }

  async function fillWithAiPrompt() {
    const lineIndex = activeLine;
    const baseDescription = lines[lineIndex]?.description.trim() ?? "";

    if (!baseDescription) {
      toast.error("Escribe primero una descripción base en la línea activa.");
      return;
    }

    setIsAiGenerating(true);

    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description: baseDescription,
          context: aiContext.trim() || undefined,
        }),
      });

      const payload = (await response.json()) as {
        improvedText?: string;
        error?: string;
      };

      if (!response.ok || !payload.improvedText) {
        throw new Error(
          payload.error ?? "No se ha podido mejorar la descripción con la IA local.",
        );
      }

      setLines((current) =>
        current.map((line, index) =>
          index === lineIndex
            ? {
                ...line,
                description: payload.improvedText!,
              }
            : line,
        ),
      );
      setAiUsedToday((current) => current + 1);

      toast.success("Descripción mejorada con la IA local.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se ha podido mejorar la descripción con la IA local.",
      );
    } finally {
      setIsAiGenerating(false);
    }
  }

  return (
    <>
      <form action={demoMode ? undefined : createInvoiceAction} className="space-y-8">
        <input
          type="hidden"
          name="lines"
          value={JSON.stringify(visibleLines.length > 0 ? visibleLines : lines)}
        />
        <input
          type="hidden"
          name="existingLogoPath"
          value={profile.logo_path ?? ""}
        />
        <input
          type="hidden"
          name="existingLogoUrl"
          value={profile.logo_url ?? ""}
        />

        <Card className="overflow-hidden border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.95),rgba(233,244,240,0.86))]">
          <CardContent className="grid gap-4 p-6 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[26px] bg-white/82 p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Conceptos listos
              </p>
              <p className="mt-3 text-3xl font-semibold text-foreground">
                {visibleLines.length}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                De {lines.length} líneas actuales. La línea activa es la {activeLine + 1}.
              </p>
            </div>

            <div className="rounded-[26px] bg-white/82 p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Total en vivo
              </p>
              <p className="mt-3 text-3xl font-semibold text-foreground">
                {formatCurrency(preview.totals.grandTotal)}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                El cálculo ya contempla IVA y la retención IRPF si la aplicas.
              </p>
            </div>

            <div className="rounded-[26px] bg-white/82 p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Borrador local
              </p>
              <p className="mt-3 text-2xl font-semibold text-foreground">
                {isDraftReady ? "Activo" : "Cargando"}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                El navegador guarda automáticamente líneas, IRPF y contexto de IA.
              </p>
            </div>

            <div className="rounded-[26px] bg-[color:rgba(19,45,52,0.94)] p-4 text-white shadow-lg">
              <p className="text-xs uppercase tracking-[0.16em] text-white/70">
                Estado de emisión
              </p>
              <p className="mt-3 text-2xl font-semibold text-white">
                {canCreateInvoice ? "Lista para emitir" : "Revisar formulario"}
              </p>
              <p className="mt-2 text-sm leading-6 text-white/82">
                Si tienes dudas fiscales concretas, usa la pestaña de legislación antes de cerrar la factura.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
          <div className="space-y-6">
            <Card className="border-white/60 bg-white/84">
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>Paso 1</Badge>
                  <Badge variant="secondary">Perfil fiscal</Badge>
                </div>
                <CardTitle>Datos del emisor</CardTitle>
                <CardDescription>
                  Estos datos se guardan en tu perfil para próximas facturas.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="issuerName">Nombre o razón social</Label>
                  <Input
                    id="issuerName"
                    name="issuerName"
                    defaultValue={profile.full_name ?? ""}
                    placeholder="FacturaIA Studio S.L."
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="issuerNif">NIF</Label>
                  <Input
                    id="issuerNif"
                    name="issuerNif"
                    defaultValue={profile.nif ?? ""}
                    placeholder="B12345678"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="issueDate">Fecha de emisión</Label>
                  <Input
                    id="issueDate"
                    name="issueDate"
                    type="date"
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    required
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="issuerAddress">Dirección</Label>
                  <Input
                    id="issuerAddress"
                    name="issuerAddress"
                    defaultValue={profile.address ?? ""}
                    placeholder="Calle Alcalá 123, Madrid"
                    required
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="issuerLogo">Logo</Label>
                  <Input
                    id="issuerLogo"
                    name="issuerLogo"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  />
                  {profile.logo_url ? (
                    <div className="flex items-center gap-3 rounded-3xl bg-[color:var(--color-panel)] p-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={profile.logo_url}
                        alt="Logo actual"
                        className="h-14 w-14 rounded-2xl object-cover"
                      />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Logo actual guardado en Supabase Storage
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Si subes uno nuevo, lo usaremos también en futuras facturas.
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/60 bg-white/84">
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>Paso 2</Badge>
                  <Badge variant="secondary">Destino de la factura</Badge>
                </div>
                <CardTitle>Datos del cliente</CardTitle>
                <CardDescription>
                  Información fiscal y de contacto del destinatario.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="clientName">Nombre</Label>
                  <Input
                    id="clientName"
                    name="clientName"
                    placeholder="Cliente Ejemplo S.L."
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clientNif">NIF</Label>
                  <Input
                    id="clientNif"
                    name="clientNif"
                    placeholder="B87654321"
                    required
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="clientAddress">Dirección</Label>
                  <Input
                    id="clientAddress"
                    name="clientAddress"
                    placeholder="Avenida Diagonal 45, Barcelona"
                    required
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="clientEmail">Email</Label>
                  <Input
                    id="clientEmail"
                    name="clientEmail"
                    type="email"
                    placeholder="facturacion@cliente.es"
                    required
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="h-fit border-white/60 bg-white/84 xl:sticky xl:top-24">
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <Badge>Paso 3</Badge>
                <Badge variant="secondary">Revisión rápida</Badge>
              </div>
              <CardTitle>Resumen fiscal</CardTitle>
              <CardDescription>
                Vista previa en tiempo real antes de generar la factura.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-[26px] bg-[color:var(--color-panel)] p-4 text-sm text-muted-foreground">
                Instalación privada ·{" "}
                <strong className="text-foreground">
                  sin límites artificiales de facturación
                </strong>
              </div>

              <div className="rounded-[26px] bg-[color:var(--color-panel)] p-4 text-sm text-muted-foreground">
                Mejoras IA hoy:{" "}
                <strong className="text-foreground">{aiUsedToday}</strong>
                {" · "}
                <strong className="text-foreground">
                  uso local sin límite de plan
                </strong>
              </div>

              <div className="space-y-2">
                <Label htmlFor="irpfRate">Retención IRPF (%)</Label>
                <Input
                  id="irpfRate"
                  name="irpfRate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={irpfRate}
                  onChange={(event) =>
                    setIrpfRate(roundCurrency(Number(event.target.value) || 0))
                  }
                />
              </div>

              <div className="rounded-[26px] bg-[color:var(--color-panel)] p-5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Base imponible</span>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(preview.totals.subtotal)}
                  </span>
                </div>

                <div className="mt-4 space-y-2">
                  {preview.totals.vatBreakdown.length > 0 ? (
                    preview.totals.vatBreakdown.map((entry) => (
                      <div
                        key={entry.rate}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-muted-foreground">
                          IVA {entry.rate}% sobre {formatCurrency(entry.taxableBase)}
                        </span>
                        <span className="font-semibold text-foreground">
                          {formatCurrency(entry.vatAmount)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Añade conceptos para ver el desglose de IVA.
                    </p>
                  )}
                </div>

                {preview.totals.irpfRate > 0 ? (
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Retención IRPF ({preview.totals.irpfRate}%)
                    </span>
                    <span className="font-semibold text-foreground">
                      -{formatCurrency(preview.totals.irpfAmount)}
                    </span>
                  </div>
                ) : null}

                <div className="mt-5 flex items-center justify-between border-t border-white/60 pt-5">
                  <span className="font-display text-2xl text-foreground">
                    Total final
                  </span>
                  <span className="font-display text-3xl text-[color:var(--color-brand)]">
                    {formatCurrency(preview.totals.grandTotal)}
                  </span>
                </div>
              </div>

              <div className="rounded-[26px] border border-[color:var(--color-brand-soft)] bg-white/70 p-4 text-sm text-muted-foreground">
                El PDF incluirá numeración automática, QR con URL pública,
                desglose de IVA y pie &quot;Factura preparada para VeriFactu&quot;.
              </div>

              <div className="rounded-[26px] bg-[color:rgba(19,45,52,0.94)] p-4 text-sm text-white">
                <p className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-white/80" />
                  Usa la pestaña de legislación para abrir BOE y AEAT si necesitas contrastar bases legales o plazos de adaptación.
                </p>
              </div>

              {demoMode ? (
                <div className="rounded-[26px] border border-dashed border-[color:var(--color-brand-soft)] bg-white/70 p-4 text-sm text-muted-foreground">
                  Modo demo: esta pantalla sirve para probar la experiencia y la IA local. La creación real en base de datos está temporalmente desactivada.
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <Card className="border-white/60 bg-white/84">
          <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 flex flex-wrap gap-2">
                <Badge>Paso 4</Badge>
                <Badge variant="secondary">
                  {visibleLines.length > 0
                    ? `${visibleLines.length} concepto${visibleLines.length > 1 ? "s" : ""} listo${visibleLines.length > 1 ? "s" : ""}`
                    : "Sin conceptos cerrados"}
                </Badge>
              </div>
              <CardTitle>Conceptos de la factura</CardTitle>
              <CardDescription>
                Gestiona líneas, IVA y redacción con una vista pensada para escritorio y móvil.
              </CardDescription>
            </div>

            <Button
              type="button"
              variant="secondary"
              onClick={() => void fillWithAiPrompt()}
              disabled={isAiGenerating}
            >
              <Sparkles className="h-4 w-4" />
              {isAiGenerating ? "Generando con IA local..." : "Generar con IA"}
            </Button>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-[28px] border border-[color:var(--color-brand-soft)] bg-[linear-gradient(145deg,rgba(233,244,240,0.7),rgba(255,255,255,0.95))] p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-white p-2.5 text-[color:var(--color-brand)] shadow-sm">
                    <ReceiptText className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">
                      Plantillas rápidas
                    </p>
                    <p className="text-sm leading-6 text-muted-foreground">
                      Aplícalas sobre la línea activa y luego ajusta el detalle.
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {DESCRIPTION_TEMPLATES.map((template) => (
                    <Button
                      key={template}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => applyDescriptionTemplate(template)}
                    >
                      {template}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] bg-[color:var(--color-panel)] p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-white p-2.5 text-[color:var(--color-brand)] shadow-sm">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">
                      Contexto para la IA
                    </p>
                    <p className="text-sm leading-6 text-muted-foreground">
                      Aclara sector, tono o periodo para mejorar mejor la línea activa.
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <Label htmlFor="aiContext">Contexto</Label>
                  <Textarea
                    id="aiContext"
                    value={aiContext}
                    onChange={(event) => setAiContext(event.target.value)}
                    placeholder="Opcional: sector, tipo de servicio, tono deseado o detalles que ayuden a redactar mejor la descripción."
                    className="min-h-24"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-[26px] border border-dashed border-[color:var(--color-brand-soft)] bg-white/70 p-4 text-sm text-muted-foreground">
              <p className="flex flex-wrap items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[color:var(--color-brand)]" />
                Línea activa:
                <strong className="text-foreground">{activeLine + 1}</strong>
                <span>·</span>
                Borrador local guardado automáticamente en este navegador.
              </p>
            </div>

            <div className="space-y-4 md:hidden">
              {lines.map((line, index) => {
                const rowPreview = calculateInvoicePreview(
                  line.description.trim().length > 0 ? [line] : [],
                  0,
                );
                const lineTotal = rowPreview.lineItems[0]?.lineTotal ?? 0;
                const isActive = activeLine === index;

                return (
                  <div
                    key={`mobile-line-${index}`}
                    className={`rounded-[28px] border p-4 ${
                      isActive
                        ? "border-[color:var(--color-brand)] bg-white"
                        : "border-white/60 bg-white/75"
                    }`}
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          Línea {index + 1}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Total: {formatCurrency(lineTotal)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {isActive ? (
                          <span className="rounded-full bg-[color:var(--color-brand-soft)] px-3 py-1 text-xs font-semibold text-[color:var(--color-brand)]">
                            Activa
                          </span>
                        ) : null}
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => removeLine(index)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <Label>Descripción</Label>
                        <Input
                          value={line.description}
                          placeholder="Servicio de consultoría estratégica"
                          onFocus={() => setActiveLine(index)}
                          onChange={(event) =>
                            setLineValue(index, "description", event.target.value)
                          }
                        />
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Cantidad</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.quantity}
                            onFocus={() => setActiveLine(index)}
                            onChange={(event) =>
                              setLineValue(
                                index,
                                "quantity",
                                roundCurrency(Number(event.target.value) || 0),
                              )
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Precio unitario</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.unitPrice}
                            onFocus={() => setActiveLine(index)}
                            onChange={(event) =>
                              setLineValue(
                                index,
                                "unitPrice",
                                roundCurrency(Number(event.target.value) || 0),
                              )
                            }
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>IVA</Label>
                        <Select
                          value={String(line.vatRate)}
                          onValueChange={(value) =>
                            setLineValue(index, "vatRate", Number(value) as VatRate)
                          }
                        >
                          <SelectTrigger onClick={() => setActiveLine(index)}>
                            <SelectValue placeholder="IVA" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="21">21%</SelectItem>
                            <SelectItem value="10">10%</SelectItem>
                            <SelectItem value="4">4%</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[42%]">Descripción</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Precio unitario</TableHead>
                    <TableHead>IVA</TableHead>
                    <TableHead>Total línea</TableHead>
                    <TableHead className="w-[68px] text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line, index) => {
                    const rowPreview = calculateInvoicePreview(
                      line.description.trim().length > 0 ? [line] : [],
                      0,
                    );
                    const lineTotal = rowPreview.lineItems[0]?.lineTotal ?? 0;

                    return (
                      <TableRow
                        key={`line-${index}`}
                        className={activeLine === index ? "bg-white/70" : ""}
                      >
                        <TableCell>
                          <Input
                            value={line.description}
                            placeholder="Servicio de consultoría estratégica"
                            onFocus={() => setActiveLine(index)}
                            onChange={(event) =>
                              setLineValue(index, "description", event.target.value)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.quantity}
                            onFocus={() => setActiveLine(index)}
                            onChange={(event) =>
                              setLineValue(
                                index,
                                "quantity",
                                roundCurrency(Number(event.target.value) || 0),
                              )
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.unitPrice}
                            onFocus={() => setActiveLine(index)}
                            onChange={(event) =>
                              setLineValue(
                                index,
                                "unitPrice",
                                roundCurrency(Number(event.target.value) || 0),
                              )
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={String(line.vatRate)}
                            onValueChange={(value) =>
                              setLineValue(index, "vatRate", Number(value) as VatRate)
                            }
                          >
                            <SelectTrigger onClick={() => setActiveLine(index)}>
                              <SelectValue placeholder="IVA" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="21">21%</SelectItem>
                              <SelectItem value="10">10%</SelectItem>
                              <SelectItem value="4">4%</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="font-semibold text-foreground">
                          {formatCurrency(lineTotal)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => removeLine(index)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button type="button" variant="outline" onClick={addLine}>
                  <Plus className="h-4 w-4" />
                  Añadir línea
                </Button>
                <Button type="button" variant="ghost" onClick={clearDraft}>
                  Limpiar borrador local
                </Button>
              </div>

              {canCreateInvoice ? (
                <SubmitButton
                  pendingLabel="Generando factura..."
                  className="sm:min-w-[220px]"
                >
                  Generar Factura
                </SubmitButton>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  className="sm:min-w-[260px]"
                  disabled
                >
                  Generación real desactivada en demo
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </form>
    </>
  );
}
