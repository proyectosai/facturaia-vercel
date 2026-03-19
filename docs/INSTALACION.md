# Instalación y configuración

## Requisitos

- Node.js 20 o superior
- npm
- Proyecto Supabase
- Cuenta Stripe
- Cuenta Resend
- LM Studio disponible en red local o en la misma máquina

## 1. Instalar dependencias

```bash
npm install
```

## 2. Configurar variables de entorno

Copia el fichero de ejemplo:

```bash
cp .env.example .env.local
```

Variables relevantes:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
FACTURAIA_DEMO_MODE=0

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

LM_STUDIO_BASE_URL=http://10.149.71.240:1234/v1
LM_STUDIO_MODEL=openai/gpt-oss-20b
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

## 3. Configurar Supabase

### Autenticación

- Activa login por email / magic link.
- Define `Site URL` con tu dominio o `http://localhost:3000`.
- Añade `http://localhost:3000/auth/callback` como URL de callback en local.

### Base de datos

Ejecuta las migraciones en este orden:

1. `supabase/migrations/202603191900_init_facturaia.sql`
2. `supabase/migrations/202603191945_add_ai_usage.sql`

Estas migraciones crean:

- tablas principales
- políticas RLS
- bucket de logos
- secuencia de numeración
- tabla de uso de IA

## 4. Configurar Stripe

Debes crear:

- 3 productos: Básico, Pro, Premium
- 6 precios: mensual y anual para cada plan

Después copia los `price_id` a:

- `STRIPE_PRICE_BASIC_MONTHLY`
- `STRIPE_PRICE_BASIC_YEARLY`
- `STRIPE_PRICE_PRO_MONTHLY`
- `STRIPE_PRICE_PRO_YEARLY`
- `STRIPE_PRICE_PREMIUM_MONTHLY`
- `STRIPE_PRICE_PREMIUM_YEARLY`

Webhook:

- endpoint local: `http://localhost:3000/api/stripe-webhook`
- endpoint producción: `https://tu-dominio.com/api/stripe-webhook`

Eventos mínimos:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

## 5. Configurar Resend

Añade:

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

## 6. Configurar LM Studio

FacturaIA usa LM Studio como backend de IA local.

Parámetros actuales:

- base URL: `LM_STUDIO_BASE_URL`
- modelo: `LM_STUDIO_MODEL`

Ejemplo:

```env
LM_STUDIO_BASE_URL=http://10.149.71.240:1234/v1
LM_STUDIO_MODEL=openai/gpt-oss-20b
```

Funciones actuales con IA:

- mejora de descripciones de factura
- generación de propuestas
- generación de presupuestos
- generación de contratos
- recordatorios y emails

## 7. Levantar el proyecto

Modo normal:

```bash
npm run dev
```

Modo demo:

```bash
FACTURAIA_DEMO_MODE=1 npm run dev
```

## 8. Validación recomendada

```bash
npm run typecheck
npm run lint
FACTURAIA_DEMO_MODE=1 npm run build
```
