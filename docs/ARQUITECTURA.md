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
- `app/(protected)/dashboard/page.tsx`
- `app/(protected)/new-invoice/page.tsx`
- `app/(protected)/invoices/page.tsx`
- `app/(protected)/messages/page.tsx`
- `app/(protected)/documents-ai/page.tsx`
- `app/(protected)/system/page.tsx`
- `app/(protected)/backups/page.tsx`
- `app/(protected)/profile/page.tsx`

### `app/api/`

- `app/api/ai/generate/route.ts`
- `app/api/ai/documents/route.ts`
- `app/api/ai/documents/export/pdf/route.ts`
- `app/api/ai/documents/export/docx/route.ts`
- `app/api/backups/export/route.ts`
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

## 4. Documentos con IA

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

## 5. Email

Archivos clave:

- `lib/resend.ts`
- `lib/actions/invoices.ts`

Funciones:

- envío de factura por email
- adjunto del PDF generado

## 6. Copias de seguridad

Archivos clave:

- `app/(protected)/backups/page.tsx`
- `components/backups/backup-center.tsx`
- `lib/backups.ts`
- `app/api/backups/export/route.ts`
- `app/api/backups/restore/route.ts`

Funciones:

- exportación JSON del usuario autenticado
- restauración en modo reemplazo
- resincronización de la secuencia de facturas

## 7. Mensajería opcional

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
- `ai_usage`
- `message_connections`
- `message_threads`
- `message_messages`

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
- IVA
- IRPF
- total
- identificador público
- número automático

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
