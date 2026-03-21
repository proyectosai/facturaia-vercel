# Arquitectura funcional y técnica

## Visión general

FacturaIA está diseñada como una aplicación Next.js 15 con App Router, priorizando:

- Server Components por defecto
- Server Actions para operaciones críticas
- persistencia local privada en SQLite y persistencia opcional en Supabase
- UI en español
- separación entre facturación, documentos, mensajería e identidad fiscal

## Estructura principal

### `app/`

- `app/layout.tsx`
- `app/page.tsx`
- `app/login/page.tsx`
- `app/instalacion/page.tsx`
- `app/factura/[publicId]/page.tsx`
- `app/firma/[token]/page.tsx`
- `app/(protected)/facturae/page.tsx`
- `app/(protected)/dashboard/page.tsx`
- `app/(protected)/new-invoice/page.tsx`
- `app/(protected)/presupuestos/page.tsx`
- `app/(protected)/firmas/page.tsx`
- `app/(protected)/gastos/page.tsx`
- `app/(protected)/cobros/page.tsx`
- `app/(protected)/banca/page.tsx`
- `app/(protected)/clientes/page.tsx`
- `app/(protected)/invoices/page.tsx`
- `app/(protected)/messages/page.tsx`
- `app/(protected)/documents-ai/page.tsx`
- `app/(protected)/mail/page.tsx`
- `app/(protected)/modules/page.tsx`
- `app/(protected)/system/page.tsx`
- `app/(protected)/backups/page.tsx`
- `app/(protected)/profile/page.tsx`

### `app/api/`

- `app/api/ai/generate/route.ts`
- `app/api/ai/documents/route.ts`
- `app/api/ai/documents/export/pdf/route.ts`
- `app/api/ai/documents/export/docx/route.ts`
- `app/api/backups/export/route.ts`
- `app/api/backups/push/route.ts`
- `app/api/backups/restore/route.ts`
- `app/api/invoices/[invoiceId]/facturae/route.ts`
- `app/api/invoices/[invoiceId]/pdf/route.ts`
- `app/api/public/invoices/[publicId]/pdf/route.ts`
- `app/api/integrations/telegram/[inboundKey]/route.ts`
- `app/api/integrations/whatsapp/[inboundKey]/route.ts`

## Capas lógicas

## 1. Autenticación

Archivos clave:

- `lib/auth.ts`
- `lib/local-core.ts`
- `lib/local-db.ts`
- `lib/supabase/server.ts`
- `lib/supabase/client.ts`
- `middleware.ts`

Funciones:

- obtener usuario opcional
- exigir usuario autenticado
- hidratar perfil y registro de usuario
- soporte de modo demo
- acceso local con sesión propia, bloqueo temporal y expiración

## 1.1. Núcleo local

Archivos clave:

- `lib/local-core.ts`
- `lib/local-db.ts`

Responsabilidades:

- mantener el snapshot funcional del modo local
- poblar un mirror relacional dentro de `core.sqlite` como puente hacia un esquema SQLite real
- servir ya lecturas estructuradas de auditoría, uso, clientes y facturas desde ese mirror cuando no hay cifrado local activo
- aplicar también upserts dirigidos de bootstrap/login, perfil, feedback, clientes, facturas, cobros y recordatorios sobre ese mirror para reducir resincronizados completos
- tratar ya `clientes`, `facturas`, `recordatorios`, `auditoría` y `contadores` como secciones con SQLite prioritaria al reconstruir el núcleo en modo local
- usar ya repositorios locales separados para clientes, facturas, auditoría y contadores en restore/export y en varias mutaciones críticas
- intentar ya persistir primero esas mutaciones en SQLite y usar el snapshot como consolidación compatible
- recalcular contadores y estado base del usuario local
- preservar compatibilidad con instalaciones antiguas que todavía arranquen desde `core.json`

Nota:

- si `FACTURAIA_ENCRYPT_LOCAL_DATA=1`, el mirror relacional se desactiva para no duplicar datos sensibles en claro dentro de SQLite

## 2. Facturación

Archivos clave:

- `components/invoices/invoice-form.tsx`
- `lib/actions/invoices.ts`
- `lib/invoices.tsx`
- `lib/invoice-math.ts`
- `lib/collections.ts`
- `lib/collections-server.ts`

