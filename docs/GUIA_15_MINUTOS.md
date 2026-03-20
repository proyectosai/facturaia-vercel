# Guía en 15 minutos

Esta guía está pensada para una persona no técnica o semi-técnica que quiere probar FacturaIA sin instalar todos los módulos de golpe.

## Camino 1: demo rápida en 5 minutos

Si solo quieres ver la app:

```bash
docker compose -f compose.demo.yml up --build
```

Después abre:

- `http://localhost:3000`
- `http://localhost:3000/dashboard`
- `http://localhost:3000/new-invoice`

Con esto no necesitas Supabase, correo, IMAP, LM Studio ni mensajería.

## Camino 2: instalación básica real en 15 minutos

### 1. Copia el entorno

```bash
cp .env.example .env.local
```

### 2. Rellena solo lo imprescindible

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

MAIL_PROVIDER=smtp
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_FROM_EMAIL=
```

No actives todavía:

- IMAP
- mensajería
- OCR de gastos
- banca
- Facturae
- LM Studio

### 3. Arranca la app

```bash
docker compose -f compose.app.yml up --build
```

### 4. Configura el núcleo

Haz solo esto:

1. entra en `/profile`
2. rellena emisor, NIF, dirección y logo
3. crea una factura en `/new-invoice`
4. revisa `/invoices`
5. prueba el correo saliente en `/mail`
6. exporta un backup en `/backups`

### 5. Decide si te merece la pena seguir

Si con eso ya te encaja, entonces añade módulos avanzados poco a poco.

## Qué instalar después

Orden recomendado:

1. `Cobros`
2. `Presupuestos y albaranes`
3. `Backups remotos`
4. `Banca CSV`
5. `IMAP`
6. `Mensajería`
7. `OCR`
8. `Facturae / VeriFactu`

## Regla práctica

No instales cinco módulos nuevos el mismo día.

Primero valida:

- que puedes facturar
- que puedes enviar
- que puedes recuperar un backup

Luego amplías.
