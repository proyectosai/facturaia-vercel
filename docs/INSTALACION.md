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

INBOUND_MAIL_PROVIDER=imap
IMAP_HOST=
IMAP_PORT=993
IMAP_SECURE=true
IMAP_USERNAME=
IMAP_PASSWORD=
IMAP_MAILBOX=INBOX
IMAP_SYNC_UNSEEN_ONLY=true
IMAP_SYNC_MAX_MESSAGES=25

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
7. `supabase/migrations/202603201200_add_inbound_mail_module.sql`
8. `supabase/migrations/202603201330_add_commercial_documents_module.sql`
9. `supabase/migrations/202603201430_add_expenses_module.sql`
10. `supabase/migrations/202603201520_add_clients_module.sql`

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
- bandeja interna de correo entrante por IMAP
- flujo de presupuestos y albaranes previo a facturación
- circuito inicial de gastos con justificantes y revisión
- fichas de cliente y proveedor con notas internas y actividad relacionada

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

## 10. Presupuestos y albaranes

Este módulo añade persistencia propia para documentos previos a la factura.

Qué hace en esta primera entrega:

- crear presupuestos
- crear albaranes
- cambiar su estado
- convertirlos después en factura definitiva

Pasos:

1. aplica la migración `202603201330_add_commercial_documents_module.sql`
2. reinicia la aplicación
3. abre `/presupuestos`
4. crea un presupuesto o albarán de prueba
5. cambia su estado y conviértelo en factura cuando proceda

Guía completa:

- `docs/modulos/PRESUPUESTOS_ALBARANES.md`

## 11. OCR de gastos

Este módulo añade una primera entrega realista para gestión de justificantes de gasto.

Qué hace ahora:

- subir ticket o factura proveedor
- extraer texto si el PDF ya lo contiene
- permitir pegado manual de texto OCR
- proponer proveedor, fecha e importes
- dejar el gasto pendiente o revisado

Pasos:

1. aplica la migración `202603201430_add_expenses_module.sql`
2. reinicia FacturaIA
3. abre `/gastos`
4. sube un PDF o pega texto OCR
5. revisa el resultado antes de marcarlo como revisado

Guía completa:

- `docs/modulos/GASTOS_OCR.md`

## 12. Correo saliente en la app

La pantalla `/mail` permite:

- comprobar el proveedor detectado
- ver el remitente activo
- enviar un correo de prueba
- validar el mismo canal que luego usará `/invoices`

Guía completa:

- `docs/modulos/CORREO_SALIENTE.md`

## 13. Correo entrante por IMAP

Variables mínimas:

```env
INBOUND_MAIL_PROVIDER=imap
IMAP_HOST=
IMAP_PORT=993
IMAP_SECURE=true
IMAP_USERNAME=
IMAP_PASSWORD=
IMAP_MAILBOX=INBOX
IMAP_SYNC_UNSEEN_ONLY=true
IMAP_SYNC_MAX_MESSAGES=25
```

Instalación mínima:

1. añade las variables IMAP
2. reinicia FacturaIA
3. abre `/mail`
4. revisa el bloque `Correo entrante`
5. pulsa `Sincronizar inbox ahora`

Guía completa:

- `docs/modulos/CORREO_ENTRANTE.md`

## 14. Backups remotos por WebDAV / Nextcloud

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

## 15. CRM ligero

Este módulo crea fichas manuales de cliente o proveedor y las cruza con la actividad ya existente.

Qué hace ahora:

- guardar fichas con estado, prioridad y etiquetas
- detectar contactos desde facturas, mensajes, correo, documentos y gastos
- mostrar una timeline básica por ficha
- editar notas internas desde la propia pantalla

Pasos:

1. aplica la migración `202603201520_add_clients_module.sql`
2. reinicia FacturaIA
3. abre `/clientes`
4. crea una ficha manual o usa una sugerencia detectada
5. revisa la actividad relacionada

Guía completa:

- `docs/modulos/CRM_LIGERO.md`
