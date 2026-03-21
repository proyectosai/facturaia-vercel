# Módulo: backups remotos

## Estado actual

El módulo ya está operativo en su primera entrega con **WebDAV / Nextcloud**.

Qué incluye hoy:

- exportación local JSON desde `/backups`
- manifest de exportación con conteos y checksum de integridad
- envío manual de esa copia a un destino remoto WebDAV
- historial de últimas ejecuciones remotas dentro de la app
- soporte para instalaciones privadas en portátil, sobremesa, VPS o NAS

Qué queda para más adelante:

- backups programados
- retención automática
- cifrado adicional del fichero antes de subirlo
- otros proveedores como S3, Dropbox o Google Drive

## Cuándo conviene activarlo

Actívalo si no quieres depender solo del disco del equipo o del VPS donde corre FacturaIA.

Casos típicos:

- trabajas en tu ordenador y quieres una copia fuera de la máquina
- tienes la app en un VPS y quieres copia en Nextcloud
- quieres separar el backup del servidor principal

## Requisitos

- módulo de backups locales ya operativo
- Supabase configurado
- acceso a un servidor WebDAV o a una cuenta Nextcloud
- variables de entorno cargadas
- migración `202603201030_add_remote_backup_runs.sql` aplicada si quieres ver historial dentro de la app

## Variables de entorno

Añade estas variables a tu `.env.local` o al panel del servidor:

```env
REMOTE_BACKUP_PROVIDER=webdav
WEBDAV_BASE_URL=
WEBDAV_USERNAME=
WEBDAV_PASSWORD=
WEBDAV_BACKUP_PATH=/FacturaIA
```

### Significado de cada variable

- `REMOTE_BACKUP_PROVIDER`
  - proveedor activo
  - por ahora debe ser exactamente `webdav`

- `WEBDAV_BASE_URL`
  - URL base del endpoint WebDAV
  - ejemplo típico de Nextcloud:
    - `https://cloud.tudominio.com/remote.php/dav/files/tu_usuario`

- `WEBDAV_USERNAME`
  - usuario con permisos para crear carpetas y subir archivos

- `WEBDAV_PASSWORD`
  - contraseña o app password del usuario WebDAV

- `WEBDAV_BACKUP_PATH`
  - carpeta base dentro del almacenamiento remoto
  - ejemplo:
    - `/FacturaIA`
    - `/Backups/FacturaIA`

FacturaIA creará dentro de esa carpeta una subcarpeta con el `user_id` del usuario autenticado y subirá ahí cada snapshot.

## Ejemplo con Nextcloud

Ejemplo realista:

```env
REMOTE_BACKUP_PROVIDER=webdav
WEBDAV_BASE_URL=https://cloud.mi-despacho.es/remote.php/dav/files/rivera
WEBDAV_USERNAME=rivera
WEBDAV_PASSWORD=app-password-generada-en-nextcloud
WEBDAV_BACKUP_PATH=/FacturaIA
```

Ruta final esperada de los ficheros:

```text
/FacturaIA/<user_id>/facturaia-<user_id>-<timestamp>.json
```

## Instalación paso a paso

### 1. Actualiza variables

Rellena las variables anteriores en tu entorno local o de producción.

### 2. Aplica migraciones

Asegúrate de haber aplicado, como mínimo, estas migraciones:

1. `202603191900_init_facturaia.sql`
2. `202603191945_add_ai_usage.sql`
3. `202603192230_add_message_inbox.sql`
4. `202603192345_remove_billing_for_self_hosted.sql`
5. `202603200915_add_invoice_sequence_sync_function.sql`
6. `202603201030_add_remote_backup_runs.sql`

### 3. Reinicia la aplicación

Después de cambiar variables de entorno, reinicia FacturaIA.

En desarrollo:

```bash
npm run dev
```

En producción:

```bash
npm run build
npm run start
```

### 4. Abre `/backups`

La tarjeta `Backups remotos` debe mostrar:

- proveedor: `WebDAV / Nextcloud`
- estado: `Configurado`
- destino remoto detectado

Si aparece `Pendiente`, revisa las variables.

### 5. Lanza una sincronización manual

Pulsa `Enviar copia remota ahora`.

Si todo está bien:

- verás un toast de éxito
- aparecerá una entrada nueva en el historial de ejecuciones
- el fichero quedará subido en tu almacenamiento remoto

## Cómo comprobar que funciona

Checklist recomendada:

1. descarga primero un backup local
2. lanza un backup remoto
3. entra en tu Nextcloud o servidor WebDAV
4. comprueba que existe la carpeta base
5. comprueba que existe la subcarpeta del usuario
6. verifica que el JSON subido tiene fecha reciente

## Qué se sube exactamente

El backup remoto reutiliza el mismo JSON del backup local.

Incluye:

- perfil fiscal
- facturas
- histórico de uso de IA
- conexiones de mensajería
- conversaciones
- mensajes

Además, el fichero exportado ya lleva:

- `manifest` con fecha, versión y módulos incluidos
- `counts` por tipo de dato
- `checksum` SHA-256 para detectar copias dañadas o manipuladas antes de restaurar

No incluye:

- binarios reales del storage de Supabase
- el logo como archivo físico

El logo se conserva como:

- `logo_path`
- `logo_url`

## Limitaciones actuales

- solo hay envío manual desde la interfaz
- solo está implementado WebDAV / Nextcloud
- no hay limpieza automática de snapshots antiguos
- no hay cifrado adicional del JSON más allá del canal HTTPS que use el proveedor
- todavía no hay interfaz de `dry-run` previa a restauración, aunque el backend ya soporta validación previa del fichero

## Recomendaciones de seguridad

- usa siempre `HTTPS` en `WEBDAV_BASE_URL`
- si usas Nextcloud, crea una **app password** específica para FacturaIA
- no reutilices tu contraseña principal
- limita el usuario WebDAV a la carpeta necesaria si tu sistema lo permite
- mantén también una copia local periódica, no solo la remota

## Resolución de problemas

### La app dice que faltan variables WebDAV

Revisa:

- `REMOTE_BACKUP_PROVIDER=webdav`
- `WEBDAV_BASE_URL`
- `WEBDAV_USERNAME`
- `WEBDAV_PASSWORD`
- `WEBDAV_BACKUP_PATH`

### La sincronización falla con error 401 o 403

Suele indicar:

- usuario o contraseña incorrectos
- app password inválida
- permisos insuficientes sobre la carpeta destino

### La sincronización falla al crear carpetas

Revisa:

- que el endpoint sea realmente WebDAV
- que `WEBDAV_BASE_URL` apunte al directorio correcto del usuario
- que el usuario tenga permiso de escritura

### No veo historial de ejecuciones

Puede deberse a:

- falta de la migración `202603201030_add_remote_backup_runs.sql`
- despliegue antiguo sin reiniciar

## Ubicación en la app

- catálogo modular: `/modules`
- centro de backups: `/backups`
- estado técnico general: `/system`
