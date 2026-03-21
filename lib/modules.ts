import { getOutboundMailStatusSummary } from "@/lib/mail";
import { getInboundMailStatusSummary } from "@/lib/inbound-mail";
import { isLocalFileMode } from "@/lib/demo";

export type ModuleStatus = "active" | "partial" | "next" | "planned";
export type ModuleMaturity = "daily" | "pilot" | "experimental";
export type ModuleLocalSupport = "native" | "assisted" | "blocked";

export type ModuleCategory =
  | "canales"
  | "resiliencia"
  | "documentos"
  | "finanzas"
  | "cumplimiento";

export type ModuleDefinition = {
  id: string;
  order: number;
  title: string;
  summary: string;
  status: ModuleStatus;
  maturity: ModuleMaturity;
  localSupport: ModuleLocalSupport;
  category: ModuleCategory;
  routeHref?: string;
  docsPath?: string;
  providers?: string[];
  requirements: string[];
  installSteps: string[];
  notes?: string[];
  readinessNote?: string;
};

export type ModuleRuntimeState = ModuleDefinition & {
  configured: boolean;
  configuredLabel: string;
};

function hasSupabase() {
  return (
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

function hasRemoteBackups() {
  return (
    process.env.REMOTE_BACKUP_PROVIDER === "webdav" &&
    Boolean(process.env.WEBDAV_BASE_URL) &&
    Boolean(process.env.WEBDAV_USERNAME) &&
    Boolean(process.env.WEBDAV_PASSWORD) &&
    Boolean(process.env.WEBDAV_BACKUP_PATH)
  );
}

function hasLocalAi() {
  return (
    Boolean(process.env.LM_STUDIO_BASE_URL) &&
    Boolean(process.env.LM_STUDIO_MODEL)
  );
}

function hasPublicAppUrl() {
  return Boolean(process.env.NEXT_PUBLIC_APP_URL);
}

export const MODULE_DEFINITIONS: ModuleDefinition[] = [
  {
    id: "messaging-inbox",
    order: 0,
    title: "Mensajería unificada",
    summary:
      "Bandeja única para ordenar mensajes entrantes de WhatsApp Business y Telegram por fecha, urgencia y nombre.",
    status: "active",
    maturity: "pilot",
    localSupport: "assisted",
    category: "canales",
    routeHref: "/messages",
    docsPath: "docs/modulos/MENSAJERIA_WHATSAPP_TELEGRAM.md",
    providers: ["WhatsApp Business", "Telegram Bot API"],
    requirements: [
      "NEXT_PUBLIC_APP_URL accesible por HTTPS",
      "Cuenta oficial de WhatsApp Business o bot de Telegram",
      "Webhook público alcanzable desde Internet",
    ],
    installSteps: [
      "Abre /messages y copia la webhook URL.",
      "En WhatsApp Business pega también el verify token.",
      "Envía un mensaje de prueba desde el canal real.",
    ],
    notes: [
      "Solo cubre el canal oficial del negocio, no el WhatsApp personal del cliente.",
    ],
    readinessNote:
      "Útil para pruebas y pilotos. No es lo primero que debería instalar un autónomo medio.",
  },
  {
    id: "local-backups",
    order: 0,
    title: "Backups locales",
    summary:
      "Exportación y restauración JSON del usuario autenticado para mover o recuperar instalaciones privadas.",
    status: "active",
    maturity: "daily",
    localSupport: "native",
    category: "resiliencia",
    routeHref: "/backups",
    docsPath: "docs/INSTALACION.md",
    requirements: [
      "Usuario autenticado",
      "FACTURAIA_DATA_DIR accesible en modo local o Supabase operativo",
      "Espacio suficiente para guardar y restaurar el JSON",
    ],
    installSteps: [
      "Abre /backups.",
      "Descarga un JSON antes de tocar migraciones o mover el servidor.",
      "Restaura ese JSON solo cuando quieras reemplazar el estado actual.",
    ],
    readinessNote:
      "Recomendado desde el primer día. Es una de las piezas más importantes para trabajo real.",
  },
  {
    id: "remote-backups",
    order: 1,
    title: "Backups remotos",
    summary:
      "Sincronización de copias hacia almacenamiento externo para no depender solo del disco local o del VPS principal.",
    status: "partial",
    maturity: "pilot",
    localSupport: "assisted",
    category: "resiliencia",
    routeHref: "/backups",
    docsPath: "docs/modulos/BACKUPS_REMOTOS.md",
    providers: ["WebDAV / Nextcloud"],
    requirements: [
      "Sistema base de backups ya operativo",
      "Credenciales WebDAV válidas",
      "Migración remote_backup_runs aplicada para ver historial",
    ],
    installSteps: [
      "Añade las variables WebDAV en .env.local o en tu panel de despliegue.",
      "Abre /backups y revisa el destino remoto detectado.",
      "Lanza una sincronización manual y comprueba el fichero en tu almacenamiento.",
    ],
    notes: [
      "La primera entrega usa WebDAV / Nextcloud; S3 y otros proveedores quedan para iteraciones posteriores.",
    ],
    readinessNote:
      "Conviene probarlo, pero no confiar en él como única copia hasta validar varias restauraciones.",
  },
  {
    id: "email-outbound",
    order: 2,
    title: "Correo saliente",
    summary:
      "Envío de facturas y pruebas desde FacturaIA con SMTP clásico o Resend, según prefieras en tu instalación privada.",
    status: "active",
    maturity: "daily",
    localSupport: "assisted",
    category: "canales",
    routeHref: "/mail",
    docsPath: "docs/modulos/CORREO_SALIENTE.md",
    providers: ["SMTP", "Resend"],
    requirements: [
      "MAIL_PROVIDER o detección automática del proveedor",
      "Variables SMTP o Resend completas",
      "Remitente válido",
    ],
    installSteps: [
      "Configura SMTP o Resend en tu entorno.",
      "Abre /mail y revisa el estado detectado.",
      "Envía una prueba antes de usar el envío desde /invoices.",
    ],
    notes: [
      "El envío de facturas del historial usa este mismo módulo.",
    ],
    readinessNote:
      "Es de los módulos más aprovechables en el día a día si ya tienes un correo de trabajo configurado.",
  },
  {
    id: "email-inbound",
    order: 3,
    title: "Correo entrante",
    summary:
      "Bandeja de entrada para asociar emails entrantes con clientes, documentos y seguimiento operativo.",
    status: "partial",
    maturity: "pilot",
    localSupport: "assisted",
    category: "canales",
    routeHref: "/mail",
    docsPath: "docs/modulos/CORREO_ENTRANTE.md",
    providers: ["IMAP"],
    requirements: [
      "Variables IMAP completas",
      "Migración del módulo de correo entrante aplicada",
      "Sincronización manual desde la pantalla /mail",
    ],
    installSteps: [
      "Añade el bloque IMAP en .env.local o en tu despliegue.",
      "Abre /mail y revisa el estado del buzón.",
      "Ejecuta una sincronización manual para importar correos.",
    ],
    notes: [
      "Primera entrega con IMAP manual; faltan automatización, hilos avanzados y enlaces con cliente.",
    ],
    readinessNote:
      "Mejor tratarlo como apoyo operativo, no como bandeja principal de correo.",
  },
  {
    id: "quotes-delivery-notes",
    order: 4,
    title: "Presupuestos y albaranes",
    summary:
      "Flujo documental previo a la factura, con conversión de presupuesto o albarán en factura definitiva.",
    status: "partial",
    maturity: "pilot",
    localSupport: "native",
    category: "documentos",
    routeHref: "/presupuestos",
    docsPath: "docs/modulos/PRESUPUESTOS_ALBARANES.md",
    requirements: [
      "Migración commercial_documents aplicada",
      "Modo local privado o Supabase configurado",
      "Ruta /presupuestos disponible en el panel",
    ],
    installSteps: [
      "Aplica la migración del módulo documental.",
      "Abre /presupuestos y crea un documento de prueba.",
      "Convierte un presupuesto o albarán en factura cuando proceda.",
    ],
    notes: [
      "Primera entrega con persistencia, estados y conversión a factura. El PDF específico y la firma llegarán después.",
    ],
    readinessNote:
      "Sirve para ordenar el flujo previo a facturar, pero aún no transmite la solidez de un módulo completamente cerrado.",
  },
  {
    id: "expenses-ocr",
    order: 5,
    title: "OCR de gastos",
    summary:
      "Lectura de tickets y facturas de proveedor para extraer importes, IVA y datos básicos de gasto.",
    status: "partial",
    maturity: "experimental",
    localSupport: "native",
    category: "finanzas",
    routeHref: "/gastos",
    docsPath: "docs/modulos/GASTOS_OCR.md",
    requirements: [
      "Modo local privado o storage operativo",
      "Subida de PDF, texto o imagen válida",
      "Revisión manual de los datos antes de guardar",
    ],
    installSteps: [
      "Subir ticket o PDF.",
      "Extraer datos con OCR.",
      "Validar y guardar el gasto.",
    ],
    notes: [
      "Primera entrega con PDF/texto y OCR manual pegado. El OCR automático de imágenes llegará después.",
    ],
    readinessNote:
      "Úsalo con revisión manual siempre. Todavía no debe convertirse en una fuente de verdad automática.",
  },
  {
    id: "crm-light",
    order: 6,
    title: "CRM ligero",
    summary:
      "Ficha unificada de cliente con notas, documentos, mensajes y estado operativo.",
    status: "partial",
    maturity: "pilot",
    localSupport: "native",
    category: "canales",
    routeHref: "/clientes",
    docsPath: "docs/modulos/CRM_LIGERO.md",
    requirements: [
      "Modelo de cliente consolidado",
      "Historial cruzado de facturas, mensajes y documentos",
    ],
    installSteps: [
      "Crear ficha central de cliente.",
      "Vincular historial documental y de mensajería.",
      "Añadir notas y estados.",
    ],
    readinessNote:
      "Aporta contexto, pero aún no sustituye un CRM dedicado ni conviene forzar toda tu operativa dentro de él.",
  },
  {
    id: "document-signature",
    order: 7,
    title: "Firma documental",
    summary:
      "Aceptación o firma de propuestas y contratos con trazabilidad básica dentro del entorno privado.",
    status: "partial",
    maturity: "pilot",
    localSupport: "assisted",
    category: "documentos",
    routeHref: "/firmas",
    docsPath: "docs/modulos/FIRMA_DOCUMENTAL.md",
    requirements: [
      "Documentos persistentes",
      "Estados de aceptación",
      "Flujo de enlace o firma",
    ],
    installSteps: [
      "Definir método de aceptación.",
      "Añadir estados y evidencia.",
      "Vincular a propuestas y contratos.",
    ],
    readinessNote:
      "Tiene valor como aceptación básica, pero no debe venderse todavía como firma avanzada o cumplimiento cerrado.",
  },
  {
    id: "bank-reconciliation",
    order: 8,
    title: "Conciliación bancaria",
    summary:
      "Importación de extractos CSV para cruzar ingresos y cargos con facturas emitidas o gastos ya revisados.",
    status: "partial",
    maturity: "pilot",
    localSupport: "native",
    category: "finanzas",
    routeHref: "/banca",
    docsPath: "docs/modulos/CONCILIACION_BANCARIA.md",
    requirements: [
      "Facturas y/o gastos ya importados",
      "Extracto CSV exportado por tu banco",
      "Revisión manual antes de confirmar la conciliación",
    ],
    installSteps: [
      "Exporta un CSV desde tu banco con fecha, concepto e importe.",
      "Abre /banca y sube primero un extracto corto para validar la cabecera.",
      "Confirma manualmente los enlaces con facturas o gastos sugeridos por la app.",
    ],
    notes: [
      "Primera entrega con CSV manual. OFX, reglas automáticas y caja prevista llegarán después.",
    ],
    readinessNote:
      "Útil para reconciliar casos sencillos, pero aún requiere mucha revisión manual.",
  },
  {
    id: "facturae-verifactu",
    order: 9,
    title: "Facturae / VeriFactu",
    summary:
      "Panel de preparación normativa y exportación inicial a XML Facturae 3.2.2 sin firma, con referencias oficiales de VeriFactu.",
    status: "partial",
    maturity: "experimental",
    localSupport: "native",
    category: "cumplimiento",
    routeHref: "/facturae",
    docsPath: "docs/modulos/FACTURAE_VERIFACTU.md",
    requirements: [
      "Facturas emitidas con datos fiscales completos",
      "NIF y direcciones razonablemente estructurados",
      "Revisión manual del XML antes de usarlo fuera de FacturaIA",
    ],
    installSteps: [
      "Abre /facturae y revisa los avisos por factura.",
      "Descarga el XML Facturae 3.2.2 como borrador.",
      "Contrasta el fichero con la normativa y con tu flujo real antes de usarlo fuera de la app.",
    ],
    notes: [
      "Primera entrega sin firma XAdES, sin FACe y sin remisión automática a VeriFactu.",
    ],
    readinessNote:
      "Debe considerarse preparatorio. No es una base suficiente para delegar cumplimiento fiscal real.",
  },
  {
    id: "document-study",
    order: 10,
    title: "Estudio documental local",
    summary:
      "Biblioteca documental privada con notas, TXT, Markdown y PDF extraído, consultas sobre fragmentos y citas visibles.",
    status: "active",
    maturity: "pilot",
    localSupport: "native",
    category: "documentos",
    routeHref: "/estudio-ia",
    docsPath: "docs/modulos/ESTUDIO_DOCUMENTAL_LOCAL.md",
    requirements: [
      "Usuario autenticado",
      "FACTURAIA_DATA_DIR accesible",
      "LM Studio recomendado para respuestas redactadas, aunque existe recuperación local sin LLM",
    ],
    installSteps: [
      "Abre /estudio-ia y carga una nota o un TXT/MD/PDF.",
      "Haz una pregunta concreta sobre esa documentación.",
      "Revisa siempre las citas antes de usar la respuesta como criterio de trabajo.",
    ],
    notes: [
      "Esta primera entrega usa recuperación por fragmentos y citas. La capa completa de memoria/RAG sigue documentada, no implementada todavía.",
    ],
    readinessNote:
      "Ya sirve para trabajo documental guiado, pero todavía no debe venderse como memoria multi-año ni como NotebookLM privado completo.",
  },
  {
    id: "tax-assistant",
    order: 11,
    title: "Asistente IRPF / Renta",
    summary:
      "Chat de apoyo para preparar expedientes de renta en Espana con checklist, riesgos y referencias oficiales de AEAT.",
    status: "partial",
    maturity: "pilot",
    localSupport: "native",
    category: "cumplimiento",
    routeHref: "/renta",
    docsPath: "docs/modulos/ASISTENTE_RENTA.md",
    requirements: [
      "Usuario autenticado",
      "LM Studio local recomendado para respuestas más útiles",
      "Revisión final siempre en AEAT y Renta WEB",
    ],
    installSteps: [
      "Abre /renta y describe el caso del cliente.",
      "Añade contexto, documentación aportada y ejercicio fiscal.",
      "Usa la respuesta como apoyo de trabajo, no como cierre automático de la declaración.",
    ],
    notes: [
      "Aunque no haya IA local conectada, el módulo puede funcionar en modo guiado con checklist internos.",
    ],
    readinessNote:
      "Útil para ordenar expedientes y dudas, pero no debe sustituir el criterio fiscal ni la validación final en AEAT.",
  },
];

export function getModuleStatusMeta(status: ModuleStatus) {
  return {
    active: {
      label: "Activo",
      badgeVariant: "success" as const,
    },
    partial: {
      label: "Parcial",
      badgeVariant: "secondary" as const,
    },
    next: {
      label: "Siguiente",
      badgeVariant: "default" as const,
    },
    planned: {
      label: "Planificado",
      badgeVariant: "secondary" as const,
    },
  }[status];
}

export function getModuleMaturityMeta(maturity: ModuleMaturity) {
  return {
    daily: {
      label: "Uso diario",
      badgeVariant: "success" as const,
      description: "Recomendado para trabajo habitual si ya has validado tu instalación básica.",
    },
    pilot: {
      label: "Piloto",
      badgeVariant: "default" as const,
      description: "Útil para probar con cuidado, pero todavía requiere validación en casos reales.",
    },
    experimental: {
      label: "Experimental",
      badgeVariant: "secondary" as const,
      description: "No conviene convertirlo en una pieza crítica de tu operativa diaria.",
    },
  }[maturity];
}

export function getModuleLocalSupportMeta(localSupport: ModuleLocalSupport) {
  return {
    native: {
      label: "Local nativo",
      badgeVariant: "success" as const,
      description:
        "El módulo puede vivir dentro del ordenador o servidor privado del cliente sin depender de Supabase para su operativa principal.",
    },
    assisted: {
      label: "Local asistido",
      badgeVariant: "default" as const,
      description:
        "La app corre en local, pero este módulo necesita una URL pública, un proveedor externo o un canal adicional para ser realmente útil.",
    },
    blocked: {
      label: "Local pendiente",
      badgeVariant: "secondary" as const,
      description:
        "La pantalla existe, pero el flujo local todavía no está cerrado como para considerarlo operativo en una instalación privada pura.",
    },
  }[localSupport];
}

export function getModuleCategoryLabel(category: ModuleCategory) {
  return {
    canales: "Canales",
    resiliencia: "Resiliencia",
    documentos: "Documentos",
    finanzas: "Finanzas",
    cumplimiento: "Cumplimiento",
  }[category];
}

export function getModuleCatalog(): ModuleRuntimeState[] {
  const outboundMail = getOutboundMailStatusSummary();
  const inboundMail = getInboundMailStatusSummary();
  const localFileMode = isLocalFileMode();
  const publicAppUrl = hasPublicAppUrl();

  return MODULE_DEFINITIONS.map((module) => {
    let configured = false;
    let configuredLabel = "Pendiente";

    if (module.id === "messaging-inbox") {
      configured = publicAppUrl && (hasSupabase() || localFileMode);
      configuredLabel = configured
        ? localFileMode
          ? "Listo para pruebas con webhooks y canales reales"
          : "Listo para conectar canales"
        : "Falta URL pública";
    } else if (module.id === "local-backups") {
      configured = localFileMode || hasSupabase();
      configuredLabel = configured
        ? localFileMode
          ? "Listo para exportar y restaurar en local"
          : "Listo para exportar y restaurar"
        : "Falta modo local o Supabase";
    } else if (module.id === "remote-backups") {
      configured = hasRemoteBackups();
      configuredLabel = configured
        ? "WebDAV / Nextcloud listo"
        : "Faltan variables WebDAV";
    } else if (module.id === "email-outbound") {
      configured = outboundMail.configured;
      configuredLabel = configured
        ? `${outboundMail.providerLabel} listo`
        : "Faltan variables de correo";
    } else if (module.id === "email-inbound") {
      configured = inboundMail.configured;
      configuredLabel = configured
        ? `${inboundMail.providerLabel} listo`
        : "Faltan variables IMAP";
    } else if (module.id === "quotes-delivery-notes") {
      configured = localFileMode || hasSupabase();
      configuredLabel = configured
        ? localFileMode
          ? "Listo para crear documentos en local"
          : "Listo para crear documentos"
        : "Falta modo local o Supabase";
    } else if (module.id === "expenses-ocr") {
      configured = localFileMode || hasSupabase();
      configuredLabel = configured
        ? localFileMode
          ? "Listo para guardar gastos en local"
          : "Listo para importar justificantes"
        : "Falta modo local o Supabase";
    } else if (module.id === "crm-light") {
      configured = localFileMode || hasSupabase();
      configuredLabel = configured
        ? localFileMode
          ? "Listo para fichas y notas en local"
          : "Listo para centralizar fichas"
        : "Falta modo local o Supabase";
    } else if (module.id === "document-signature") {
      configured = publicAppUrl && (hasSupabase() || localFileMode);
      configuredLabel = configured
        ? localFileMode
          ? "Listo para enlaces públicos locales"
          : "Listo para generar enlaces públicos"
        : "Falta URL pública";
    } else if (module.id === "bank-reconciliation") {
      configured = localFileMode || hasSupabase();
      configuredLabel = configured
        ? localFileMode
          ? "Listo para importar y conciliar en local"
          : "Listo para importar extractos CSV"
        : "Falta modo local o Supabase";
    } else if (module.id === "facturae-verifactu") {
      configured = localFileMode || hasSupabase();
      configuredLabel = configured
        ? localFileMode
          ? "Listo para exportar borradores XML en local"
          : "Listo para exportar borradores XML"
        : "Falta modo local o Supabase";
    } else if (module.id === "document-study") {
      configured = true;
      configuredLabel = hasLocalAi()
        ? "Recuperacion local + LM Studio listos"
        : "Recuperacion local lista sin LLM";
    } else if (module.id === "tax-assistant") {
      configured = true;
      configuredLabel = hasLocalAi()
        ? "LM Studio listo"
        : "Modo guiado sin IA local";
    } else {
      configured = false;
      configuredLabel = "Pendiente de implementación";
    }

    return {
      ...module,
      configured,
      configuredLabel,
    };
  }).sort((a, b) => a.order - b.order);
}
