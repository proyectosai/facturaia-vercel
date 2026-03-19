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

function hasResend() {
  return Boolean(process.env.RESEND_API_KEY) && Boolean(process.env.RESEND_FROM_EMAIL);
}

function hasLmStudio() {
  return Boolean(process.env.LM_STUDIO_BASE_URL) && Boolean(process.env.LM_STUDIO_MODEL);
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
      "Envío de facturas y documentos desde FacturaIA con Resend u otros proveedores SMTP compatibles en iteraciones futuras.",
    status: "next",
    category: "canales",
    docsPath: "docs/modulos/CORREO_SALIENTE.md",
    requirements: [
      "RESEND_API_KEY",
      "RESEND_FROM_EMAIL",
      "Dominio o remitente verificado",
    ],
    installSteps: [
      "Configura las variables de Resend.",
      "Verifica el remitente.",
      "Prueba el envío desde el historial de facturas.",
    ],
    notes: [
      "Hoy está implementado el envío saliente; falta bandeja de entrada y proveedores alternativos.",
    ],
  },
  {
    id: "quotes-delivery-notes",
    order: 3,
    title: "Presupuestos y albaranes",
    summary:
      "Flujo documental previo a la factura, con conversión de presupuesto o albarán en factura definitiva.",
    status: "planned",
    category: "documentos",
    requirements: [
      "Modelo documental estable",
      "Estados previos a facturación",
      "Conversión controlada a factura",
    ],
    installSteps: [
      "Definir tipos documentales y plantillas.",
      "Añadir persistencia específica.",
      "Conectar el flujo con Nueva Factura.",
    ],
  },
  {
    id: "expenses-ocr",
    order: 4,
    title: "OCR de gastos",
    summary:
      "Lectura de tickets y facturas de proveedor para extraer importes, IVA y datos básicos de gasto.",
    status: "planned",
    category: "finanzas",
    requirements: [
      "Pipeline OCR",
      "Modelo de gasto",
      "Subida segura de documentos",
    ],
    installSteps: [
      "Subir ticket o PDF.",
      "Extraer datos con OCR.",
      "Validar y guardar el gasto.",
    ],
  },
  {
    id: "crm-light",
    order: 5,
    title: "CRM ligero",
    summary:
      "Ficha unificada de cliente con notas, documentos, mensajes y estado operativo.",
    status: "planned",
    category: "canales",
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
    order: 6,
    title: "Firma documental",
    summary:
      "Aceptación o firma de propuestas y contratos con trazabilidad básica dentro del entorno privado.",
    status: "planned",
    category: "documentos",
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
    order: 7,
    title: "Conciliación bancaria",
    summary:
      "Importación de extractos para marcar facturas cobradas y ordenar movimientos.",
    status: "planned",
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
    order: 8,
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
      configured = hasResend();
      configuredLabel = configured
        ? "Resend configurado"
        : "Faltan variables de Resend";
    } else if (module.id === "quotes-delivery-notes") {
      configured = hasLmStudio();
      configuredLabel = configured
        ? "Base documental disponible"
        : "Pendiente de persistencia";
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
