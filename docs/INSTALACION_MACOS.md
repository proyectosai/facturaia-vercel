# Instalación en macOS

Esta guía está pensada para una instalación local de FacturaIA en Mac.

## Camino recomendado

Para la mayoría de usuarios:

1. instala `Docker Desktop`
2. activa el modo local privado
3. crea la primera cuenta local
4. configura solo perfil, facturas y backups

## Antes de empezar

Necesitas:

- macOS reciente
- `Docker Desktop`

Opcional:

- `Node.js 20 LTS`
- `LM Studio`

## Opción A. Demo rápida con Docker

### 1. Descarga el proyecto

```bash
git clone https://github.com/proyectosai/facturaia.git
cd facturaia
```

### 2. Arranca la demo

```bash
docker compose -f compose.demo.yml up --build
```

### 3. Abre la app

- `http://localhost:3000`

## Opción B. Instalación local privada con Docker

### 1. Crea `.env.local`

```bash
cp .env.example .env.local
```

### 2. Edita `.env.local`

```bash
open -e .env.local
```

Deja al menos esto:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
FACTURAIA_DEMO_MODE=0
FACTURAIA_LOCAL_MODE=1
FACTURAIA_LOCAL_BOOTSTRAP=1
FACTURAIA_LOCAL_SESSION_SECRET=pon-aqui-un-secreto-largo-y-unico
FACTURAIA_DATA_DIR=/Users/tu-usuario/FacturaIA/data
```

### 3. Crea la carpeta de datos

```bash
mkdir -p /Users/tu-usuario/FacturaIA/data
```

### 4. Arranca FacturaIA

```bash
docker compose -f compose.app.yml up --build
```

### 5. Entra por primera vez

Abre:

- `http://localhost:3000/login`

Y crea tu cuenta local inicial.

### 6. Desactiva el bootstrap

Edita `.env.local` y cambia:

```env
FACTURAIA_LOCAL_BOOTSTRAP=0
```

Después reinicia:

```bash
docker compose -f compose.app.yml down
docker compose -f compose.app.yml up --build
```

### 7. Configura el núcleo

1. `/profile`
2. `/new-invoice`
3. `/invoices`
4. `/backups`

## Opción C. Instalación sin Docker

### 1. Instala Node.js 20 LTS

### 2. Instala dependencias

```bash
npm install
```

### 3. Crea y edita `.env.local`

```bash
cp .env.example .env.local
open -e .env.local
```

### 4. Verifica la instalación

```bash
npm run doctor
```

### 5. Arranca la app

```bash
npm run dev
```

## IA local con LM Studio

Cuando quieras activar IA local:

```env
LM_STUDIO_BASE_URL=http://127.0.0.1:1234/v1
LM_STUDIO_MODEL=openai/gpt-oss-20b
```

## Correo saliente

Ejemplo mínimo SMTP:

```env
MAIL_PROVIDER=smtp
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_FROM_EMAIL=
```

## Actualizar FacturaIA

Con Docker:

```bash
git pull
docker compose -f compose.app.yml up --build
```

Sin Docker:

```bash
git pull
npm install
npm run build
npm run dev
```

## Copias de seguridad

Guarda:

1. los exports de `/backups`
2. la carpeta indicada en `FACTURAIA_DATA_DIR`

## Problemas habituales en macOS

### La interfaz carga rara después de actualizar

```bash
rm -rf .next
npm install
npm run build
```

### No puedo entrar después del primer arranque

Comprueba que `FACTURAIA_LOCAL_BOOTSTRAP=0` y reinicia la app.
