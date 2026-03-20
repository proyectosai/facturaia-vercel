# FacturaIA

[![CI](https://github.com/proyectosai/facturaia/actions/workflows/ci.yml/badge.svg)](https://github.com/proyectosai/facturaia/actions/workflows/ci.yml)
[![Licencia: MIT](https://img.shields.io/badge/licencia-MIT-2f7d32.svg)](./LICENSE)

FacturaIA es una aplicación Next.js 15 pensada para autónomos y pequeños negocios españoles que quieren gestionar facturas, documentos y mensajería desde una instalación privada en su propio ordenador o servidor.

## Qué incluye

- Autenticación por magic link con Supabase.
- Dashboard protegido con sidebar en español.
- Gestión de perfil fiscal del emisor.
- Creación de facturas con IVA, IRPF, numeración automática y PDF profesional.
- Módulo de presupuestos y albaranes con conversión posterior a factura.
- Módulo de firma documental para aceptar presupuestos y firmar albaranes desde un enlace público.
- Evidencia de firma reforzada con hash de integridad del documento y validación de cambios posteriores al enlace.
- Módulo de gastos con importación de justificantes, extracción de texto y revisión.
- Módulo de conciliación bancaria con importación CSV y enlace manual de movimientos con facturas o gastos.
- Seguimiento de cobros y vencimientos con centro dedicado, marcado manual, recordatorios individuales y por lote, historial de avisos y sincronización básica con banca.
- Módulo Facturae / VeriFactu con panel de preparación y exportación inicial XML Facturae 3.2.2 sin firma.
- Revisión Facturae más estricta con validación básica de NIF y vencimiento, más detalle de pago en el XML.
- Módulo CRM ligero para centralizar fichas de cliente y proveedor con actividad relacionada.
- Bandeja interna de feedback para registrar incidencias y peticiones de pilotos o uso interno.
- Historial de facturas con descarga de PDF y envío por email con SMTP o Resend.
- Página pública de factura con QR.
- Estudio documental con IA local vía LM Studio para propuestas, presupuestos, contratos y mensajes.
- Módulo de apoyo IRPF / Renta para preparar expedientes con checklist, fuentes oficiales y asistencia local.
- Exportación de documentos a PDF y Word.
- Módulo de correo saliente con pantalla de prueba y soporte SMTP / Resend.
- Módulo de correo entrante con importación IMAP manual y bandeja interna.
- Módulo opcional de mensajería unificada para WhatsApp Business y Telegram por webhook.
- Centro de backups para exportar, restaurar y sincronizar copias remotas por WebDAV / Nextcloud.
- Catálogo de módulos opcionales con estado e instalación en `/modules`.
- Guía de instalación privada dentro de la propia app.
- Asistente de primeros pasos dentro del panel para instalaciones no técnicas.
- Script `npm run doctor` para validar la instalación local.
- Cabeceras de seguridad y validación estricta de uploads en puntos sensibles.
- Suite de tests unitarios para cobros, seguridad, Facturae y firma.
- Modo demo local para revisar la interfaz sin servicios reales.

## Filosofía del proyecto

- uso privado y autogestionado
- sin planes ni monetización integrada
- open source bajo licencia MIT
- arquitectura moderna, pero pragmática
- foco en utilidad real para autónomos españoles

## Empieza por aquí

Si eres autónomo o una pequeña empresa y no quieres complicarte:

1. **Primero prueba la demo**.
2. **Después instala solo el núcleo**: perfil, facturas, correo saliente, backups y cobros.
3. **Deja los módulos avanzados para más tarde**: IMAP, mensajería, OCR, banca, firma o Facturae.

### Demo rápida con Docker

```bash
docker compose -f compose.demo.yml up --build
```

Esto arranca FacturaIA en modo demo, sin Supabase real ni servicios externos.

### Instalación privada básica

```bash
cp .env.example .env.local
docker compose -f compose.app.yml up --build
```

Primero configura solo:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- tu bloque de correo saliente

## Estado real del producto

No todo tiene la misma madurez. Esta es la forma correcta de leer el proyecto hoy:

- **Listo para uso diario**: núcleo de facturación, listado de facturas, perfil fiscal, correo saliente, backups locales y cobros básicos.
- **En piloto**: presupuestos y albaranes, firma documental básica, IMAP, banca CSV, CRM ligero, mensajería y backups remotos.
- **Experimental**: OCR de gastos y Facturae / VeriFactu.

Si buscas una guía clara antes de instalar nada:

- [Guía en 15 minutos](./docs/GUIA_15_MINUTOS.md)
- [Estado real, módulo por módulo](./docs/ESTADO_REAL.md)

## Stack técnico

- Next.js 15 + App Router
- TypeScript
- Tailwind CSS v4
- Componentes UI estilo shadcn/ui + Radix
- Supabase Auth + Postgres + Storage + RLS
- Nodemailer + SMTP o Resend
- `@react-pdf/renderer`
- `docx`
- LM Studio local usando `openai/gpt-oss-20b`

## Rutas principales

- `/`
- `/instalacion`
- `/login`
- `/dashboard`
- `/primeros-pasos`
- `/new-invoice`
- `/presupuestos`
- `/firmas`
- `/gastos`
- `/cobros`
- `/banca`
- `/clientes`
- `/invoices`
- `/facturae`
- `/renta`
- `/documents-ai`
- `/mail`
- `/feedback`
- `/modules`
- `/messages`
- `/system`
- `/backups`
- `/profile`
- `/factura/[publicId]`
- `/firma/[token]`

## Instalación rápida

Si usas `nvm`, puedes fijar la versión recomendada con:

```bash
nvm use
```

Después:

```bash
npm install
cp .env.example .env.local
npm run doctor
npm run dev
```

Modo demo:

```bash
FACTURAIA_DEMO_MODE=1 npm run dev
```

También puedes usar Docker:

```bash
docker compose -f compose.demo.yml up --build
```

## Variables de entorno

Las variables base están documentadas en [`.env.example`](./.env.example):

```env
NEXT_PUBLIC_APP_URL=
FACTURAIA_DEMO_MODE=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
LM_STUDIO_BASE_URL=
LM_STUDIO_MODEL=
LM_STUDIO_API_KEY=
MAIL_PROVIDER=
SMTP_HOST=
SMTP_PORT=
SMTP_SECURE=
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_FROM_EMAIL=
INBOUND_MAIL_PROVIDER=
IMAP_HOST=
IMAP_PORT=
IMAP_SECURE=
IMAP_USERNAME=
IMAP_PASSWORD=
IMAP_MAILBOX=
IMAP_SYNC_UNSEEN_ONLY=
IMAP_SYNC_MAX_MESSAGES=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
REMOTE_BACKUP_PROVIDER=
WEBDAV_BASE_URL=
WEBDAV_USERNAME=
WEBDAV_PASSWORD=
WEBDAV_BACKUP_PATH=
```

## Scripts disponibles

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
npm run demo:build
npm run demo:start
```

## Base de datos

Migraciones incluidas:

- [`supabase/migrations/202603191900_init_facturaia.sql`](./supabase/migrations/202603191900_init_facturaia.sql)
- [`supabase/migrations/202603191945_add_ai_usage.sql`](./supabase/migrations/202603191945_add_ai_usage.sql)
- [`supabase/migrations/202603192230_add_message_inbox.sql`](./supabase/migrations/202603192230_add_message_inbox.sql)
- [`supabase/migrations/202603192345_remove_billing_for_self_hosted.sql`](./supabase/migrations/202603192345_remove_billing_for_self_hosted.sql)
- [`supabase/migrations/202603200915_add_invoice_sequence_sync_function.sql`](./supabase/migrations/202603200915_add_invoice_sequence_sync_function.sql)
- [`supabase/migrations/202603201030_add_remote_backup_runs.sql`](./supabase/migrations/202603201030_add_remote_backup_runs.sql)
- [`supabase/migrations/202603201200_add_inbound_mail_module.sql`](./supabase/migrations/202603201200_add_inbound_mail_module.sql)
- [`supabase/migrations/202603201330_add_commercial_documents_module.sql`](./supabase/migrations/202603201330_add_commercial_documents_module.sql)
- [`supabase/migrations/202603201430_add_expenses_module.sql`](./supabase/migrations/202603201430_add_expenses_module.sql)
- [`supabase/migrations/202603201520_add_clients_module.sql`](./supabase/migrations/202603201520_add_clients_module.sql)
- [`supabase/migrations/202603201640_add_document_signature_module.sql`](./supabase/migrations/202603201640_add_document_signature_module.sql)
- [`supabase/migrations/202603201730_add_bank_reconciliation_module.sql`](./supabase/migrations/202603201730_add_bank_reconciliation_module.sql)
- [`supabase/migrations/202603201900_add_invoice_collection_tracking.sql`](./supabase/migrations/202603201900_add_invoice_collection_tracking.sql)
- [`supabase/migrations/202603201945_add_invoice_reminder_tracking.sql`](./supabase/migrations/202603201945_add_invoice_reminder_tracking.sql)

Tablas principales activas:

- `users`
- `profiles`
- `invoices`
- `commercial_documents`
- `document_signature_requests`
- `expenses`
- `bank_movements`
- `clients`
- `ai_usage`
- `message_connections`
- `message_threads`
- `message_messages`
- `remote_backup_runs`
- `mail_threads`
- `mail_messages`
- `mail_sync_runs`

## Documentación adicional

- [Instalación y configuración](./docs/INSTALACION.md)
- [Guía en 15 minutos](./docs/GUIA_15_MINUTOS.md)
- [Estado real del producto](./docs/ESTADO_REAL.md)
- [DFD y plan de módulos](./docs/MODULOS_DFD.md)
- [Arquitectura funcional y técnica](./docs/ARQUITECTURA.md)
- [Visión, alcance y pendientes](./docs/VISION_Y_PENDIENTES.md)
- [Despliegue en Coolify / Hetzner](./docs/DESPLIEGUE.md)
- [Demo en Vercel](./docs/DEPLOY_VERCEL_DEMO.md)
- [Índice de módulos](./docs/modulos/README.md)
- [Mensajería WhatsApp y Telegram](./docs/modulos/MENSAJERIA_WHATSAPP_TELEGRAM.md)
- [Backups remotos](./docs/modulos/BACKUPS_REMOTOS.md)
- [Correo saliente](./docs/modulos/CORREO_SALIENTE.md)
- [Correo entrante](./docs/modulos/CORREO_ENTRANTE.md)
- [Presupuestos y albaranes](./docs/modulos/PRESUPUESTOS_ALBARANES.md)
- [OCR de gastos](./docs/modulos/GASTOS_OCR.md)
- [CRM ligero](./docs/modulos/CRM_LIGERO.md)
- [Firma documental](./docs/modulos/FIRMA_DOCUMENTAL.md)
- [Conciliación bancaria](./docs/modulos/CONCILIACION_BANCARIA.md)
- [Cobros y vencimientos](./docs/modulos/COBROS_Y_VENCIMIENTOS.md)
- [Facturae / VeriFactu](./docs/modulos/FACTURAE_VERIFACTU.md)
- [Asistente IRPF / Renta](./docs/modulos/ASISTENTE_RENTA.md)
- [Hoja de ruta](./docs/ROADMAP.md)
- [Guía de contribución](./CONTRIBUTING.md)
- [Código de conducta](./CODE_OF_CONDUCT.md)
- [Política de seguridad](./SECURITY.md)
- [Changelog](./CHANGELOG.md)
- [Licencia](./LICENSE)

## Notas importantes

- El proyecto usa IA local con LM Studio; no depende de una API comercial externa para documentos.
- El flujo de Word y PDF documental ya está operativo.
- Está planteado para uso privado y autogestionado.
- El backup exporta JSON del usuario autenticado, la restauración funciona en modo reemplazo y el primer proveedor remoto soportado es WebDAV / Nextcloud.
- El correo saliente soporta SMTP y Resend, con pantalla de prueba propia en `/mail`.
- El correo entrante soporta una primera entrega IMAP con sincronización manual desde `/mail`.
- El módulo `/presupuestos` cubre la primera fase de pre-facturación: persistencia, estados y conversión a factura.
- El módulo `/gastos` cubre la primera fase de importación y revisión de justificantes de gasto.
- El módulo `/banca` cubre la primera fase de importación de extractos CSV y conciliación manual.
- El módulo `/cobros` cubre la primera fase de seguimiento económico: vencimientos, cobros parciales, recordatorios individuales y por lote, historial de avisos y cierre manual.
- El módulo `/facturae` cubre la primera fase de exportación XML Facturae 3.2.2 sin firma.
- El módulo `/clientes` cubre la primera fase de fichas unificadas con actividad cruzada.
- El módulo `/firmas` cubre la primera fase de aceptación y firma básica por enlace público.
- El módulo `/feedback` permite registrar y priorizar feedback real de pilotos o uso interno.
- La parte legal y fiscal mostrada en la UI no sustituye asesoramiento profesional.

## Verificación

```bash
npm run typecheck
npm run lint
npm test
FACTURAIA_DEMO_MODE=1 npm run build
```
