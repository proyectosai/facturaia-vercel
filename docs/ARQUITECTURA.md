# Arquitectura funcional y técnica

## Visión general

FacturaIA está diseñada como una aplicación Next.js 15 con App Router, priorizando:

- Server Components por defecto
- Server Actions para operaciones críticas
- persistencia en Supabase
- UI en español
- separación entre facturación, billing, documentos e identidad fiscal

## Estructura principal

### `app/`

- `app/layout.tsx`
- `app/page.tsx`
- `app/login/page.tsx`
- `app/pricing/page.tsx`
- `app/factura/[publicId]/page.tsx`
- `app/(protected)/dashboard/page.tsx`
- `app/(protected)/new-invoice/page.tsx`
- `app/(protected)/invoices/page.tsx`
- `app/(protected)/documents-ai/page.tsx`
- `app/(protected)/profile/page.tsx`

### `app/api/`

- `app/api/ai/generate/route.ts`
- `app/api/ai/documents/route.ts`
- `app/api/ai/documents/export/pdf/route.ts`
- `app/api/ai/documents/export/docx/route.ts`
- `app/api/invoices/[invoiceId]/pdf/route.ts`
- `app/api/public/invoices/[publicId]/pdf/route.ts`
- `app/api/stripe-webhook/route.ts`

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

## 3. Billing y planes

Archivos clave:

- `lib/plans.ts`
- `lib/billing.ts`
- `lib/actions/stripe.ts`
- `app/api/stripe-webhook/route.ts`

Responsabilidades:

- definición de planes
- acceso por nivel de plan
- límites mensuales y diarios
- sincronización con Stripe

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

## Modelo de datos

Tablas principales:

- `users`
- `profiles`
- `subscriptions`
- `invoices`
- `ai_usage`

## `users`

- plan actual
- estado del plan
- customer de Stripe
- fecha de renovación

## `profiles`

- nombre fiscal
- NIF
- dirección
- logo

## `subscriptions`

- relación con Stripe
- precio
- producto
- intervalo mensual / anual
- estado de la suscripción

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
- Stripe separado del dominio interno mediante webhook de sincronización.
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
