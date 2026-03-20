# Instalación en Linux

Esta guía está pensada para una instalación local de FacturaIA en Linux de escritorio o en un pequeño servidor propio.

## Camino recomendado

Para la mayoría de usuarios:

1. usa Docker
2. activa el modo local privado
3. crea la cuenta inicial en `/login`
4. valida perfil, facturas y backups

## Antes de empezar

Necesitas:

- una distribución Linux actual
- `Docker` y `docker compose`

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

Con tu editor favorito, deja al menos:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
FACTURAIA_DEMO_MODE=0
FACTURAIA_LOCAL_MODE=1
FACTURAIA_LOCAL_BOOTSTRAP=1
FACTURAIA_LOCAL_SESSION_SECRET=pon-aqui-un-secreto-largo-y-unico
FACTURAIA_DATA_DIR=/opt/facturaia/data
```

### 3. Crea la carpeta de datos

```bash
mkdir -p /opt/facturaia/data
```

### 4. Arranca FacturaIA

```bash
docker compose -f compose.app.yml up --build
```

### 5. Entra por primera vez

Abre:

- `http://localhost:3000/login`

Y crea la cuenta local inicial.

### 6. Desactiva el bootstrap

Cambia en `.env.local`:

```env
FACTURAIA_LOCAL_BOOTSTRAP=0
```

Reinicia:

```bash
docker compose -f compose.app.yml down
docker compose -f compose.app.yml up --build
```

## Opción C. Instalación sin Docker

### 1. Instala Node.js 20 LTS

### 2. Instala dependencias

```bash
npm install
```

### 3. Prepara `.env.local`

```bash
cp .env.example .env.local
```

### 4. Comprueba la instalación

```bash
npm run doctor
```

### 5. Arranca la app

```bash
npm run dev
```

## IA local con LM Studio

Si LM Studio está en la misma máquina o en tu red local:

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
2. la carpeta de `FACTURAIA_DATA_DIR`

## Problemas habituales en Linux

### La app muestra recursos viejos después de actualizar

```bash
rm -rf .next
npm install
npm run build
```

### No puedo entrar tras la primera cuenta

Pon `FACTURAIA_LOCAL_BOOTSTRAP=0` y reinicia la app.
