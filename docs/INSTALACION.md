# Instalación y configuración

## Requisitos

- Node.js 20 o superior
- npm
- Proyecto Supabase
- SMTP o cuenta Resend si vas a usar correo saliente
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

MAIL_PROVIDER=smtp
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_FROM_EMAIL=

RESEND_API_KEY=
RESEND_FROM_EMAIL=

REMOTE_BACKUP_PROVIDER=webdav
WEBDAV_BASE_URL=
WEBDAV_USERNAME=
WEBDAV_PASSWORD=
WEBDAV_BACKUP_PATH=/FacturaIA
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
5. `supabase/migrations/202603200915_add_invoice_sequence_sync_function.sql`
6. `supabase/migrations/202603201030_add_remote_backup_runs.sql`

Estas migraciones crean:

- tablas principales
- políticas RLS
- bucket de logos
- secuencia de numeración
- tabla de uso de IA
- bandeja opcional de mensajería
- limpieza de tablas y columnas de billing heredadas
- resincronización segura de numeración tras restaurar backups
- historial de ejecuciones de backups remotos

## 4. Configurar correo saliente

FacturaIA soporta dos opciones:

- SMTP
- Resend

### Opción SMTP

```env
MAIL_PROVIDER=smtp
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_FROM_EMAIL=
```

### Opción Resend

```env
MAIL_PROVIDER=resend
RESEND_API_KEY=
RESEND_FROM_EMAIL=
```

Después:

1. reinicia la aplicación
2. abre `/mail`
3. revisa el proveedor detectado
4. envía un correo de prueba

Para una instalación privada, SMTP suele ser la opción más natural.

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

## 8. Backups y restauración

La pantalla `/backups` permite:

- exportar un JSON con perfil, facturas, IA y mensajería del usuario actual
- restaurar ese JSON en modo reemplazo

Notas importantes:

- la restauración actual sustituye los datos del usuario autenticado
- el logo se exporta como ruta y URL, no como binario de storage
- tras restaurar, FacturaIA resincroniza la secuencia de numeración de facturas

## 9. Catálogo de módulos

La pantalla `/modules` resume:

- qué módulos existen ya
- cuál es el siguiente módulo del roadmap
- requisitos de instalación
- pasos resumidos por módulo
- documento asociado dentro de `docs/modulos`

## 10. Correo saliente en la app

La pantalla `/mail` permite:

- comprobar el proveedor detectado
- ver el remitente activo
- enviar un correo de prueba
- validar el mismo canal que luego usará `/invoices`

Guía completa:

- `docs/modulos/CORREO_SALIENTE.md`

## 11. Backups remotos por WebDAV / Nextcloud

Si quieres una copia fuera del equipo o del VPS principal, activa el módulo remoto.

### Variables necesarias

```env
REMOTE_BACKUP_PROVIDER=webdav
WEBDAV_BASE_URL=https://cloud.tudominio.com/remote.php/dav/files/tu_usuario
WEBDAV_USERNAME=tu_usuario
WEBDAV_PASSWORD=tu_app_password
WEBDAV_BACKUP_PATH=/FacturaIA
```

### Instalación mínima

1. Añade las variables anteriores.
2. Reinicia FacturaIA.
3. Abre `/backups`.
4. Comprueba que la tarjeta `Backups remotos` muestra `WebDAV / Nextcloud`.
5. Pulsa `Enviar copia remota ahora`.
6. Verifica el fichero en tu almacenamiento remoto.

### Recomendaciones

- usa una app password específica si trabajas con Nextcloud
- mantén HTTPS en la URL WebDAV
- prueba primero con una carpeta dedicada solo a FacturaIA
- consulta `docs/modulos/BACKUPS_REMOTOS.md` para la guía detallada
