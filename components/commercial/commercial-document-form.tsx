"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, FileCheck2, FileText, Minus, Plus } from "lucide-react";

import { createCommercialDocumentAction } from "@/lib/actions/commercial-documents";
import { calculateInvoicePreview } from "@/lib/invoice-math";
import type {
  CommercialDocumentType,
  InvoiceLineItemInput,
  Profile,
  VatRate,
} from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const LINE_TEMPLATES = [
  "Diagnóstico inicial y mapa de procesos",
  "Acompañamiento mensual y seguimiento operativo",
  "Entrega documental y checklist final",
  "Implantación y formación del equipo",
];

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getDefaultValidUntil(type: CommercialDocumentType, issueDate: string) {
  if (type !== "quote") {
    return "";
  }

  const date = new Date(`${issueDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 30);

  return date.toISOString().slice(0, 10);
}

function createEmptyLine(): InvoiceLineItemInput {
  return {
    description: "",
    quantity: 1,
    unitPrice: 0,
    vatRate: 21,
  };
}

export function CommercialDocumentForm({
  profile,
  demoMode = false,
}: {
  profile: Profile;
  demoMode?: boolean;
}) {
  const [documentType, setDocumentType] = useState<CommercialDocumentType>("quote");
  const [issueDate, setIssueDate] = useState(getToday());
  const [validUntil, setValidUntil] = useState(getDefaultValidUntil("quote", getToday()));
  const [lines, setLines] = useState<InvoiceLineItemInput[]>([createEmptyLine()]);
  const [activeLine, setActiveLine] = useState(0);
  const [irpfRate, setIrpfRate] = useState(0);
  const [notes, setNotes] = useState("");

  const visibleLines = lines.filter((line) => line.description.trim().length > 0);
  const preview = calculateInvoicePreview(visibleLines.length > 0 ? visibleLines : lines, irpfRate);

  useEffect(() => {
    if (documentType === "quote") {
      setValidUntil((current) => current || getDefaultValidUntil("quote", issueDate));
      return;
    }

    setValidUntil("");
  }, [documentType, issueDate]);

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

  function applyTemplate(template: string) {
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
  }

  return (
    <Card className="border-white/60 bg-white/86">
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Paso 1</Badge>
          <Badge variant="secondary">Módulo documental</Badge>
          {demoMode ? <Badge variant="secondary">Modo demo</Badge> : null}
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle>Crear presupuesto o albarán</CardTitle>
            <CardDescription>
              Usa el mismo perfil fiscal que en facturación y conviértelo después en factura con un clic.
            </CardDescription>
          </div>
          <Tabs
            value={documentType}
            onValueChange={(value) => setDocumentType(value as CommercialDocumentType)}
          >
            <TabsList>
              <TabsTrigger value="quote">
                <FileText className="mr-2 h-4 w-4" />
                Presupuesto
              </TabsTrigger>
              <TabsTrigger value="delivery_note">
                <FileCheck2 className="mr-2 h-4 w-4" />
                Albarán
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>

      <CardContent>
        <form action={demoMode ? undefined : createCommercialDocumentAction} className="space-y-8">
          <input type="hidden" name="documentType" value={documentType} />
          <input
            type="hidden"
            name="lines"
            value={JSON.stringify(visibleLines.length > 0 ? visibleLines : lines)}
          />
          <input type="hidden" name="existingLogoPath" value={profile.logo_path ?? ""} />
          <input type="hidden" name="existingLogoUrl" value={profile.logo_url ?? ""} />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[26px] bg-[color:rgba(241,246,243,0.86)] p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Tipo activo
              </p>
              <p className="mt-3 text-2xl font-semibold text-foreground">
                {documentType === "quote" ? "Presupuesto" : "Albarán"}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Todo lo que guardes aquí quedará listo para su conversión posterior.
              </p>
            </div>

            <div className="rounded-[26px] bg-white p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Líneas activas
              </p>
              <p className="mt-3 text-2xl font-semibold text-foreground">
                {visibleLines.length}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Línea seleccionada: {activeLine + 1}
              </p>
            </div>

            <div className="rounded-[26px] bg-white p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Total estimado
              </p>
              <p className="mt-3 text-2xl font-semibold text-foreground">
                {formatCurrency(preview.totals.grandTotal)}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Ya incluye IVA y retención si decides aplicarla.
              </p>
            </div>

            <div className="rounded-[26px] bg-[color:rgba(19,45,52,0.94)] p-4 text-white">
              <p className="text-xs uppercase tracking-[0.16em] text-white/70">
                Conversión futura
              </p>
              <p className="mt-3 text-2xl font-semibold">
                Lista para factura
              </p>
              <p className="mt-2 text-sm text-white/80">
                FacturaIA reutilizará cliente, líneas y totales al emitir la factura definitiva.
              </p>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-6">
              <Card className="border-white/60 bg-[color:rgba(251,247,241,0.78)]">
                <CardHeader>
                  <CardTitle>Datos del documento</CardTitle>
                  <CardDescription>
                    Ajusta fechas, datos del emisor y la información del cliente que aparecerá en el documento.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="issuerName">Nombre o razón social</Label>
                    <Input
                      id="issuerName"
                      name="issuerName"
                      defaultValue={profile.full_name ?? ""}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="issuerNif">NIF</Label>
                    <Input id="issuerNif" name="issuerNif" defaultValue={profile.nif ?? ""} required />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="issueDate">Fecha</Label>
                    <Input
                      id="issueDate"
                      name="issueDate"
                      type="date"
                      value={issueDate}
                      onChange={(event) => setIssueDate(event.target.value)}
                      required
                    />
                  </div>

                  {documentType === "quote" ? (
                    <div className="space-y-2">
                      <Label htmlFor="validUntil">Validez del presupuesto</Label>
                      <Input
                        id="validUntil"
                        name="validUntil"
                        type="date"
                        value={validUntil}
                        onChange={(event) => setValidUntil(event.target.value)}
                      />
                    </div>
                  ) : (
                    <input type="hidden" name="validUntil" value="" />
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="issuerLogo">Logo opcional</Label>
                    <Input id="issuerLogo" name="issuerLogo" type="file" accept="image/*" />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="issuerAddress">Dirección</Label>
                    <Textarea
                      id="issuerAddress"
                      name="issuerAddress"
                      defaultValue={profile.address ?? ""}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="clientName">Cliente</Label>
                    <Input id="clientName" name="clientName" placeholder="Nexo Digital S.L." required />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="clientNif">NIF cliente</Label>
                    <Input id="clientNif" name="clientNif" placeholder="B12345678" required />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="clientEmail">Email cliente</Label>
                    <Input id="clientEmail" name="clientEmail" type="email" required />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="irpfRate">Retención IRPF</Label>
                    <Input
                      id="irpfRate"
                      name="irpfRate"
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      value={irpfRate}
                      onChange={(event) => setIrpfRate(Number(event.target.value || 0))}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="clientAddress">Dirección del cliente</Label>
                    <Textarea id="clientAddress" name="clientAddress" required />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/60 bg-white">
                <CardHeader>
                  <CardTitle>Conceptos y alcance</CardTitle>
                  <CardDescription>
                    Construye el documento con líneas reutilizables. Puedes empezar por una plantilla rápida.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex flex-wrap gap-2">
                    {LINE_TEMPLATES.map((template) => (
                      <Button
                        key={template}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => applyTemplate(template)}
                      >
                        {template}
                      </Button>
                    ))}
                  </div>

                  <div className="space-y-4">
                    {lines.map((line, index) => (
                      <div
                        key={`commercial-line-${index}`}
                        className={`rounded-[28px] border p-4 transition ${
                          activeLine === index
                            ? "border-[color:var(--color-brand)] bg-[color:rgba(241,246,243,0.85)]"
                            : "border-border/60 bg-[color:rgba(251,247,241,0.72)]"
                        }`}
                        onClick={() => setActiveLine(index)}
                      >
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              Línea {index + 1}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {line.description.trim() ? "Lista para el documento" : "Pendiente de redactar"}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeLine(index)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid gap-4 md:grid-cols-[1.6fr_0.5fr_0.7fr_0.7fr]">
                          <div className="space-y-2">
                            <Label>Descripción</Label>
                            <Textarea
                              value={line.description}
                              onChange={(event) =>
                                setLineValue(index, "description", event.target.value)
                              }
                              placeholder="Describe el alcance o la entrega concreta"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Cantidad</Label>
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              value={line.quantity}
                              onChange={(event) =>
                                setLineValue(index, "quantity", Number(event.target.value || 0))
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Precio unitario</Label>
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              value={line.unitPrice}
                              onChange={(event) =>
                                setLineValue(index, "unitPrice", Number(event.target.value || 0))
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>IVA</Label>
                            <Select
                              value={String(line.vatRate)}
                              onValueChange={(value) =>
                                setLineValue(index, "vatRate", Number(value) as VatRate)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="21">21 %</SelectItem>
                                <SelectItem value="10">10 %</SelectItem>
                                <SelectItem value="4">4 %</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button type="button" variant="outline" onClick={addLine}>
                    <Plus className="h-4 w-4" />
                    Añadir línea
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="border-white/60 bg-[color:rgba(255,255,255,0.95)]">
                <CardHeader>
                  <CardTitle>Resumen económico</CardTitle>
                  <CardDescription>
                    Revisa importes, notas y el objetivo del documento antes de guardarlo.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3 rounded-[28px] bg-[color:rgba(19,45,52,0.94)] p-5 text-white">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/70">Subtotal</span>
                      <span>{formatCurrency(preview.totals.subtotal)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/70">IVA</span>
                      <span>{formatCurrency(preview.totals.vatTotal)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/70">IRPF</span>
                      <span>{formatCurrency(preview.totals.irpfAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-white/15 pt-3 text-base font-semibold">
                      <span>Total</span>
                      <span>{formatCurrency(preview.totals.grandTotal)}</span>
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-[color:rgba(19,45,52,0.08)] bg-[color:rgba(241,246,243,0.86)] p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <CheckCircle2 className="h-4 w-4 text-[color:var(--color-brand)]" />
                      Qué ocurrirá al guardar
                    </div>
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                      <li>Se guarda el documento con su numeración propia.</li>
                      <li>El perfil fiscal del emisor queda actualizado.</li>
                      <li>Más tarde podrás convertirlo en factura sin copiar datos.</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notas internas u observaciones</Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="Condiciones, forma de entrega, validez de la oferta o cualquier nota útil."
                    />
                  </div>

                  {demoMode ? (
                    <Button type="button" disabled className="w-full">
                      Guardado real desactivado en demo
                    </Button>
                  ) : (
                    <SubmitButton className="w-full" pendingLabel="Guardando documento...">
                      Guardar {documentType === "quote" ? "presupuesto" : "albarán"}
                    </SubmitButton>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
