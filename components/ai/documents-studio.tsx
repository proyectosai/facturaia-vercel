"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  Calculator,
  CheckCircle2,
  Copy,
  FileCheck2,
  FileDown,
  FileSignature,
  FileText,
  ImageIcon,
  LoaderCircle,
  Mail,
  ReceiptText,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { AI_DOCUMENT_TYPES, type AiDocumentType } from "@/lib/ai";
import { PlanGateDialog } from "@/components/plan-gate-dialog";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type Preset = {
  id: string;
  title: string;
  summary: string;
  documentType: AiDocumentType;
  brief: string;
  issuerName: string;
  clientName: string;
  suggestedTitle: string;
};

type ReadyTemplate = {
  id: string;
  title: string;
  summary: string;
  documentType: AiDocumentType;
  issuerName: string;
  clientName: string;
  outputTitle: string;
  outputBody: string;
  additionalText: string;
  badge: string;
};

const PRESETS: Preset[] = [
  {
    id: "proposal-retainer",
    title: "Propuesta de acompañamiento mensual",
    summary:
      "Ideal para vender un servicio recurrente con fases, entregables y siguiente paso claro.",
    documentType: "proposal",
    issuerName: "Estudio Rivera Consultoría",
    clientName: "Nexo Digital S.L.",
    suggestedTitle: "Propuesta de servicios",
    brief:
      "Autónomo especializado en procesos y automatización. Propuesta para acompañamiento mensual durante 3 meses. Incluye diagnóstico inicial, 2 sesiones quincenales, informe ejecutivo y seguimiento. Precio orientativo: 950 euros al mes más IVA. Tono comercial pero serio. Debe terminar con siguiente paso claro para aceptar.",
  },
  {
    id: "quote-implementation",
    title: "Presupuesto cerrado por fases",
    summary:
      "Úsalo cuando necesites un documento con inversión, calendario de pagos y validez de oferta.",
    documentType: "quote",
    issuerName: "Estudio Rivera Consultoría",
    clientName: "Costa Verde Retail",
    suggestedTitle: "Presupuesto de servicios",
    brief:
      "Presupuesto para implantar automatizaciones operativas y mejorar procesos internos en una pyme. Incluir análisis inicial, configuración, documentación y soporte de arranque. Precio total 2.450 euros más IVA, dividido en tres hitos de pago. Tono claro, ejecutivo y orientado a cierre.",
  },
  {
    id: "contract-maintenance",
    title: "Contrato de mantenimiento",
    summary:
      "Base contractual para soporte continuo con alcance, honorarios, confidencialidad y resolución.",
    documentType: "service_contract",
    issuerName: "Estudio Rivera Consultoría",
    clientName: "Atalaya Studio",
    suggestedTitle: "Contrato de prestación de servicios",
    brief:
      "Contrato base de prestación de servicios para mantenimiento operativo y soporte técnico mensual. Incluye atención por email, una reunión mensual, mejoras menores y exclusiones claras. Honorarios: 420 euros al mes más IVA. Duración inicial de 6 meses, pago por adelantado, confidencialidad, propiedad intelectual del cliente sobre sus materiales y preaviso de 30 días.",
  },
  {
    id: "payment-reminder",
    title: "Recordatorio de pago elegante",
    summary:
      "Sirve para reclamar una factura vencida con firmeza, pero sin deteriorar la relación comercial.",
    documentType: "payment_reminder",
    issuerName: "Estudio Rivera Consultoría",
    clientName: "Brisa Legal S.L.",
    suggestedTitle: "Recordatorio de pago",
    brief:
      "Redactar recordatorio de pago amable pero firme para una factura vencida hace 12 días. Número de factura FAC-001027, importe 1.185,80 euros. Recordar datos de pago y pedir confirmación. Tono profesional, sin sonar agresivo.",
  },
  {
    id: "invoice-email",
    title: "Email de envío de factura",
    summary:
      "Correo breve para acompañar una factura, indicar importe y dejar claro el plazo de pago.",
    documentType: "invoice_email",
    issuerName: "Estudio Rivera Consultoría",
    clientName: "Luna Norte Coop.",
    suggestedTitle: "Email de envío de factura",
    brief:
      "Email para enviar factura correspondiente a una auditoría de procesos. Indicar que se adjunta el PDF, importe total 1.452 euros IVA incluido y vencimiento a 15 días. Tono cercano pero profesional. Añadir línea final invitando a responder si necesitan cualquier aclaración.",
  },
];

