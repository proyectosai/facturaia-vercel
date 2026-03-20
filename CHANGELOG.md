# Changelog

Todos los cambios relevantes de FacturaIA se documentarán aquí.

El formato está inspirado en Keep a Changelog y el versionado irá madurando conforme avance el proyecto.

## [0.1.1] - 2026-03-20

### Añadido

- Primera entrega real del módulo de backups remotos con WebDAV / Nextcloud.
- Nueva ruta `app/api/backups/push/route.ts` para enviar snapshots remotos manualmente.
- Historial de ejecuciones remotas en la pantalla `/backups`.
- Migración `202603201030_add_remote_backup_runs.sql`.
- Nuevo módulo de correo saliente con soporte SMTP o Resend.
- Nueva pantalla `/mail` para comprobar proveedor y enviar correos de prueba.
- Primera entrega del correo entrante con IMAP manual, bandeja interna e historial de sincronizaciones.
- Migración `202603201200_add_inbound_mail_module.sql`.
- Primera entrega del módulo de presupuestos y albaranes con persistencia, estados y conversión a factura.
- Nueva ruta `/presupuestos`.
- Migración `202603201330_add_commercial_documents_module.sql`.
- Primera entrega del módulo OCR de gastos con subida de justificantes, extracción de texto y revisión.
- Nueva ruta `/gastos`.
- Migración `202603201430_add_expenses_module.sql`.
- Primera entrega del módulo CRM ligero con fichas manuales de cliente y proveedor.
- Nueva ruta `/clientes`.
- Migración `202603201520_add_clients_module.sql`.
- Primera entrega del módulo de firma documental con enlaces públicos para presupuestos y albaranes.
- Nuevas rutas `/firmas` y `/firma/[token]`.
- Migración `202603201640_add_document_signature_module.sql`.
- Primera entrega del módulo de conciliación bancaria con extractos CSV y conciliación manual.
- Nueva ruta `/banca`.
- Migración `202603201730_add_bank_reconciliation_module.sql`.
- Primera entrega del centro de cobros y vencimientos.
- Nueva ruta `/cobros`.
- Migración `202603201900_add_invoice_collection_tracking.sql`.
- Seguimiento de recordatorios de cobro con contador y última fecha enviada.
- Migración `202603201945_add_invoice_reminder_tracking.sql`.
- Cola recomendada de recordatorios por lote para vencidas, parciales y próximas a vencer.
- Historial persistente de recordatorios de cobro con trazabilidad por envío manual o por lote.
- Migración `202603202015_add_invoice_reminder_history.sql`.
- Script `npm run doctor` para validar la instalación y nuevas cabeceras de seguridad en Next.js.
- Suite inicial de tests unitarios con Vitest para cobros, seguridad, Facturae y firma documental.
- Evidencia reforzada de firma con hash de integridad del documento y bloqueo si el documento cambió tras generar el enlace.
- Bandeja `/feedback` para registrar feedback interno o de pilotos.
- Migración `202603202120_add_feedback_entries.sql`.
- Primera entrega del módulo Facturae / VeriFactu con panel propio y exportación XML Facturae 3.2.2 sin firma.
- Nuevas rutas `/facturae` y `app/api/invoices/[invoiceId]/facturae/route.ts`.

### Mejorado

- Nuevo modo local privado con acceso por email y contraseña dentro de la instalación del cliente.
- Bootstrap opcional del primer usuario local sin depender de magic link ni correo.
- Documentación nueva para instalaciones privadas locales en `docs/INSTALACION_LOCAL_PRIVADA.md`.
- CI ampliada a Linux y Windows con `lint`, `typecheck`, tests unitarios, build demo y smoke tests.
- Scripts demo rehechos para ser multiplataforma y no depender de sintaxis Unix.
- Nueva batería `npm run test:smoke` contra un `next start` real en modo demo.
- Nuevos tests para el asistente de renta y helpers del módulo de gastos.
- Documentación QA alineada con ISO/IEC 25010 y plan detallado de VeriFactu / firma digital.
- Catálogo `/modules` actualizado para reflejar el estado real del sistema modular.
- Pantalla `/system` con visibilidad sobre la configuración de backups remotos.
- Documentación de instalación y despliegue ampliada para usuarios self-hosted.
- Envío de facturas desacoplado de Resend como único proveedor.
- Los backups ahora incluyen también el inbox de correo y su historial de sincronización.
- Los backups incluyen también los documentos de pre-facturación.
- Los backups incluyen ahora también los gastos importados.
- Los backups incluyen también las fichas guardadas del CRM ligero.
- Los backups incluyen también las solicitudes de firma documental.
- Los backups incluyen también el histórico de movimientos bancarios.
- El módulo de presupuestos incorpora filtros y seguimiento más claro por estado y tipo.
- El catálogo `/modules` pasa a reflejar Facturae / VeriFactu como módulo parcial ya operativo.
- Dashboard, historial y CRM muestran ahora saldo pendiente, facturas vencidas y estado de cobro.
- Los PDFs y la vista pública de factura muestran la fecha de vencimiento.
- `/cobros` permite enviar recordatorios de pago por email con IA local como apoyo opcional y fallback local.
- `/cobros` incorpora reglas operativas simples para lanzar lotes de recordatorios sin revisar factura por factura.
- `/cobros` muestra también la actividad reciente de recordatorios y los backups ya conservan esa trazabilidad.
- `npm run typecheck` deja de depender de borrar toda la carpeta `.next` y ya no se rompe si hay un servidor local activo.
- Facturae incluye ahora mayor validación previa de NIF y vencimiento, además de detalles de pago en el XML.
- Los backups incluyen también la bandeja de feedback y el restore recupera ese histórico.

## [0.1.0] - 2026-03-19

### Añadido

- Base del proyecto con Next.js 15, TypeScript y Tailwind CSS.
- Dashboard protegido con autenticación vía Supabase.
- Gestión de perfil fiscal del emisor.
- Creación de facturas con IVA, IRPF, numeración automática y PDF profesional.
- Historial de facturas con descarga de PDF y envío por email.
- Página pública de factura con QR.
- Estudio documental con IA local vía LM Studio.
- Exportación documental a PDF y Word.
- Módulo opcional de mensajería unificada para WhatsApp Business y Telegram.
- Centro de backups con exportación y restauración JSON del usuario.
- Modo demo para revisar la interfaz sin servicios reales.
- Documentación inicial en español.

### Mejorado

- UX del dashboard, instalación privada, nueva factura, historial y documentos.
- Integración de legislación oficial BOE y AEAT dentro del flujo de facturación.
- Soporte para propuestas, presupuestos y contratos desde la cabina documental.
- Reorientación del proyecto a instalación privada sin monetización integrada.

### Documentación

- `README.md`
- `docs/INSTALACION.md`
- `docs/ARQUITECTURA.md`
- `docs/DESPLIEGUE.md`
- `CONTRIBUTING.md`
- `CODE_OF_CONDUCT.md`
- `SECURITY.md`
- plantillas de issues y pull requests
- workflow de CI para `lint`, `typecheck` y `demo:build`

### Notas

- El repositorio está preparado para publicarse como proyecto open source.
- La licencia asumida en esta primera versión es MIT.
