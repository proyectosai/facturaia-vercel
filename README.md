# FacturaIA

[![CI](https://github.com/proyectosai/facturaia/actions/workflows/ci.yml/badge.svg)](https://github.com/proyectosai/facturaia/actions/workflows/ci.yml)
[![Licencia: MIT](https://img.shields.io/badge/licencia-MIT-2f7d32.svg)](./LICENSE)

FacturaIA es una aplicación Next.js 15 pensada para autónomos y pequeños negocios españoles que quieren gestionar facturas, documentos y mensajería desde una instalación privada en su propio ordenador o servidor.

## Qué incluye

- Autenticación por magic link con Supabase.
- Dashboard protegido con sidebar en español.
- Gestión de perfil fiscal del emisor.
- Creación de facturas con IVA, IRPF, numeración automática y PDF profesional.
- Historial de facturas con descarga de PDF y envío por email con Resend.
- Página pública de factura con QR.
- Estudio documental con IA local vía LM Studio para propuestas, presupuestos, contratos y mensajes.
- Exportación de documentos a PDF y Word.
- Módulo opcional de mensajería unificada para WhatsApp Business y Telegram por webhook.
- Centro de backups para exportar y restaurar datos del usuario en JSON.
- Guía de instalación privada dentro de la propia app.
- Modo demo local para revisar la interfaz sin servicios reales.

## Filosofía del proyecto

- uso privado y autogestionado
- sin planes ni monetización integrada
- open source bajo licencia MIT
- arquitectura moderna, pero pragmática
- foco en utilidad real para autónomos españoles

## Stack técnico

- Next.js 15 + App Router
- TypeScript
- Tailwind CSS v4
- Componentes UI estilo shadcn/ui + Radix
- Supabase Auth + Postgres + Storage + RLS
- Resend
- `@react-pdf/renderer`
- `docx`
- LM Studio local usando `openai/gpt-oss-20b`

## Rutas principales

- `/`
- `/instalacion`
- `/login`
- `/dashboard`
- `/new-invoice`
- `/invoices`
- `/documents-ai`
- `/messages`
- `/system`
- `/backups`
- `/profile`
- `/factura/[publicId]`

## Instalación rápida

Si usas `nvm`, puedes fijar la versión recomendada con:

```bash
nvm use
```

Después:

```bash
npm install
cp .env.example .env.local
npm run dev
```

Modo demo:

```bash
FACTURAIA_DEMO_MODE=1 npm run dev
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
- [`supabase/migrations/202603192230_add_message_inbox.sql`](./supabase/migrations/202603192230_add_message_inbox.sql)
- [`supabase/migrations/202603192345_remove_billing_for_self_hosted.sql`](./supabase/migrations/202603192345_remove_billing_for_self_hosted.sql)
- [`supabase/migrations/202603200915_add_invoice_sequence_sync_function.sql`](./supabase/migrations/202603200915_add_invoice_sequence_sync_function.sql)

Tablas principales activas:

- `users`
- `profiles`
- `invoices`
- `ai_usage`
- `message_connections`
- `message_threads`
- `message_messages`

## Documentación adicional

- [Instalación y configuración](./docs/INSTALACION.md)
- [Arquitectura funcional y técnica](./docs/ARQUITECTURA.md)
- [Visión, alcance y pendientes](./docs/VISION_Y_PENDIENTES.md)
- [Despliegue en Coolify / Hetzner](./docs/DESPLIEGUE.md)
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
- El backup exporta JSON del usuario autenticado y la restauración actual funciona en modo reemplazo.
- La parte legal y fiscal mostrada en la UI no sustituye asesoramiento profesional.

## Verificación

```bash
npm run typecheck
npm run lint
FACTURAIA_DEMO_MODE=1 npm run build
```