const READY_TEMPLATES: ReadyTemplate[] = [
  {
    id: "ready-proposal",
    title: "Propuesta profesional completa",
    summary:
      "Una base editorial sólida para vender acompañamiento mensual con cronograma, entregables y precio.",
    documentType: "proposal",
    issuerName: "Estudio Rivera Consultoría",
    clientName: "Nexo Digital S.L.",
    outputTitle:
      "PROPOSAL DE SERVICIOS - ACOMPANAMIENTO MENSUAL EN PROCESOS Y AUTOMATIZACION",
    additionalText:
      "Nota: Este documento contiene información de carácter comercial y no sustituye la asesoría legal. Se recomienda revisarlo con un profesional antes de firmar.",
    badge: "Plantilla completa",
    outputBody: `**Emisor:** Estudio Rivera Consultoría
**Cliente:** Nexo Digital S.L.

---

### 1. Resumen ejecutivo
En Estudio Rivera Consultoría nos especializamos en optimizar procesos y automatizar tareas para autónomos que buscan mejorar su productividad y reducir costes. La presente propuesta describe un acompañamiento mensual de tres meses, diseñado para diagnosticar su situación actual, implementar mejoras y garantizar la continuidad del proyecto.

### 2. Alcance del servicio
- **Diagnóstico inicial** (1ª semana): análisis de procesos clave, identificación de cuellos de botella y evaluación de herramientas existentes.
- **Sesiones quincenales** (2 sesiones mensuales): revisión de avances, ajustes a la estrategia y capacitación breve en nuevas herramientas.
- **Informe ejecutivo** (final de cada mes): resumen de resultados, métricas alcanzadas y recomendaciones para el siguiente periodo.
- **Seguimiento continuo**: soporte por correo electrónico y llamadas de 15 minutos cuando sea necesario.

### 3. Entregables
| Mes | Entregable |
| --- | --- |
| 1 | Informe de diagnóstico inicial + plan de acción preliminar |
| 2 | Informe ejecutivo mes 1 + ajustes al plan |
| 3 | Informe ejecutivo mes 2 + propuesta de mejora a largo plazo |

### 4. Cronograma
| Actividad | Fecha estimada |
| --- | --- |
| Inicio del proyecto | [COMPLETAR] |
| Diagnóstico inicial | 1ª semana |
| Sesiones quincenales | Cada 15 días del mes |
| Entregas mensuales | Último día hábil de cada mes |

### 5. Precio orientativo
- **Tarifa mensual:** 950 EUR + IVA
- **Duración total del contrato:** 3 meses
- **Importe total (excluido IVA):** 2.850 EUR
- **Condiciones de pago:** 50 % al firmar el contrato, 25 % a mitad del proyecto y 25 % al finalizar.

### 6. Condiciones generales
- El presente precio es orientativo y puede ajustarse en función de la complejidad real del proyecto.
- Los costes adicionales (licencias, hardware, formación especializada) se facturarán por separado.
- La propuesta es válida durante 30 días a partir de la fecha de emisión.

### 7. Siguiente paso
Para formalizar el acuerdo, por favor envíe un correo a [COMPLETAR] con su aceptación y la firma del contrato adjunto. Una vez recibido, programaremos la reunión de inicio para definir los objetivos específicos y establecer el calendario detallado.

Quedamos a su disposición para cualquier aclaración o ajuste que considere necesario.`,
  },
  {
    id: "ready-quote",
    title: "Presupuesto por hitos",
    summary:
      "Pensado para cerrar un proyecto con conceptos, importes y validez de la oferta sin parecer una hoja improvisada.",
    documentType: "quote",
    issuerName: "Estudio Rivera Consultoría",
    clientName: "Costa Verde Retail",
    outputTitle: "PRESUPUESTO DE SERVICIOS - IMPLANTACION DE AUTOMATIZACIONES",
    additionalText:
      "Nota: El alcance económico puede ajustarse si durante el arranque aparecen dependencias o integraciones adicionales no contempladas en esta versión.",
    badge: "Presupuesto listo",
    outputBody: `**Emisor:** Estudio Rivera Consultoría
**Cliente:** Costa Verde Retail

### 1. Objeto del presupuesto
El presente presupuesto recoge los trabajos necesarios para revisar procesos operativos, implantar automatizaciones clave y dejar una base de trabajo documentada para el equipo interno.

### 2. Alcance incluido
- Auditoría inicial de procesos y herramientas actuales.
- Diseño del flujo de trabajo objetivo y definición de automatizaciones prioritarias.
- Configuración técnica inicial y pruebas.
- Documentación operativa para el equipo.
- Soporte de arranque durante 15 días tras la implantación.

### 3. Inversión propuesta
| Concepto | Importe |
| --- | --- |
| Diagnóstico y mapa de procesos | 680 EUR |
| Configuración e implantación | 1.250 EUR |
| Documentación y soporte de arranque | 520 EUR |
| **Total presupuesto** | **2.450 EUR + IVA** |

### 4. Calendario de pagos
- 40 % al aceptar el presupuesto.
- 40 % tras la implantación inicial.
- 20 % al cierre y entrega de documentación.

### 5. Plazos estimados
| Fase | Plazo |
| --- | --- |
| Inicio del proyecto | [COMPLETAR] |
| Diagnóstico y propuesta técnica | 5 días hábiles |
| Implantación inicial | 10 días hábiles |
| Cierre y soporte de arranque | 15 días naturales |

### 6. Condiciones
- Este presupuesto no incluye licencias de terceros ni costes de infraestructura.
- Cualquier ampliación de alcance se presupuestará por separado.
- La oferta es válida durante 20 días naturales desde la fecha de emisión.

### 7. Siguiente paso
Si desea avanzar, responda a este documento con su conformidad para preparar el encargo, bloquear agenda y fijar la fecha de inicio.`,
  },
  {
    id: "ready-contract",
    title: "Contrato base de servicios",
    summary:
      "Una base contractual seria para mantenimiento, soporte o acompañamiento recurrente.",
    documentType: "service_contract",
    issuerName: "Estudio Rivera Consultoría",
    clientName: "Atalaya Studio",
    outputTitle: "CONTRATO BASE DE PRESTACION DE SERVICIOS OPERATIVOS",
    additionalText:
      "Nota: Documento base pendiente de revisión jurídica antes de su firma definitiva.",
    badge: "Contrato base",
    outputBody: `**Parte prestadora:** Estudio Rivera Consultoría
**Cliente:** Atalaya Studio

### 1. Objeto
La parte prestadora se compromete a prestar al cliente servicios de soporte operativo, mantenimiento de automatizaciones y acompañamiento técnico según el alcance definido en este documento.

### 2. Alcance del servicio
- Revisión mensual del funcionamiento operativo.
- Resolución de incidencias menores comunicadas por correo electrónico.
- Ajustes y mejoras menores sobre flujos ya implantados.
- Una reunión mensual de seguimiento.

### 3. Honorarios y forma de pago
- Honorarios mensuales: 420 EUR + IVA.
- Facturación por adelantado durante los primeros cinco días de cada mes.
- El impago de una factura podrá suspender temporalmente la prestación del servicio hasta su regularización.

### 4. Duración
El contrato tendrá una duración inicial de 6 meses a partir de la fecha de inicio, con posibilidad de renovación por acuerdo entre las partes.

### 5. Confidencialidad
Ambas partes se comprometen a mantener la confidencialidad sobre la información técnica, operativa y comercial a la que tengan acceso durante la relación profesional.

### 6. Propiedad intelectual
Los materiales, credenciales y documentación interna del cliente seguirán siendo titularidad del cliente. Las metodologías generales y activos propios de la parte prestadora seguirán siendo de su titularidad.

### 7. Resolución
Cualquiera de las partes podrá resolver el contrato con un preaviso mínimo de 30 días naturales. El trabajo ya ejecutado y facturado seguirá siendo exigible.

### 8. Legislación aplicable
Para cualquier controversia derivada de este acuerdo, las partes se someten a la legislación española y a los juzgados y tribunales que correspondan.`,
  },
];

