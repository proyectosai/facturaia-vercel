# Despliegue en Coolify / Hetzner

## Objetivo

Esta guía deja FacturaIA lista para desplegar en una máquina propia o en una infraestructura tipo Hetzner con Coolify.

## Recomendación de despliegue

- Aplicación Next.js en modo Node.
- Base de datos y auth en Supabase gestionado.
- Resend como servicio externo opcional para correo saliente.
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

RESEND_API_KEY=
RESEND_FROM_EMAIL=

REMOTE_BACKUP_PROVIDER=webdav
WEBDAV_BASE_URL=
WEBDAV_USERNAME=
WEBDAV_PASSWORD=
WEBDAV_BACKUP_PATH=/FacturaIA
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

## Backups remotos en producción

La primera integración remota soportada es **WebDAV / Nextcloud**.

Recomendación práctica:

- usa una app password específica para FacturaIA
- guarda las variables en Coolify como secretos
- apunta `WEBDAV_BASE_URL` al endpoint WebDAV del usuario final
- usa `WEBDAV_BACKUP_PATH` para encapsular todas las copias en una carpeta dedicada

Ejemplo:

```env
REMOTE_BACKUP_PROVIDER=webdav
WEBDAV_BASE_URL=https://cloud.tudominio.com/remote.php/dav/files/facturaia
WEBDAV_USERNAME=facturaia
WEBDAV_PASSWORD=app-password
WEBDAV_BACKUP_PATH=/FacturaIA
```

## Hardening recomendado

- poner la app detrás de proxy con HTTPS
- limitar acceso al host de LM Studio
- limitar acceso al destino WebDAV si el proveedor lo permite
- revisar logs de mensajería si activas WhatsApp Business o Telegram
- monitorizar errores de render PDF / DOCX
- almacenar backups fuera del servidor principal de vez en cuando
- rotar claves periódicamente

## Comprobaciones post-despliegue

1. Login por magic link.
2. Acceso a dashboard.
3. Creación de factura.
4. Descarga de PDF.
5. Generación documental con IA.
6. Exportación DOCX.
7. Envío de email con Resend, si está activado.
8. Webhooks de mensajería, si están activados.
9. Exportación y restauración de backup desde `/backups`.
10. Envío de un backup remoto manual a WebDAV / Nextcloud, si está activado.
11. Revisión del catálogo modular en `/modules`.

## Checklist de producción

- variables de entorno cargadas
- migraciones de Supabase aplicadas
- dominio y callback correctos
- Resend verificado si usarás emails
- LM Studio accesible
- estrategia de backup definida
- variables WebDAV definidas si usarás backups remotos
- build correcto
- healthcheck manual sobre `/`, `/instalacion`, `/login`
