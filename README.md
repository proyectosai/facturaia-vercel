# FacturaIA

[![CI](https://github.com/proyectosai/facturaia/actions/workflows/ci.yml/badge.svg)](https://github.com/proyectosai/facturaia/actions/workflows/ci.yml)
[![Licencia: MIT](https://img.shields.io/badge/licencia-MIT-2f7d32.svg)](./LICENSE)

FacturaIA es una aplicación Next.js 15 orientada a autónomos y pequeños negocios españoles para emitir facturas, gestionar suscripciones, generar documentos con IA local y trabajar con un panel moderno en español.

## Qué incluye

- Autenticación por magic link con Supabase.
- Dashboard protegido con sidebar.
- Gestión de perfil fiscal del emisor.
- Creación de facturas con IVA, IRPF, numeración automática y PDF profesional.
- Historial de facturas con descarga de PDF y envío por email con Resend.
- Página pública de factura con QR.
- Suscripciones con Stripe: Básico, Pro y Premium.
- Gating de funcionalidades según plan.
- Estudio documental con IA local vía LM Studio para propuestas, presupuestos, contratos y mensajes.
- Exportación de documentos a PDF y Word.
- Modo demo local para revisar la interfaz sin servicios reales.

## Stack técnico

- Next.js 15 + App Router
- TypeScript
- Tailwind CSS v4
- Componentes UI estilo shadcn/ui + Radix
- Supabase Auth + Postgres + Storage + RLS
- Stripe Billing + Checkout + Webhook
- Resend
- `@react-pdf/renderer`
- `docx`
- LM Studio local usando `openai/gpt-oss-20b`

## Estado actual

El proyecto está preparado como MVP serio de producto:

- La parte visual pública y protegida está trabajada.
- El panel funciona en modo demo sin Supabase real.
- La arquitectura de facturación, billing y documentos está montada.
- Hay documentación técnica y de despliegue en la carpeta [`docs`](./docs).

## Rutas principales

- `/`
- `/pricing`
- `/login`
- `/dashboard`
- `/new-invoice`
- `/invoices`
- `/documents-ai`
- `/profile`
- `/factura/[publicId]`

## Instalación rápida

Si usas `nvm`, puedes fijar la versión recomendada con:

```bash
nvm use
```

```bash
npm install
cp .env.example .env.local
npm run dev
```

Para levantar la app en modo demo:

```bash
FACTURAIA_DEMO_MODE=1 npm run dev
```

Para producción local:

```bash
FACTURAIA_DEMO_MODE=1 npm run build
FACTURAIA_DEMO_MODE=1 npm run start
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
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_BASIC_MONTHLY=
STRIPE_PRICE_BASIC_YEARLY=
STRIPE_PRICE_PRO_MONTHLY=
STRIPE_PRICE_PRO_YEARLY=
STRIPE_PRICE_PREMIUM_MONTHLY=
STRIPE_PRICE_PREMIUM_YEARLY=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
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

Tablas principales:

- `users`
- `profiles`
- `subscriptions`
- `invoices`
- `ai_usage`

## Documentación adicional

- [Instalación y configuración](./docs/INSTALACION.md)
- [Arquitectura funcional y técnica](./docs/ARQUITECTURA.md)
- [Despliegue en Coolify / Hetzner](./docs/DESPLIEGUE.md)
- [Hoja de ruta](./docs/ROADMAP.md)
- [Guía de contribución](./CONTRIBUTING.md)
- [Código de conducta](./CODE_OF_CONDUCT.md)
- [Política de seguridad](./SECURITY.md)
- [Changelog](./CHANGELOG.md)
- [Licencia](./LICENSE)

## Colaboración pública

El repositorio ya está preparado para trabajo abierto:

- CI en GitHub Actions sobre `push` y `pull_request`
- plantillas de issues para bugs y mejoras
- plantilla de pull request
- guía de contribución, código de conducta y política de seguridad

Si vas a participar, empieza por:

1. leer [CONTRIBUTING.md](./CONTRIBUTING.md)
2. revisar [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)
3. comprobar [SECURITY.md](./SECURITY.md) si el tema es sensible

## Notas importantes

- El proyecto usa IA local con LM Studio; no depende de una API externa para documentos.
- El flujo de Word y PDF documental ya está operativo.
- La parte legal / fiscal mostrada en la UI no sustituye asesoramiento profesional.
- Las URLs oficiales de BOE y AEAT están integradas dentro de la app para referencia rápida.

## Verificación

Comandos usados para validar el proyecto:

```bash
npm run typecheck
npm run lint
FACTURAIA_DEMO_MODE=1 npm run build
```