const DOCUMENT_TYPE_META: Record<
  AiDocumentType,
  {
    label: string;
    helper: string;
    icon: typeof Sparkles;
    defaultTitle: string;
    resultHint: string;
    briefPlaceholder: string;
    additionalPlaceholder: string;
    sectionHints: string[];
  }
> = {
  proposal: {
    label: "Propuesta",
    helper:
      "Para vender un servicio con narrativa comercial, entregables, cronograma y llamada a la acción.",
    icon: Send,
    defaultTitle: "Propuesta de servicios",
    resultHint:
      "Úsala cuando quieras vender valor, ordenar el alcance y guiar al cliente hacia la aceptación.",
    briefPlaceholder:
      "Explica qué ofreces, durante cuánto tiempo, qué incluye y cuál es el precio orientativo.",
    additionalPlaceholder:
      "Añade una nota comercial, validez de la propuesta o recomendación de revisión.",
    sectionHints: [
      "Resumen ejecutivo",
      "Alcance del servicio",
      "Entregables",
      "Precio orientativo",
      "Siguiente paso",
    ],
  },
  quote: {
    label: "Presupuesto",
    helper:
      "Para presentar una inversión clara con conceptos, hitos de pago, plazos y condiciones de la oferta.",
    icon: Calculator,
    defaultTitle: "Presupuesto de servicios",
    resultHint:
      "Ideal cuando el cliente ya entiende el servicio y necesita una propuesta económica concreta para aprobarla.",
    briefPlaceholder:
      "Describe el proyecto, los bloques de trabajo, el importe total y cómo quieres repartir los pagos.",
    additionalPlaceholder:
      "Añade exclusiones, validez de la oferta o una nota sobre ampliaciones de alcance.",
    sectionHints: [
      "Objeto del presupuesto",
      "Alcance incluido",
      "Inversión",
      "Calendario de pagos",
      "Validez de la oferta",
    ],
  },
  service_contract: {
    label: "Contrato",
    helper:
      "Para dejar por escrito alcance, honorarios, confidencialidad, propiedad intelectual y resolución.",
    icon: FileSignature,
    defaultTitle: "Contrato de prestación de servicios",
    resultHint:
      "Encaja mejor cuando ya hay acuerdo comercial y toca fijar reglas de juego de forma clara.",
    briefPlaceholder:
      "Describe qué servicio se prestará, durante cuánto tiempo, cuánto se cobrará y qué límites debe tener el acuerdo.",
    additionalPlaceholder:
      "Añade una nota final de revisión jurídica o una condición especial acordada entre las partes.",
    sectionHints: [
      "Objeto",
      "Alcance del servicio",
      "Honorarios",
      "Confidencialidad",
      "Resolución",
    ],
  },
  payment_reminder: {
    label: "Cobro",
    helper:
      "Para reclamar una factura vencida con tono profesional, firmeza y una acción de pago muy clara.",
    icon: ReceiptText,
    defaultTitle: "Recordatorio de pago",
    resultHint:
      "Útil cuando quieres acelerar el cobro sin desgastar la relación con el cliente.",
    briefPlaceholder:
      "Incluye el número de factura, el importe, el retraso acumulado y el tono exacto que quieres usar.",
    additionalPlaceholder:
      "Añade una coletilla final o unas instrucciones específicas de pago si lo necesitas.",
    sectionHints: [
      "Referencia de factura",
      "Importe pendiente",
      "Petición de confirmación",
      "Datos de pago",
    ],
  },
  invoice_email: {
    label: "Email",
    helper:
      "Para acompañar el envío de una factura con un correo corto, claro y fácil de responder.",
    icon: Mail,
    defaultTitle: "Email de envío de factura",
    resultHint:
      "Perfecto para dar contexto al PDF adjunto, resumir el importe y dejar el vencimiento claro.",
    briefPlaceholder:
      "Describe qué servicio se factura, el importe, el plazo de pago y el tono del correo.",
    additionalPlaceholder:
      "Añade una posdata, una aclaración operativa o una línea de seguimiento si hace falta.",
    sectionHints: [
      "Saludo",
      "Motivo del correo",
      "Importe y vencimiento",
      "Cierre",
    ],
  },
};