Responsabilidades:

- edición de factura
- cálculo de IVA / IRPF / total
- persistencia en Supabase
- generación de PDF
- enlace público y QR
- vencimiento y seguimiento básico de cobro

## 3. Uso privado y métricas internas

Archivos clave:

- `lib/billing.ts`
- `app/instalacion/page.tsx`

Responsabilidades:

- métricas internas de uso de facturas e IA
- compatibilidad con modo demo
- copy y rutas orientadas a instalación privada

## 4. Pre-facturación documental

Archivos clave:

- `app/(protected)/presupuestos/page.tsx`
- `components/commercial/commercial-document-form.tsx`
- `lib/actions/commercial-documents.ts`
- `lib/commercial-documents.ts`

Responsabilidades:

- crear presupuestos y albaranes
- persistirlos con numeración propia
- cambiar su estado operativo
- convertirlos después en factura sin rehacer datos
## 5. Catálogo modular

Archivos clave:

- `lib/modules.ts`
- `app/(protected)/modules/page.tsx`
- `docs/MODULOS_DFD.md`
- `docs/modulos/*`

Responsabilidades:

- definir módulos activos, parciales y planificados
- mostrar requisitos e instalación resumida por módulo
- dar un orden de implementación coherente

## 6. Gastos y OCR asistido

Archivos clave:

- `app/(protected)/gastos/page.tsx`
- `lib/expenses.ts`
- `lib/actions/expenses.ts`
- `supabase/migrations/202603201430_add_expenses_module.sql`

Funciones:

- subida de justificantes
- extracción de texto desde PDF o texto manual
- propuesta local de proveedor, fecha e importes
- revisión manual dentro de la app
- persistencia del justificante y del texto extraído

## 7. Documentos con IA

Archivos clave:

- `components/ai/documents-studio.tsx`
- `lib/ai.ts`
- `lib/ai-document-export.tsx`
- `app/api/ai/documents/route.ts`
- `app/api/ai/documents/export/pdf/route.ts`
- `app/api/ai/documents/export/docx/route.ts`

Funciones:

- generación documental con LM Studio
- limpieza de caracteres problemáticos
- exportación a PDF
- exportación a Word
- plantillas listas para propuesta, presupuesto y contrato

## 7.1. Estudio documental local implementado

Archivos clave:

- `app/(protected)/estudio-ia/page.tsx`
- `components/ai/document-study-lab.tsx`
- `app/api/ai/study/documents/route.ts`
- `app/api/ai/study/query/route.ts`
- `lib/document-study.ts`

Funciones:

- ingesta local de notas, TXT, Markdown y PDF extraído
- persistencia local de texto y metadatos por usuario
- recuperación por fragmentos relevantes
- respuesta con citas visibles
- fallback sin LLM cuando LM Studio no está disponible

Lectura correcta:

- esto ya es una pieza real y usable
- no usa todavía embeddings ni vector DB persistente
- no debe llamarse aún memoria multi-año ni RAG completo

## 7.2. Memoria local y RAG propuestos

Documento de referencia:

- `docs/MEMORIA_LOCAL_LLM.md`

Dirección recomendada:

- LM Studio como motor local compatible con OpenAI
- memoria factual separada de memoria semántica
- parser documental local para PDFs e imágenes
- índice vectorial local por usuario, cliente y ejercicio
- resúmenes persistentes para reducir contexto y mejorar continuidad

Objetivo:

- responder preguntas sobre años de actividad sin depender de cloud
- conservar trazabilidad documental
- evitar que el LLM actúe como fuente única de verdad

## 8. CRM ligero

Archivos clave:

- `app/(protected)/clientes/page.tsx`
- `lib/clients.ts`
- `lib/actions/clients.ts`
- `supabase/migrations/202603201520_add_clients_module.sql`

Funciones:

- fichas manuales de cliente y proveedor
- prioridad, estado, etiquetas y notas internas
- detección de contactos a partir de actividad ya existente
- timeline básica cruzando facturas, correo, mensajes, documentos y gastos
- edición simple desde la propia ficha

## 9. Firma documental

Archivos clave:

