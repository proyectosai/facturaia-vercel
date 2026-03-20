# Módulo: correo entrante

## Estado actual

El módulo ya está operativo en su primera entrega con **IMAP**.

Qué incluye hoy:

- sincronización manual desde `/mail`
- importación de correos del buzón configurado
- deduplicación por `message-id`
- agrupación por remitente
- orden por fecha, urgencia, nombre o email
- historial de sincronizaciones

Qué queda para iteraciones posteriores:

- sincronización programada
- hilos por asunto o `in-reply-to`
- marcados bidireccionales con el servidor IMAP
- asociación automática con clientes y facturas

## Cuándo conviene activarlo

Actívalo si quieres revisar correos importantes dentro de FacturaIA sin depender solo del cliente de email externo.

Casos típicos:

- clientes que responden por email a facturas o propuestas
- seguimiento operativo desde un buzón compartido
- centralizar mensajes y documentos en la misma instalación

## Variables de entorno

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

## Significado de cada variable

- `INBOUND_MAIL_PROVIDER`
  - por ahora debe ser `imap`

- `IMAP_HOST`
  - servidor IMAP
  - ejemplo:
    - `outlook.office365.com`
    - `imap.gmail.com`
    - `mail.tudominio.es`

- `IMAP_PORT`
  - normalmente `993`

- `IMAP_SECURE`
  - `true` o `false`
  - con `993` lo normal es `true`

- `IMAP_USERNAME`
  - usuario del buzón

- `IMAP_PASSWORD`
  - contraseña o app password del buzón

- `IMAP_MAILBOX`
  - nombre del buzón a revisar
  - normalmente `INBOX`

- `IMAP_SYNC_UNSEEN_ONLY`
  - si es `true`, importa solo mensajes no vistos
  - si es `false`, revisa todos los mensajes encontrados

- `IMAP_SYNC_MAX_MESSAGES`
  - máximo de mensajes revisados por sincronización
  - útil para no cargar demasiado la primera vez

## Instalación paso a paso

### 1. Añade las variables IMAP

Configúralas en `.env.local` o en tu panel de despliegue.

### 2. Aplica migraciones

Asegúrate de tener aplicada también:

- `202603201200_add_inbound_mail_module.sql`

### 3. Reinicia la app

Tras cualquier cambio de entorno, reinicia FacturaIA.

### 4. Abre `/mail`

En el bloque de `Correo entrante` debes ver:

- proveedor `IMAP`
- buzón detectado
- estado `Configurado`

### 5. Lanza una sincronización manual

Pulsa `Sincronizar inbox ahora`.

Si todo va bien:

- verás un mensaje de éxito
- se rellenará la bandeja inferior
- aparecerá una entrada en el historial de sincronizaciones

## Ejemplo con Office 365

```env
INBOUND_MAIL_PROVIDER=imap
IMAP_HOST=outlook.office365.com
IMAP_PORT=993
IMAP_SECURE=true
IMAP_USERNAME=facturacion@tudominio.es
IMAP_PASSWORD=tu-password-o-app-password
IMAP_MAILBOX=INBOX
IMAP_SYNC_UNSEEN_ONLY=true
IMAP_SYNC_MAX_MESSAGES=25
```

## Ejemplo con Gmail

```env
INBOUND_MAIL_PROVIDER=imap
IMAP_HOST=imap.gmail.com
IMAP_PORT=993
IMAP_SECURE=true
IMAP_USERNAME=tucuenta@gmail.com
IMAP_PASSWORD=tu-app-password
IMAP_MAILBOX=INBOX
IMAP_SYNC_UNSEEN_ONLY=true
IMAP_SYNC_MAX_MESSAGES=25
```

## Cómo funciona la primera entrega

El flujo actual es deliberadamente prudente:

1. FacturaIA se conecta por IMAP.
2. Abre el buzón configurado.
3. Busca mensajes según tu política (`unseen only` o no).
4. Descarga un número limitado de correos.
5. Los parsea localmente.
6. Los guarda en tablas internas.
7. Los muestra en `/mail`.

No intenta modificar tu buzón remoto ni mover mensajes entre carpetas.

## Limitaciones actuales

- el hilo se agrupa por remitente, no por asunto real de conversación
- la sincronización es manual, no programada
- no hay respuestas salientes desde la bandeja
- no hay enlaces automáticos aún con clientes, facturas o propuestas

## Recomendaciones prácticas

- usa una cuenta específica o compartida para el negocio
- si trabajas con Gmail u Office 365, usa app password cuando sea posible
- empieza con `IMAP_SYNC_UNSEEN_ONLY=true`
- mantén `IMAP_SYNC_MAX_MESSAGES` bajo en la primera prueba

## Resolución de problemas

### La pantalla indica que faltan variables IMAP

Revisa:

- `INBOUND_MAIL_PROVIDER`
- `IMAP_HOST`
- `IMAP_PORT`
- `IMAP_SECURE`
- `IMAP_USERNAME`
- `IMAP_PASSWORD`
- `IMAP_MAILBOX`

### La sincronización falla con error de autenticación

Suele indicar:

- usuario incorrecto
- contraseña incorrecta
- app password obligatoria y no configurada
- IMAP desactivado en el proveedor

### Se conecta, pero no importa correos

Revisa:

- si el buzón elegido es el correcto
- si hay mensajes no vistos cuando `IMAP_SYNC_UNSEEN_ONLY=true`
- si el límite `IMAP_SYNC_MAX_MESSAGES` es demasiado bajo

### Veo menos hilos de los esperados

La primera entrega agrupa por remitente. Si varios mensajes vienen del mismo email, irán al mismo hilo.

## Rutas relacionadas

- `/mail`
- `/modules`
- `/system`
- `/backups`
