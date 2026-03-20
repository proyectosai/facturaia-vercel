import { getOutboundMailStatusSummary } from "@/lib/mail";
import { getInboundMailStatusSummary } from "@/lib/inbound-mail";

export type ModuleStatus = "active" | "partial" | "next" | "planned";

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
  category: ModuleCategory;
  routeHref?: string;
  docsPath?: string;
  providers?: string[];
  requirements: string[];
  installSteps: string[];
  notes?: string[];
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

export const MODULE_DEFINITIONS: ModuleDefinition[] = [
  {
    id: "messaging-inbox",
    order: 0,
    title: "Mensajería unificada",
    summary:
      "Bandeja única para ordenar mensajes entrantes de WhatsApp Business y Telegram por fecha, urgencia y nombre.",
    status: "active",
    category: "canales",
    routeHref: "/messages",
    docsPath: "docs/modulos/MENSAJERIA_WHATSAPP_TELEGRAM.md",
    providers: ["WhatsApp Business", "Telegram Bot API"],
    requirements: [
      "NEXT_PUBLIC_APP_URL accesible por HTTPS",
      "Supabase configurado",
      "Cuenta oficial de WhatsApp Business o bot de Telegram",
    ],
    installSteps: [
      "Abre /messages y copia la webhook URL.",
      "En WhatsApp Business pega también el verify token.",
      "Envía un mensaje de prueba desde el canal real.",
    ],
    notes: [
      "Solo cubre el canal oficial del negocio, no el WhatsApp personal del cliente.",
    ],
  },
  {
    id: "local-backups",
    order: 0,
    title: "Backups locales",
    summary:
      "Exportación y restauración JSON del usuario autenticado para mover o recuperar instalaciones privadas.",
    status: "active",
    category: "resiliencia",
    routeHref: "/backups",
    docsPath: "docs/INSTALACION.md",
    requirements: [
      "Supabase configurado",
      "Usuario autenticado",
      "Migración de secuencia aplicada",
    ],
    installSteps: [
      "Abre /backups.",
      "Descarga un JSON antes de tocar migraciones o mover el servidor.",
      "Restaura ese JSON solo cuando quieras reemplazar el estado actual.",
    ],
  },
  {
    id: "remote-backups",
    order: 1,
    title: "Backups remotos",
    summary:
      "Sincronización de copias hacia almacenamiento externo para no depender solo del disco local o del VPS principal.",
    status: "partial",
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
  },
  {
    id: "email-outbound",
    order: 2,
    title: "Correo saliente",
    summary:
      "Envío de facturas y pruebas desde FacturaIA con SMTP clásico o Resend, según prefieras en tu instalación privada.",
    status: "active",
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
  },
  {
    id: "email-inbound",
    order: 3,
    title: "Correo entrante",
    summary:
      "Bandeja de entrada para asociar emails entrantes con clientes, documentos y seguimiento operativo.",
    status: "partial",
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
  },
  {
    id: "quotes-delivery-notes",
    order: 4,
    title: "Presupuestos y albaranes",
    summary:
      "Flujo documental previo a la factura, con conversión de presupuesto o albarán en factura definitiva.",
    status: "partial",
    category: "documentos",
    routeHref: "/presupuestos",
    docsPath: "docs/modulos/PRESUPUESTOS_ALBARANES.md",
    requirements: [
      "Migración commercial_documents aplicada",
      "Supabase configurado o modo demo local",
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
  },
  {
    id: "expenses-ocr",
    order: 5,
    title: "OCR de gastos",
    summary:
      "Lectura de tickets y facturas de proveedor para extraer importes, IVA y datos básicos de gasto.",
    status: "partial",
    category: "finanzas",
    routeHref: "/gastos",
    docsPath: "docs/modulos/GASTOS_OCR.md",
    requirements: [
      "Migración expenses aplicada",
      "Bucket expense-files operativo",
      "Supabase configurado o modo demo local",
    ],
    installSteps: [
      "Subir ticket o PDF.",
      "Extraer datos con OCR.",
      "Validar y guardar el gasto.",
    ],
    notes: [
      "Primera entrega con PDF/texto y OCR manual pegado. El OCR automático de imágenes llegará después.",
    ],
  },
  {
    id: "crm-light",
    order: 6,
    title: "CRM ligero",
    summary:
      "Ficha unificada de cliente con notas, documentos, mensajes y estado operativo.",
    status: "partial",
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
  },
  {
    id: "document-signature",
    order: 7,
    title: "Firma documental",
    summary:
      "Aceptación o firma de propuestas y contratos con trazabilidad básica dentro del entorno privado.",
    status: "partial",
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
  },
  {
    id: "bank-reconciliation",
    order: 8,
    title: "Conciliación bancaria",
    summary:
      "Importación de extractos para marcar facturas cobradas y ordenar movimientos.",
    status: "next",
    category: "finanzas",
    requirements: [
      "Importador CSV/OFX",
      "Modelo de cobros",
      "Reglas de conciliación",
    ],
    installSteps: [
      "Importar extracto.",
      "Cruzar por importe y fecha.",
      "Confirmar cobros detectados.",
    ],
  },
  {
    id: "facturae-verifactu",
    order: 9,
    title: "Facturae / VeriFactu",
    summary:
      "Exportación estructurada orientada a cumplimiento fiscal cuando el núcleo de facturación esté más maduro.",
    status: "planned",
    category: "cumplimiento",
    requirements: [
      "Modelo fiscal estable",
      "XML validado",
      "Revisión normativa actualizada",
    ],
    installSteps: [
      "Definir exportaciones XML.",
      "Validar contra normativa.",
      "Conectar con el flujo de emisión.",
    ],
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

  return MODULE_DEFINITIONS.map((module) => {
    let configured = false;
    let configuredLabel = "Pendiente";

    if (module.id === "messaging-inbox") {
      configured = hasSupabase() && Boolean(process.env.NEXT_PUBLIC_APP_URL);
      configuredLabel = configured
        ? "Listo para conectar canales"
        : "Falta URL pública o Supabase";
    } else if (module.id === "local-backups") {
      configured = hasSupabase();
      configuredLabel = configured
        ? "Listo para exportar y restaurar"
        : "Falta Supabase";
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
      configured = hasSupabase();
      configuredLabel = configured
        ? "Listo para crear documentos"
        : "Falta Supabase";
    } else if (module.id === "expenses-ocr") {
      configured = hasSupabase();
      configuredLabel = configured
        ? "Listo para importar justificantes"
        : "Falta Supabase";
    } else if (module.id === "crm-light") {
      configured = hasSupabase();
      configuredLabel = configured
        ? "Listo para centralizar fichas"
        : "Falta Supabase";
    } else if (module.id === "document-signature") {
      configured = hasSupabase() && Boolean(process.env.NEXT_PUBLIC_APP_URL);
      configuredLabel = configured
        ? "Listo para generar enlaces públicos"
        : "Falta URL pública o Supabase";
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
