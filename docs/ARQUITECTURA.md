# Arquitectura funcional y técnica

## Visión general

FacturaIA está diseñada como una aplicación Next.js 15 con App Router, priorizando:

- Server Components por defecto
- Server Actions para operaciones críticas
- persistencia en Supabase
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
- `app/(protected)/dashboard/page.tsx`
- `app/(protected)/new-invoice/page.tsx`
- `app/(protected)/presupuestos/page.tsx`
- `app/(protected)/firmas/page.tsx`
- `app/(protected)/gastos/page.tsx`
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
- `app/api/invoices/[invoiceId]/pdf/route.ts`
- `app/api/public/invoices/[publicId]/pdf/route.ts`
- `app/api/integrations/telegram/[inboundKey]/route.ts`
- `app/api/integrations/whatsapp/[inboundKey]/route.ts`

## Capas lógicas

## 1. Autenticación

Archivos clave:

- `lib/auth.ts`
- `lib/supabase/server.ts`
- `lib/supabase/client.ts`
- `middleware.ts`

Funciones:

- obtener usuario opcional
- exigir usuario autenticado
- hidratar perfil y registro de usuario
- soporte de modo demo

## 2. Facturación

Archivos clave:

- `components/invoices/invoice-form.tsx`
- `lib/actions/invoices.ts`
- `lib/invoices.tsx`
- `lib/invoice-math.ts`

Responsabilidades:

- edición de factura
- cálculo de IVA / IRPF / total
- persistencia en Supabase
- generación de PDF
- enlace público y QR

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

## 11. Copias de seguridad

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
- inclusión de gastos y justificantes asociados
- inclusión de solicitudes de firma y respuestas
- sincronización manual a WebDAV / Nextcloud
- historial de últimas ejecuciones remotas

## 12. Mensajería opcional

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
- exportación XML VeriFactu
- contratos con más parametrización
- backups programados y snapshots cifrados
- respuestas salientes y automatizaciones sobre mensajería
