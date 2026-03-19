# Instalación y configuración

## Requisitos

- Node.js 20 o superior
- npm
- Proyecto Supabase
- Cuenta Resend
- LM Studio disponible en red local o en la misma máquina

## 1. Instalar dependencias

Si usas `nvm`, puedes cargar la versión recomendada del proyecto:

```bash
nvm use
```

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
3. `supabase/migrations/202603192230_add_message_inbox.sql`
4. `supabase/migrations/202603192345_remove_billing_for_self_hosted.sql`

Estas migraciones crean:

- tablas principales
- políticas RLS
- bucket de logos
- secuencia de numeración
- tabla de uso de IA
- bandeja opcional de mensajería
- limpieza de tablas y columnas de billing heredadas

## 4. Configurar Resend

Añade:

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

## 5. Configurar LM Studio

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

## 6. Levantar el proyecto

Modo normal:

```bash
npm run dev
```

Modo demo:

```bash
FACTURAIA_DEMO_MODE=1 npm run dev
```

## 7. Validación recomendada

```bash
npm run typecheck
npm run lint
FACTURAIA_DEMO_MODE=1 npm run build
```