- `app/(protected)/firmas/page.tsx`
- `app/firma/[token]/page.tsx`
- `lib/signatures.ts`
- `lib/actions/signatures.ts`
- `supabase/migrations/202603201640_add_document_signature_module.sql`

Funciones:

- generación de enlaces públicos por documento comercial
- aceptación de presupuestos
- firma básica de albaranes
- registro de firmante, respuesta y evidencia mínima
- panel interno para revisar solicitudes pendientes o respondidas

## 10. Email

Archivos clave:

- `app/(protected)/mail/page.tsx`
- `lib/actions/mail.ts`
- `lib/mail.ts`
- `lib/inbound-mail.ts`
- `lib/resend.ts`
- `lib/actions/invoices.ts`

Funciones:

- detección del proveedor saliente
- soporte SMTP
- envío de factura por email
- correo de prueba desde la propia app
- adjunto del PDF generado
- importación IMAP manual
- bandeja interna por remitente
- historial de sincronizaciones entrantes

## 11. Conciliación bancaria

Archivos clave:

- `app/(protected)/banca/page.tsx`
- `lib/banking.ts`
- `lib/actions/banking.ts`
- `supabase/migrations/202603201730_add_bank_reconciliation_module.sql`

Funciones:

- importación manual de extractos CSV
- normalización de fechas, importes y direcciones
- sugerencias de conciliación contra facturas y gastos
- conciliación manual o descarte de movimientos
- inclusión del histórico bancario en backups y restauración

## 12. Cobros y vencimientos

Archivos clave:

- `app/(protected)/cobros/page.tsx`
- `app/(protected)/feedback/page.tsx`
- `lib/collections.ts`
- `lib/collections-server.ts`
- `lib/feedback.ts`
- `lib/actions/invoices.ts`
- `lib/actions/feedback.ts`
- `lib/actions/banking.ts`
- `supabase/migrations/202603201900_add_invoice_collection_tracking.sql`

Funciones:

- persistir vencimiento y estado económico en cada factura
- mostrar saldo pendiente y facturas vencidas en dashboard, historial y CRM
- marcar cobros manualmente
- enviar recordatorios de cobro por email con apoyo opcional de IA local
- agrupar automáticamente lotes de recordatorio por prioridad operativa
- conservar un historial visible de avisos enviados y su modo de lanzamiento
- recalcular cobros al conciliar ingresos bancarios
- trasladar la fecha de vencimiento a PDF y factura pública

## 13. Feedback y pilotos

Archivos clave:

- `app/(protected)/feedback/page.tsx`
- `lib/feedback.ts`
- `lib/actions/feedback.ts`
- `supabase/migrations/202603202120_add_feedback_entries.sql`

Funciones:

- registrar feedback interno o de pilotos
- clasificar por módulo, severidad y estado
- mantener un backlog operativo dentro de la app
- incluir ese histórico en backups y restore

## 14. Facturae / VeriFactu

Archivos clave:

- `app/(protected)/facturae/page.tsx`
- `app/api/invoices/[invoiceId]/facturae/route.ts`
- `lib/facturae.ts`

Funciones:

- revisión previa por factura
- exportación XML Facturae 3.2.2 sin firma
- avisos sobre direcciones, NIF y retenciones
- acceso a fuentes oficiales de BOE, Facturae y AEAT
- punto de partida para cumplimiento más avanzado
- validación más estricta de NIF y vencimiento
- detalle de pago y vencimiento dentro del XML

## 15. Copias de seguridad

Archivos clave:

- `app/(protected)/backups/page.tsx`
- `components/backups/backup-center.tsx`
- `lib/backups.ts`
- `lib/remote-backups.ts`
- `app/api/backups/export/route.ts`
- `app/api/backups/push/route.ts`
- `app/api/backups/restore/route.ts`

Funciones:

- exportación JSON del usuario autenticado
- restauración en modo reemplazo
- resincronización de la secuencia de facturas
- inclusión de presupuestos y albaranes en la copia
- inclusión del historial de recordatorios de cobro
- inclusión del feedback interno y de pilotos
- inclusión de gastos y justificantes asociados
- inclusión de movimientos bancarios y su estado de conciliación
- inclusión de solicitudes de firma y respuestas
- sincronización manual a WebDAV / Nextcloud
- historial de últimas ejecuciones remotas

## 14. Mensajería opcional

