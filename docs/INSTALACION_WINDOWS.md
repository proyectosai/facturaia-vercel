# Instalación en Windows

Esta guía está pensada para una persona que quiere instalar FacturaIA en su propio ordenador con Windows 10 o Windows 11.

## Camino recomendado

Para la mayoría de usuarios:

1. instala `Docker Desktop`
2. activa el modo local privado
3. crea la primera cuenta en `/login`
4. configura solo perfil, facturas y backups

## Antes de empezar

Necesitas:

- `Windows 10` o `Windows 11`
- `Docker Desktop`

Opcional:

- `Node.js 20 LTS`
- `Git`
- `LM Studio`

## Opción A. Demo rápida con Docker

### 1. Descarga el proyecto

Puedes hacerlo de dos maneras:

- descargando el ZIP desde GitHub y descomprimiéndolo
- o con Git:

```powershell
git clone https://github.com/proyectosai/facturaia.git
cd facturaia
```

### 2. Abre PowerShell en la carpeta del proyecto

Ejemplo:

```powershell
cd C:\FacturaIA\facturaia
```

### 3. Arranca la demo

```powershell
docker compose -f compose.demo.yml up --build
```

### 4. Abre la aplicación

En el navegador:

- `http://localhost:3000`

### 5. Para la demo

Pulsa `Ctrl + C`.

## Opción B. Instalación local privada con Docker

Esta es la opción recomendada si quieres usar FacturaIA de verdad en tu propio ordenador.

### 1. Crea `.env.local`

```powershell
Copy-Item .env.example .env.local
```

### 2. Edita `.env.local`

```powershell
notepad .env.local
```

Deja al menos esto:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
FACTURAIA_DEMO_MODE=0
FACTURAIA_LOCAL_MODE=1
FACTURAIA_LOCAL_BOOTSTRAP=1
FACTURAIA_LOCAL_SESSION_SECRET=pon-aqui-un-secreto-largo-y-unico
FACTURAIA_DATA_DIR=C:\FacturaIA\data
```

Notas:

- no hace falta rellenar Supabase si solo quieres el núcleo local
- `FACTURAIA_DATA_DIR` debe apuntar a una carpeta estable del equipo

### 3. Crea la carpeta de datos

```powershell
New-Item -ItemType Directory -Force -Path C:\FacturaIA\data
```

### 4. Arranca FacturaIA

```powershell
docker compose -f compose.app.yml up --build
```

### 5. Entra por primera vez

Abre:

- `http://localhost:3000/login`

Introduce el email y la contraseña que quieras usar como cuenta local inicial.

### 6. Desactiva el bootstrap

Después de crear esa primera cuenta:

1. vuelve a abrir `.env.local`
2. cambia:

```env
FACTURAIA_LOCAL_BOOTSTRAP=0
```

3. reinicia la app:

```powershell
docker compose -f compose.app.yml down
docker compose -f compose.app.yml up --build
```

### 7. Configura el núcleo

Haz esto:

1. entra en `/profile`
2. rellena nombre, NIF y dirección
3. crea una factura en `/new-invoice`
4. revisa `/invoices`
5. exporta un backup en `/backups`

## Opción C. Instalación sin Docker

### 1. Instala Node.js 20 LTS

### 2. Instala dependencias

```powershell
npm install
```

### 3. Crea `.env.local`

```powershell
Copy-Item .env.example .env.local
notepad .env.local
```

Usa las mismas variables mínimas de la opción local privada.

### 4. Comprueba la instalación

```powershell
npm run doctor
```

### 5. Arranca la aplicación

```powershell
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

```powershell
git pull
docker compose -f compose.app.yml up --build
```

Sin Docker:

```powershell
git pull
npm install
npm run build
npm run dev
```

## Copias de seguridad

Haz dos cosas:

1. exporta backups desde `/backups`
2. guarda también la carpeta indicada en `FACTURAIA_DATA_DIR`

## Problemas habituales en Windows

### La app no arranca bien después de actualizar

Si usas Node.js sin Docker:

```powershell
Remove-Item -Recurse -Force .next
npm install
npm run build
```

### No puedo entrar después del primer arranque

Comprueba que ya has cambiado:

```env
FACTURAIA_LOCAL_BOOTSTRAP=0
```

Y reinicia la app.
