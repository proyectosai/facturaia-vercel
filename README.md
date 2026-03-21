# FacturaIA

[![CI](https://github.com/proyectosai/facturaia/actions/workflows/ci.yml/badge.svg)](https://github.com/proyectosai/facturaia/actions/workflows/ci.yml)
[![Licencia: MIT](https://img.shields.io/badge/licencia-MIT-2f7d32.svg)](./LICENSE)

FacturaIA es una aplicación Next.js 15 pensada para autónomos y pequeños negocios españoles que quieren gestionar facturas, documentos y mensajería desde una instalación privada en su propio ordenador o servidor.

## Prioridad actual del proyecto

La línea principal es reforzar la instalación privada del cliente:

- acceso local
- menos dependencia de servicios externos
- más control de datos en el propio ordenador o servidor
- simplificación progresiva del despliegue
- endurecimiento de auth local, auditoría y backup/restore

## Qué incluye

- Autenticación local por email y contraseña en modo privado, con compatibilidad opcional con Supabase y magic link en despliegues remotos.
- Dashboard protegido con sidebar en español.
- Gestión de perfil fiscal del emisor.
- Creación de facturas con IVA, IRPF, numeración automática y PDF profesional.
- Módulo de presupuestos y albaranes con conversión posterior a factura.
- Módulo de firma documental para aceptar presupuestos y firmar albaranes desde un enlace público.
- Evidencia de firma reforzada con hash de integridad del documento y validación de cambios posteriores al enlace.
- Módulo de gastos con importación de justificantes, extracción de texto y revisión.
- Módulo de conciliación bancaria con importación CSV y enlace manual de movimientos con facturas o gastos.
- Seguimiento de cobros y vencimientos con centro dedicado, marcado manual y acciones por lote, recordatorios individuales y por lote, historial de avisos y sincronización básica con banca.
- Módulo Facturae / VeriFactu con panel de preparación y exportación inicial XML Facturae 3.2.2 sin firma.
- Revisión Facturae más estricta con validación básica de NIF y vencimiento, más detalle de pago en el XML.
- Módulo CRM ligero para centralizar fichas de cliente y proveedor con actividad relacionada.
- Bandeja interna de feedback para registrar incidencias y peticiones de pilotos o uso interno.
- Vista de auditoría operativa con filtros y export JSON para revisar cambios locales en CRM, gastos, facturas, cobros, firmas, banca, mensajería y restauraciones.
- Historial de facturas con descarga de PDF y envío por email con SMTP o Resend.
- Página pública de factura con QR.
- Redacción documental local con LM Studio para propuestas, presupuestos, contratos y mensajes.
- Estudio documental local con notas, TXT, Markdown y PDF extraído, recuperación por fragmentos y respuestas con citas.
- Módulo de apoyo IRPF / Renta para preparar expedientes con checklist, fuentes oficiales y asistencia local.
- Exportación de documentos a PDF y Word.
- Módulo de correo saliente con pantalla de prueba y soporte SMTP / Resend.
- Módulo de correo entrante con importación IMAP manual y bandeja interna.
- Módulo opcional de mensajería unificada para WhatsApp Business y Telegram por webhook.
- Centro de backups para exportar, restaurar y sincronizar copias remotas por WebDAV / Nextcloud, con manifest y checksum de integridad en el JSON, validación `dry-run` y comparación visible antes y después de restaurar.
- Catálogo de módulos opcionales con estado e instalación en `/modules`.
- Guía de instalación privada dentro de la propia app.
- Asistente de primeros pasos dentro del panel para instalaciones no técnicas.
- Script `npm run doctor` para validar la instalación local.
- Cabeceras de seguridad y validación estricta de uploads en puntos sensibles.
- Rate limiting en login local, expiración real de sesión, fail-closed en producción para secretos/cifrado y auditoría persistente de accesos, facturas, cobros, firmas, banca y restores.
- Suite de tests unitarios para cobros, seguridad, Facturae y firma.
- Suite unitaria específica para el núcleo local y su persistencia.
- Suite masiva local para facturación, banca, comunicaciones, cifrado y módulos.
- Smoke tests de rutas clave sobre `next start` real.
- Harness e2e local con Playwright para endurecer login, perfil, factura, cobro y backup sobre SQLite temporal.
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

Guías paso a paso en GitHub:

- [Windows](./docs/INSTALACION_WINDOWS.md)
- [macOS](./docs/INSTALACION_MACOS.md)
- [Linux](./docs/INSTALACION_LINUX.md)

```bash
cp .env.example .env.local
docker compose -f compose.app.yml up --build
```

Primero configura solo:

- `NEXT_PUBLIC_APP_URL`
- `FACTURAIA_LOCAL_MODE=1`
- `FACTURAIA_LOCAL_BOOTSTRAP=1`
- `FACTURAIA_LOCAL_SESSION_SECRET`
- `FACTURAIA_LOCAL_SESSION_MAX_AGE_HOURS=168`
- `FACTURAIA_LOCAL_LOGIN_MAX_ATTEMPTS=5`
- `FACTURAIA_LOCAL_LOGIN_LOCKOUT_MINUTES=15`
- `FACTURAIA_DATA_DIR`
- tu bloque de correo saliente

Si quieres cifrado opcional en reposo y en backups:

- `FACTURAIA_ENCRYPT_LOCAL_DATA=1`
- `FACTURAIA_ENCRYPT_BACKUPS=1`
- `FACTURAIA_ENCRYPTION_PASSPHRASE=una-passphrase-larga-y-unica`

En producción, si activas cualquiera de los flags de cifrado y no defines la passphrase, FacturaIA entra en modo `fail-closed`: bloquea acceso protegido y operaciones sensibles hasta corregir la configuración.

### Modo local privado sin magic link

Si el cliente quiere entrar con email y contraseña dentro de su propia instalación, sin depender de Supabase para el núcleo:

```env
FACTURAIA_LOCAL_MODE=1
FACTURAIA_LOCAL_BOOTSTRAP=1
FACTURAIA_LOCAL_SESSION_SECRET=pon-aqui-un-secreto-largo
FACTURAIA_LOCAL_SESSION_MAX_AGE_HOURS=168
FACTURAIA_LOCAL_LOGIN_MAX_ATTEMPTS=5
FACTURAIA_LOCAL_LOGIN_LOCKOUT_MINUTES=15
FACTURAIA_DATA_DIR=.facturaia-local
FACTURAIA_ENCRYPT_LOCAL_DATA=0
FACTURAIA_ENCRYPT_BACKUPS=0
FACTURAIA_ENCRYPTION_PASSPHRASE=
```

Comportamiento:

- el login cambia a email + contraseña
- si aún no existe ningún usuario, la primera sesión crea la cuenta local inicial
- el perfil fiscal, las facturas, el PDF, la factura pública, los cobros y los recordatorios se guardan en una base SQLite local dentro del equipo
- `core.sqlite` mantiene ahora dos capas: snapshot compatible y mirror relacional interno como puente hacia una base local más madura
- el mirror ya alimenta lecturas reales de auditoría, uso, clientes y facturas cuando está disponible
- las mutaciones locales de bootstrap/login, perfil, feedback, clientes, facturas, cobros, presupuestos/albaranes y recordatorios ya actualizan el mirror SQLite con upserts dirigidos, sin resincronizarlo completo en cada cambio
- `clientes`, `facturas`, `recordatorios`, `auditoría` y `contadores` ya se recuperan desde SQLite como fuente principal en modo local; el snapshot queda como compatibilidad, backup y restore
- `presupuestos/albaranes` y `firmas` ya leen y persisten primero sobre SQLite cuando el mirror está activo
- restore y export de backups ya reconstruyen identidad, feedback, clientes, facturas, recordatorios y auditoría priorizando SQLite cuando el mirror está activo
- esas mutaciones ya intentan persistirse primero en SQLite y solo después consolidan el snapshot compatible
- el acceso local aplica expiración real de sesión, bloqueo temporal por intentos fallidos y auditoría persistente de eventos sensibles
- en producción, si falta `FACTURAIA_LOCAL_SESSION_SECRET` o activas cifrado sin `FACTURAIA_ENCRYPTION_PASSPHRASE`, FacturaIA bloquea acceso protegido, exportación y restauración hasta corregir la instalación
- después conviene poner `FACTURAIA_LOCAL_BOOTSTRAP=0`

Importante:

- este modo ya permite usar el núcleo sin `NEXT_PUBLIC_SUPABASE_URL` ni `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- los módulos más avanzados siguen necesitando más trabajo para vivir completamente en local
- conviene guardar `FACTURAIA_DATA_DIR` en una carpeta incluida en tu estrategia de backup
- el cifrado local y el cifrado de backups son **opcionales** y se activan solo si defines las variables anteriores
- si activas `FACTURAIA_ENCRYPT_LOCAL_DATA=1`, FacturaIA desactiva el mirror relacional interno para no duplicar datos sensibles en claro dentro de SQLite
- si vienes de una instalación antigua con `core.json`, la migración a `core.sqlite` es automática en el primer arranque local

## Estado real del producto

No todo tiene la misma madurez. Esta es la forma correcta de leer el proyecto hoy:

- **Listo para uso diario**: núcleo de facturación, listado de facturas, perfil fiscal, correo saliente, backups locales y cobros básicos.
- **En piloto**: presupuestos y albaranes, firma documental básica, IMAP, banca CSV, CRM ligero, mensajería y backups remotos.
- **Experimental**: OCR de gastos y Facturae / VeriFactu.

Si buscas una guía clara antes de instalar nada:

- [Guía en 15 minutos](./docs/GUIA_15_MINUTOS.md)
- [Instalación en Windows](./docs/INSTALACION_WINDOWS.md)
- [Instalación en macOS](./docs/INSTALACION_MACOS.md)
- [Instalación en Linux](./docs/INSTALACION_LINUX.md)
- [Sistema de módulos](./docs/SISTEMA_DE_MODULOS.md)
- [Estado real, módulo por módulo](./docs/ESTADO_REAL.md)
- [Estándar de calidad para el modo local](./docs/CALIDAD_LOCAL.md)
- [QA / lectura ISO 25010](./docs/QA_ISO_25010.md)
- [Plan de VeriFactu y firma digital](./docs/VERIFACTU_Y_FIRMA_DIGITAL.md)
- [Memoria local para LLM y RAG (arquitectura propuesta)](./docs/MEMORIA_LOCAL_LLM.md)
- [Estudio documental local](./docs/modulos/ESTUDIO_DOCUMENTAL_LOCAL.md)
- [Auditoría local operativa](./docs/modulos/AUDITORIA_LOCAL.md)

## Sistema de módulos

FacturaIA debe instalarse como un sistema modular, no como un “todo o nada”.

La lectura correcta es esta:

- **núcleo primero**: perfil, facturas, backups, correo saliente y cobros
- **operativa después**: clientes, presupuestos, firma y gastos
- **integraciones al final**: mensajería, IMAP, banca o Facturae

Guías clave:

- [Sistema de módulos](./docs/SISTEMA_DE_MODULOS.md)
- [Índice de módulos](./docs/modulos/README.md)
- [DFD y plan de módulos](./docs/MODULOS_DFD.md)

## Stack técnico

- Next.js 15 + App Router
- TypeScript
- Tailwind CSS v4
- Componentes UI estilo shadcn/ui + Radix
- SQLite local para instalaciones privadas en el propio equipo
- Supabase Auth + Postgres + Storage + RLS como vía opcional para despliegues remotos
- Nodemailer + SMTP o Resend
- `@react-pdf/renderer`
- `docx`
- LM Studio local usando `openai/gpt-oss-20b`

## IA local hoy

Lectura correcta, sin humo:

- **Implementado**: mejora de descripciones de factura, generación documental, asistente IRPF / Renta y estudio documental local con recuperación por fragmentos y citas.
- **Implementado en primera fase**: el estudio documental guarda texto y metadatos en local, recupera fragmentos relevantes y consulta a LM Studio si está disponible.
- **Todavía no implementado**: embeddings persistentes, vector store local, memoria multi-año y el RAG completo descrito en `docs/MEMORIA_LOCAL_LLM.md`.
- **Interpretación correcta**: FacturaIA ya integra IA local útil, pero la memoria/RAG de varias capas sigue siendo arquitectura documentada, no producto terminado.

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
- `/estudio-ia`
- `/mail`
- `/feedback`
- `/auditoria`
- `/modules`
- `/messages`
- `/system`
- `/backups`
- `/profile`
- `/factura/[publicId]`
- `/firma/[token]`

## Instalación rápida

Si prefieres instrucciones literales por sistema operativo:

- [Windows](./docs/INSTALACION_WINDOWS.md)
- [macOS](./docs/INSTALACION_MACOS.md)
- [Linux](./docs/INSTALACION_LINUX.md)

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

Chequeos de calidad recomendados antes de entregar una instalación local:

```bash
npm run test:local-core
npm run test:massive-local
npm run test:quality
```

CI ya ejecuta `lint`, `typecheck`, `npm test`, `test:massive-local`, build demo y smoke tests en `Linux`, `macOS` y `Windows`. El harness `npm run test:e2e:local` sigue siendo una capa adicional de endurecimiento manual mientras terminamos de estabilizarlo como gate automático. La batería local ya cubre roundtrip de `backup -> restore -> reexport -> compare` y continuidad de numeración tras desastre.

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
FACTURAIA_LOCAL_MODE=
FACTURAIA_LOCAL_BOOTSTRAP=
FACTURAIA_LOCAL_SESSION_SECRET=
FACTURAIA_DATA_DIR=
FACTURAIA_ENCRYPT_LOCAL_DATA=
FACTURAIA_ENCRYPT_BACKUPS=
FACTURAIA_ENCRYPTION_PASSPHRASE=
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
npm test
npm run test:local-core
npm run test:massive-local
npm run test:quality
npm run test:e2e:local
npm run test:smoke
npm run demo:build
npm run demo:start
```

`npm run test:e2e:local` levanta una instalación local temporal sobre SQLite, entra como usuario privado, recorre el flujo crítico de facturación y cobro, y después barre varias rutas protegidas para detectar errores de runtime. Sigue siendo un harness de endurecimiento manual y no forma parte todavía del gate principal.

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
- [Sistema de módulos](./docs/SISTEMA_DE_MODULOS.md)
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
- El backup exporta JSON del usuario autenticado con `manifest`, `counts` y `checksum`, la restauración funciona en modo reemplazo y el primer proveedor remoto soportado es WebDAV / Nextcloud.
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
