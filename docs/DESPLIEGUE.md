# Despliegue en Coolify / Hetzner

## Objetivo

Esta guía deja FacturaIA lista para desplegar en una máquina propia o en una infraestructura tipo Hetzner con Coolify.

## Recomendación de despliegue

- Aplicación Next.js en modo Node.
- Base de datos y auth en Supabase gestionado.
- Stripe y Resend como servicios externos.
- LM Studio en red local o en un host interno accesible desde la aplicación.

## Build y arranque

Comandos:

```bash
npm install
npm run build
npm run start
```

Puerto por defecto:

- `3000`

## Variables necesarias en Coolify

```env
NEXT_PUBLIC_APP_URL=https://tu-dominio.com
FACTURAIA_DEMO_MODE=0

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

## Configuración de dominio

Debes apuntar el dominio final a la app desplegada y usar:

```env
NEXT_PUBLIC_APP_URL=https://tu-dominio.com
```

Esto afecta a:

- magic links de Supabase
- URLs públicas de facturas
- QR en PDFs
- redirecciones de Stripe

## Webhook de Stripe

Endpoint:

```text
https://tu-dominio.com/api/stripe-webhook
```

Eventos recomendados:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

## Supabase en producción

### Auth

En Supabase Auth debes registrar:

- `https://tu-dominio.com`
- `https://tu-dominio.com/auth/callback`

### SQL

Asegúrate de aplicar las migraciones incluidas en `supabase/migrations`.

## LM Studio en entorno real

La app espera una URL compatible con OpenAI-style Chat Completions.

Ejemplo:

```env
LM_STUDIO_BASE_URL=http://10.149.71.240:1234/v1
LM_STUDIO_MODEL=openai/gpt-oss-20b
```

Si el servidor de IA está en otra máquina:

- verifica conectividad desde el contenedor
- limita acceso por red
- evita exponerlo públicamente si no hace falta

## Hardening recomendado

- poner la app detrás de proxy con HTTPS
- limitar acceso al host de LM Studio
- revisar logs de webhook
- monitorizar errores de render PDF / DOCX
- rotar claves periódicamente

## Comprobaciones post-despliegue

1. Login por magic link.
2. Acceso a dashboard.
3. Creación de factura.
4. Descarga de PDF.
5. Generación documental con IA.
6. Exportación DOCX.
7. Checkout de Stripe.
8. Webhook de Stripe.
9. Envío de email con Resend.

## Checklist de producción

- variables de entorno cargadas
- migraciones de Supabase aplicadas
- Stripe configurado
- dominio y callback correctos
- Resend verificado
- LM Studio accesible
- build correcto
- healthcheck manual sobre `/`, `/pricing`, `/login`