Archivos clave:

- `app/(protected)/messages/page.tsx`
- `lib/messages.ts`
- `lib/actions/messages.ts`
- `app/api/integrations/telegram/[inboundKey]/route.ts`
- `app/api/integrations/whatsapp/[inboundKey]/route.ts`

Funciones:

- bandeja unificada para WhatsApp Business y Telegram
- ordenación por fecha, urgencia, nombre y apellidos
- detección básica de prioridad por contenido
- panel de configuración de webhooks por usuario
- almacenamiento de conversaciones y mensajes

## Modelo de datos

Tablas principales:

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

## `users`

- identidad mínima del usuario autenticado
- email
- timestamps de creación y actualización

## `profiles`

- nombre fiscal
- NIF
- dirección
- logo

## `invoices`

- datos del emisor
- datos del cliente
- líneas

## `clients`

- fichas ligeras de cliente o proveedor
- estado y prioridad operativa
- email, teléfono, NIF y dirección
- notas internas y etiquetas

## `document_signature_requests`

- enlace público único por solicitud
- tipo de solicitud según documento
- estado de respuesta
- fechas de solicitud, visualización y respuesta
- identidad básica del firmante
- evidencia técnica mínima
- IVA
- IRPF
- total
- identificador público
- número automático

## `commercial_documents`

- tipo documental (`quote` o `delivery_note`)
- estado (`draft`, `sent`, `accepted`, `rejected`, `delivered`, `signed`, `converted`)
- numeración propia
- datos fiscales y de cliente
- líneas, IVA, IRPF y total
- referencia opcional a la factura generada después

## `expenses`

- tipo de justificante (`ticket` o `supplier_invoice`)
- estado de revisión (`draft` o `reviewed`)
- proveedor, NIF, fecha y cantidades propuestas
- ruta al archivo original
- método de extracción de texto
- texto bruto y payload extraído

## `bank_movements`

- alias de cuenta por importación
- fecha contable y fecha valor
- concepto, contraparte e importe
- dirección `credit` o `debit`
- estado `pending`, `reconciled` o `ignored`
- referencia opcional a factura o gasto enlazado
- hash de origen para evitar duplicados

## `ai_usage`

- usuario
- fecha UTC
- contador diario

## `message_connections`

- conexión por usuario y canal
- clave de entrada del webhook
- verify token para WhatsApp
- estado del canal

## `message_threads`

- conversación agregada por cliente
- urgencia
- último mensaje
- contador sin leer
- datos de nombre, apellidos, teléfono o alias

## `message_messages`

- detalle de cada mensaje recibido
- payload original
- fecha exacta
- tipo de mensaje

## `remote_backup_runs`

- historial de copias remotas por usuario
- proveedor usado
- estado `success` o `error`
- ruta remota y nombre de fichero
- último error, si existe

## `mail_threads`

- hilo de correo agrupado por remitente
- urgencia calculada
- último asunto y vista previa
- contador de no leídos

## `mail_messages`

- mensaje individual importado por IMAP
- remitente y destinatarios
- cuerpo de texto y HTML
- `message-id` externo para deduplicación

## `mail_sync_runs`

- historial de sincronizaciones IMAP
- cantidad importada
- detalle del resultado

## Modo demo

El proyecto soporta un modo demo activado por:

```env
FACTURAIA_DEMO_MODE=1
```

En este modo:

- se desbloquea la navegación protegida
- se inyectan datos demo
- se puede revisar la UI sin credenciales reales
- la persistencia real queda limitada

## Decisiones de arquitectura

- Supabase como backend unificado para auth, base de datos y storage.
- LM Studio como sustituto local de API de IA externa.
- PDF y DOCX generados server-side para mantener consistencia de salida.
- componentes de UI desacoplados de la lógica de negocio.

## Riesgos conocidos

- la parte fiscal no sustituye revisión profesional
- algunas integraciones dependen de credenciales reales externas
- los enlaces legales son de referencia y deben revisarse periódicamente

## Siguientes mejoras naturales

- tests e2e
- seed de datos
- README operativo para onboarding de equipo
- firma y validación más estricta del XML fiscal
- contratos con más parametrización
- backups programados y snapshots cifrados
- respuestas salientes y automatizaciones sobre mensajería