const WORKFLOW_STEPS = [
  {
    title: "1. Elige una base",
    description: "Carga una plantilla preparada o arranca desde un briefing guiado por IA.",
    icon: FileText,
  },
  {
    title: "2. Afina la pieza",
    description: "Ajusta logo, texto adicional, título y contenido final desde el propio editor.",
    icon: Sparkles,
  },
  {
    title: "3. Descarga y envía",
    description: "Exporta a PDF o Word con una presentación más seria y lista para compartir.",
    icon: FileDown,
  },
];

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

export function DocumentsStudio({
  model,
  initialAiUsed,
  aiLimit,
  demoMode,
  defaultLogoUrl,
  defaultAdditionalText,
}: {
  model: string;
  initialAiUsed: number;
  aiLimit: number | null;
  demoMode: boolean;
  defaultLogoUrl: string;
  defaultAdditionalText: string;
}) {
  const initialPreset = PRESETS[0];
  const [documentType, setDocumentType] =
    useState<AiDocumentType>(initialPreset.documentType);
  const [issuerName, setIssuerName] = useState(initialPreset.issuerName);
  const [clientName, setClientName] = useState(initialPreset.clientName);
  const [brief, setBrief] = useState(initialPreset.brief);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [output, setOutput] = useState("");
  const [outputTitle, setOutputTitle] = useState(
    DOCUMENT_TYPE_META[initialPreset.documentType].defaultTitle,
  );
  const [providerLabel, setProviderLabel] = useState("LM Studio");
  const [modelLabel, setModelLabel] = useState(model);
  const [logoUrl, setLogoUrl] = useState(defaultLogoUrl);
  const [additionalText, setAdditionalText] = useState(defaultAdditionalText);
  const [aiUsed, setAiUsed] = useState(initialAiUsed);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const activeMeta = DOCUMENT_TYPE_META[documentType];
  const ActiveIcon = activeMeta.icon;
  const aiRemaining = aiLimit === null ? null : Math.max(aiLimit - aiUsed, 0);
  const exportReady = output.trim().length >= 30;
  const usingProfileLogo = useMemo(
    () => Boolean(defaultLogoUrl && logoUrl === defaultLogoUrl),
    [defaultLogoUrl, logoUrl],
  );
  const wordCount = useMemo(() => {
    const normalized = output.trim();
    if (!normalized) {
      return 0;
    }

    return normalized.split(/\s+/).filter(Boolean).length;
  }, [output]);
  const estimatedPages = wordCount ? Math.max(1, Math.ceil(wordCount / 420)) : 0;

  function handleDocumentTypeChange(nextDocumentType: AiDocumentType) {
    const previousDefaultTitle = activeMeta.defaultTitle;
    setDocumentType(nextDocumentType);

    if (
      !outputTitle.trim() ||
      outputTitle === previousDefaultTitle ||
      outputTitle === "Documento generado"
    ) {
      setOutputTitle(DOCUMENT_TYPE_META[nextDocumentType].defaultTitle);
    }
  }

  function applyPreset(preset: Preset) {
    setDocumentType(preset.documentType);
    setIssuerName(preset.issuerName);
    setClientName(preset.clientName);
    setBrief(preset.brief);
    setOutputTitle(preset.suggestedTitle);
    toast.success(`Cargado el briefing: ${preset.title}.`);
  }

  function applyReadyTemplate(template: ReadyTemplate) {
    setDocumentType(template.documentType);
    setIssuerName(template.issuerName);
    setClientName(template.clientName);
    setOutputTitle(template.outputTitle);
    setOutput(template.outputBody);
    setAdditionalText(template.additionalText);
    setProviderLabel("Plantilla interna");
    setModelLabel("FacturaIA Studio");
    toast.success(`Plantilla cargada: ${template.title}.`);
  }

  async function handleGenerate() {
    if (brief.trim().length < 20) {
      toast.error("Describe mejor el documento para obtener una salida útil.");
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch("/api/ai/documents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documentType,
          brief,
          issuerName: issuerName.trim() || undefined,
          clientName: clientName.trim() || undefined,
        }),
      });

      const payload = (await response.json()) as {
        documentTitle?: string;
        documentBody?: string;
        provider?: string;
        model?: string;
        error?: string;
      };

      if (!response.ok || !payload.documentBody) {
        if (response.status === 403) {
          setUpgradeOpen(true);
        }

        throw new Error(
          payload.error ?? "No se ha podido generar el documento con la IA local.",
        );
      }

      setOutputTitle(payload.documentTitle ?? activeMeta.defaultTitle);
      setOutput(payload.documentBody);
      setProviderLabel(payload.provider ?? "LM Studio");
      setModelLabel(payload.model ?? model);
      setAiUsed((current) => current + 1);
      toast.success("Documento generado con la IA local.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se ha podido generar el documento con la IA local.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  async function copyOutput() {
    if (!output.trim()) {
      toast.error("Todavía no hay ningún documento generado.");
      return;
    }

    const composedOutput = [
      outputTitle.trim(),
      output.trim(),
      additionalText.trim() ? `Texto adicional\n${additionalText.trim()}` : null,
    ]
      .filter(Boolean)
      .join("\n\n");

    try {
      await navigator.clipboard.writeText(composedOutput);
      toast.success("Documento copiado al portapapeles.");
    } catch {
      toast.error("No se ha podido copiar el documento.");
    }
  }

  async function handleExport(format: "pdf" | "docx") {
    if (!exportReady) {
      toast.error("Genera o pega primero un documento con contenido suficiente.");
      return;
    }

    if (format === "pdf") {
      setIsExportingPdf(true);
    } else {
      setIsExportingDocx(true);
    }

    try {
      const response = await fetch(`/api/ai/documents/export/${format}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: outputTitle.trim(),
          body: output.trim(),
          issuerName: issuerName.trim() || undefined,
          clientName: clientName.trim() || undefined,
          logoUrl: logoUrl.trim() || undefined,
          additionalText: additionalText.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        throw new Error(
          payload?.error ??
            `No se ha podido exportar el documento en formato ${format.toUpperCase()}.`,
        );
      }

      await downloadResponseFile(response, `documento.${format}`);
      toast.success(
        format === "pdf"
          ? "PDF descargado correctamente."
          : "Word descargado correctamente.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se ha podido descargar el documento.",
      );
    } finally {
      setIsExportingPdf(false);
      setIsExportingDocx(false);
    }
  }

  return (
    <>
      <PlanGateDialog
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        requiredPlan="pro"
        reason="La generación de documentos asistidos está pensada para usuarios Pro o Premium."
      />

      <div className="space-y-8">
        <Card className="overflow-hidden border-white/50 bg-[radial-gradient(circle_at_top_left,rgba(230,245,240,0.95),rgba(255,255,255,0.92)_42%,rgba(244,233,215,0.78)_100%)] shadow-[0_28px_80px_rgba(21,48,52,0.10)]">
          <CardContent className="relative p-6 sm:p-8">
            <div className="absolute inset-y-0 right-0 hidden w-[32%] bg-[linear-gradient(180deg,rgba(31,102,97,0.08),rgba(255,255,255,0))] lg:block" />

            <div className="relative grid gap-8 xl:grid-cols-[1.12fr_0.88fr]">
              <div className="space-y-5">
                <div className="flex flex-wrap gap-2">
                  <Badge>Studio documental</Badge>
                  <Badge variant="secondary">{modelLabel}</Badge>
                  {demoMode ? <Badge variant="secondary">Modo demo</Badge> : null}
                  {logoUrl.trim() ? <Badge variant="success">Marca lista</Badge> : null}
                </div>

                <div className="max-w-3xl space-y-4">
                  <h2 className="font-display text-4xl leading-none tracking-tight text-foreground sm:text-5xl">
                    Genera propuestas, presupuestos y contratos con una interfaz mucho más seria.
                  </h2>
                  <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                    Esta cabina combina tu IA local, un editor listo para exportar y una librería de plantillas reales para que el resultado final no parezca texto suelto.
                  </p>
                </div>

                <div className="grid gap-3 lg:grid-cols-3">
                  {WORKFLOW_STEPS.map((step) => {
                    const Icon = step.icon;

                    return (
                      <div
                        key={step.title}
                        className="rounded-[26px] border border-white/60 bg-white/72 p-4 backdrop-blur"
                      >
                        <div className="flex items-center gap-3">
                          <div className="rounded-2xl bg-[color:var(--color-brand-soft)] p-2.5 text-[color:var(--color-brand)]">
                            <Icon className="h-4 w-4" />
                          </div>
                          <p className="font-semibold text-foreground">{step.title}</p>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-muted-foreground">
                          {step.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
                <div className="rounded-[28px] bg-white/80 p-5 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    IA usada hoy
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-foreground">
                    {aiLimit === null ? `${aiUsed}` : `${aiUsed}/${aiLimit}`}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Control diario activo para que la experiencia siga siendo estable incluso con uso intensivo.
                  </p>
                </div>

                <div className="rounded-[28px] bg-white/80 p-5 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Restante hoy
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-foreground">
                    {aiRemaining === null ? "Ilimitado" : aiRemaining}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Tu modelo local sigue disponible para descripciones, borradores y piezas completas.
                  </p>
                </div>

                <div className="rounded-[28px] bg-[color:rgba(19,45,52,0.94)] p-5 text-white shadow-lg sm:col-span-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-white/65">
                        Lo que ya sale bien
                      </p>
                      <div className="space-y-2 text-sm leading-6 text-white/85">
                        <p className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                          PDF con cabecera de marca, logo, metadatos y tablas limpias.
                        </p>
                        <p className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                          Word editable para seguir trabajando en despacho o con cliente.
                        </p>
                        <p className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                          Documento final editable antes de exportar, sin depender de una API externa.
                        </p>
                      </div>
                    </div>
                    <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-white/70" />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <div className="space-y-6">
            <Card className="border-white/60 bg-white/84">
              <CardHeader>
                <CardTitle>Librería de plantillas</CardTitle>
                <CardDescription>
                  Plantillas completas ya estructuradas para probar la exportación buena sin depender de una generación nueva.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                {READY_TEMPLATES.map((template) => {
                  const meta = DOCUMENT_TYPE_META[template.documentType];
                  const Icon = meta.icon;

                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => applyReadyTemplate(template)}
                      className="rounded-[28px] border border-white/70 bg-[linear-gradient(140deg,rgba(255,255,255,0.92),rgba(233,244,240,0.72))] p-5 text-left transition hover:translate-y-[-1px] hover:border-[color:var(--color-brand-soft)]"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary">{template.badge}</Badge>
                            <Badge variant="secondary">{meta.label}</Badge>
                          </div>
                          <p className="text-lg font-semibold text-foreground">
                            {template.title}
                          </p>
                          <p className="text-sm leading-6 text-muted-foreground">
                            {template.summary}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-white p-3 text-[color:var(--color-brand)] shadow-sm">
                          <Icon className="h-5 w-5" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="border-white/60 bg-white/84">
              <CardHeader>
                <CardTitle>Briefings listos para IA</CardTitle>
                <CardDescription>
                  Casos de uso prácticos para que el modelo local arranque con contexto bueno y no con una caja vacía.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                {PRESETS.map((preset) => {
                  const meta = DOCUMENT_TYPE_META[preset.documentType];
                  const Icon = meta.icon;

                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className="rounded-[26px] border border-white/60 bg-white/70 p-5 text-left transition hover:border-[color:var(--color-brand-soft)] hover:bg-[color:var(--color-brand-soft)]/28"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-lg font-semibold text-foreground">
                            {preset.title}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {preset.summary}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-[color:var(--color-panel)] p-3 text-[color:var(--color-brand)]">
                          <Icon className="h-5 w-5" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="border-white/60 bg-white/84 xl:sticky xl:top-24">
              <CardHeader>
                <CardTitle>Kit del documento</CardTitle>
                <CardDescription>
                  Resumen visual de marca, enfoque y secciones recomendadas para el tipo de pieza actual.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="rounded-[28px] border border-dashed border-[color:var(--color-brand-soft)] bg-[color:var(--color-panel)] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Logo de la asesoría
                      </p>
                      <p className="text-xs leading-5 text-muted-foreground">
                        {usingProfileLogo
                          ? "Se está usando el logo guardado en tu perfil."
                          : "Puedes pegar una URL absoluta o una ruta interna del proyecto."}
                      </p>
                    </div>
                    <Badge variant={logoUrl.trim() ? "success" : "secondary"}>
                      {logoUrl.trim() ? "Listo" : "Opcional"}
                    </Badge>
                  </div>

                  <div className="mt-4 flex min-h-[116px] items-center justify-center rounded-[24px] bg-white/85 p-4">
                    {logoUrl.trim() ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={logoUrl}
                        alt="Logo del documento"
                        className="max-h-20 max-w-full rounded-2xl object-contain"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-center text-xs text-muted-foreground">
                        <ImageIcon className="h-5 w-5" />
                        <span>Sin logo cargado</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-[28px] bg-white/90 p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-[color:var(--color-brand-soft)] p-3 text-[color:var(--color-brand)]">
                      <ActiveIcon className="h-5 w-5" />
                    </div>
                    <div className="space-y-2">
                      <p className="font-semibold text-foreground">
                        {activeMeta.label}
                      </p>
                      <p className="text-sm leading-6 text-muted-foreground">
                        {activeMeta.resultHint}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] bg-white/90 p-5 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Secciones sugeridas
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {activeMeta.sectionHints.map((item) => (
                      <span
                        key={item}
                        className="rounded-full bg-[color:var(--color-panel)] px-3 py-2 text-xs font-medium text-foreground"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-white/60 bg-white/84">
            <CardHeader className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-[color:var(--color-brand-soft)] p-3 text-[color:var(--color-brand)]">
                  <ActiveIcon className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>Cabina de redacción</CardTitle>
                  <CardDescription>{activeMeta.helper}</CardDescription>
                </div>
              </div>

              <Tabs
                value={documentType}
                onValueChange={(value) =>
                  handleDocumentTypeChange(value as AiDocumentType)
                }
              >
                <TabsList className="grid w-full grid-cols-2 gap-1 rounded-[26px] md:grid-cols-3 xl:grid-cols-5">
                  {AI_DOCUMENT_TYPES.map((item) => (
                    <TabsTrigger key={item} value={item} className="w-full">
                      {DOCUMENT_TYPE_META[item].label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="rounded-[28px] border border-[color:var(--color-brand-soft)] bg-[linear-gradient(140deg,rgba(233,244,240,0.7),rgba(255,255,255,0.9))] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <p className="font-semibold text-foreground">
                      Qué debería salir aquí
                    </p>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {activeMeta.resultHint}
                    </p>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[color:var(--color-brand)]" />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="issuerName">Emisor</Label>
                  <Input
                    id="issuerName"
                    value={issuerName}
                    onChange={(event) => setIssuerName(event.target.value)}
                    placeholder="Tu nombre o negocio"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientName">Cliente</Label>
                  <Input
                    id="clientName"
                    value={clientName}
                    onChange={(event) => setClientName(event.target.value)}
                    placeholder="Nombre del cliente"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-[1.08fr_0.92fr]">
                <div className="space-y-2">
                  <Label htmlFor="documentBrief">Brief del documento</Label>
                  <Textarea
                    id="documentBrief"
                    value={brief}
                    onChange={(event) => setBrief(event.target.value)}
                    className="min-h-[260px]"
                    placeholder={activeMeta.briefPlaceholder}
                  />
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="documentLogo">URL del logo</Label>
                    <Input
                      id="documentLogo"
                      value={logoUrl}
                      onChange={(event) => setLogoUrl(event.target.value)}
                      placeholder="https://... o /demo-logo.png"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="additionalText">Texto adicional</Label>
                    <Textarea
                      id="additionalText"
                      value={additionalText}
                      onChange={(event) => setAdditionalText(event.target.value)}
                      className="min-h-[174px]"
                      placeholder={activeMeta.additionalPlaceholder}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  onClick={() => void handleGenerate()}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {isGenerating ? "Generando con IA local..." : "Generar documento"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => applyReadyTemplate(READY_TEMPLATES[0])}
                >
                  <FileCheck2 className="h-4 w-4" />
                  Cargar documento completo
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-white/60 bg-white/84">
          <CardHeader className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{providerLabel}</Badge>
                <Badge variant="secondary">{modelLabel}</Badge>
                <Badge variant={exportReady ? "success" : "secondary"}>
                  {exportReady ? "Listo para exportar" : "Pendiente de contenido"}
                </Badge>
              </div>

              <div className="space-y-2">
                <Label htmlFor="documentTitle">Título final del documento</Label>
                <Input
                  id="documentTitle"
                  value={outputTitle}
                  onChange={(event) => setOutputTitle(event.target.value)}
                  placeholder="Título que aparecerá en el PDF y en el Word"
                  className="max-w-3xl"
                />
              </div>

              <CardDescription>
                El contenido es editable. Puedes pegar texto tuyo, reordenarlo y exportarlo sin volver a generar.
              </CardDescription>
            </div>

            <Button type="button" variant="outline" onClick={() => void copyOutput()}>
              <Copy className="h-4 w-4" />
              Copiar texto
            </Button>
          </CardHeader>

          <CardContent className="grid gap-5 xl:grid-cols-[1.08fr_0.56fr]">
            <div className="space-y-2">
              <Label htmlFor="documentOutput">Documento final</Label>
              <Textarea
                id="documentOutput"
                value={output}
                onChange={(event) => setOutput(event.target.value)}
                className="min-h-[700px] rounded-[30px] bg-white px-5 py-4 text-sm leading-7 shadow-inner"
                placeholder="Aquí verás la salida de la IA o el contenido de una plantilla preparada. También puedes pegar un documento propio y exportarlo directamente."
              />
            </div>

            <div className="space-y-4 xl:sticky xl:top-24 xl:self-start">
              <div className="rounded-[30px] bg-[color:var(--color-panel)] p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Resumen rápido
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                  <div className="rounded-[22px] bg-white/85 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Palabras
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">
                      {wordCount}
                    </p>
                  </div>
                  <div className="rounded-[22px] bg-white/85 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Páginas aprox.
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">
                      {estimatedPages}
                    </p>
                  </div>
                  <div className="rounded-[22px] bg-white/85 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Formato
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">
                      PDF + DOCX
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[30px] border border-dashed border-[color:var(--color-brand-soft)] bg-white/88 p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Estado actual
                </p>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Título</span>
                    <Badge variant={outputTitle.trim() ? "success" : "secondary"}>
                      {outputTitle.trim() ? "Listo" : "Falta"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Contenido</span>
                    <Badge variant={exportReady ? "success" : "secondary"}>
                      {exportReady ? "Listo" : "Falta"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Logo</span>
                    <Badge variant={logoUrl.trim() ? "success" : "secondary"}>
                      {logoUrl.trim() ? "Incluido" : "Opcional"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Texto adicional</span>
                    <Badge
                      variant={additionalText.trim() ? "success" : "secondary"}
                    >
                      {additionalText.trim() ? "Incluido" : "Opcional"}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="rounded-[30px] bg-[color:rgba(19,45,52,0.94)] p-5 text-white">
                <p className="text-xs uppercase tracking-[0.18em] text-white/65">
                  Salida final
                </p>
                <div className="mt-4 space-y-3 text-sm leading-6 text-white/85">
                  <p className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    PDF visual para enviar directamente al cliente.
                  </p>
                  <p className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    Word editable para despacho, revisión o firma posterior.
                  </p>
                </div>

                <div className="mt-5 flex flex-col gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void handleExport("docx")}
                    disabled={isExportingDocx}
                    className="w-full"
                  >
                    {isExportingDocx ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileDown className="h-4 w-4" />
                    )}
                    {isExportingDocx ? "Preparando Word..." : "Descargar Word"}
                  </Button>

                  <Button
                    type="button"
                    onClick={() => void handleExport("pdf")}
                    disabled={isExportingPdf}
                    className="w-full bg-white text-[color:var(--color-brand)] hover:bg-white/90"
                  >
                    {isExportingPdf ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                    {isExportingPdf ? "Preparando PDF..." : "Descargar PDF"}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
