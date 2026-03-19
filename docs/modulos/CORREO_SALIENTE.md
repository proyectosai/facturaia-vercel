# Módulo: correo saliente

## Estado actual

El módulo de correo saliente ya está operativo y forma parte del núcleo usable de FacturaIA.

Qué permite hoy:

- enviar facturas desde `/invoices`
- enviar correos de prueba desde `/mail`
- elegir entre **SMTP** o **Resend**
- comprobar el remitente y el proveedor detectado desde la propia app

## Recomendación general

Si la instalación es realmente privada o self-hosted, la mejor opción suele ser **SMTP**.

Usa `Resend` si:

- prefieres una integración más simple
- ya tienes dominio verificado allí
- quieres evitar gestionar credenciales SMTP

Usa `SMTP` si:

- quieres control total
- ya tienes buzón corporativo o relay propio
- no quieres depender de un proveedor transaccional externo

## Variables de entorno

### Opción 1: SMTP

```env
MAIL_PROVIDER=smtp
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_FROM_EMAIL=
```

### Opción 2: Resend

```env
MAIL_PROVIDER=resend
RESEND_API_KEY=
RESEND_FROM_EMAIL=
```

## Significado de cada variable SMTP

- `MAIL_PROVIDER`
  - debe ser `smtp`

- `SMTP_HOST`
  - servidor SMTP
  - ejemplo: `smtp.office365.com`, `smtp.gmail.com`, `mail.tudominio.com`

- `SMTP_PORT`
  - puerto del servidor
  - `587` para STARTTLS suele ser lo habitual
  - `465` para SSL directo

- `SMTP_SECURE`
  - `true` o `false`
  - normalmente `false` en `587`
  - normalmente `true` en `465`

- `SMTP_USERNAME`
  - usuario SMTP

- `SMTP_PASSWORD`
  - contraseña o app password del buzón

- `SMTP_FROM_EMAIL`
  - remitente visible
  - ejemplo:
    - `Estudio Rivera <facturacion@riveraconsultoria.es>`

## Significado de las variables Resend

- `MAIL_PROVIDER=resend`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

`RESEND_FROM_EMAIL` debe pertenecer a un remitente o dominio verificado en Resend.

## Instalación paso a paso

### 1. Elige proveedor

Decide si usarás:

- SMTP
- Resend

### 2. Añade variables

Configura el bloque correspondiente en `.env.local` o en tu panel de despliegue.

### 3. Reinicia FacturaIA

Después de cambiar variables de entorno, reinicia la app.

### 4. Abre `/mail`

La pantalla debe mostrar:

- proveedor detectado
- remitente activo
- estado `Configurado`

### 5. Envía una prueba

Usa el formulario de prueba de `/mail` y envía un mensaje a tu propio email.

### 6. Verifica el envío de facturas

Abre `/invoices` y prueba `Enviar por email` sobre una factura real.

## Ejemplos de configuración

### SMTP con Office 365

```env
MAIL_PROVIDER=smtp
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USERNAME=facturacion@tudominio.es
SMTP_PASSWORD=tu-password-o-app-password
SMTP_FROM_EMAIL=FacturaIA <facturacion@tudominio.es>
```

### SMTP con servidor propio

```env
MAIL_PROVIDER=smtp
SMTP_HOST=mail.tudominio.es
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USERNAME=facturacion@tudominio.es
SMTP_PASSWORD=tu-password
SMTP_FROM_EMAIL=FacturaIA <facturacion@tudominio.es>
```

### Resend

```env
MAIL_PROVIDER=resend
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=FacturaIA <facturacion@tudominio.es>
```

## Rutas relacionadas

- `/mail`
- `/invoices`
- `/system`
- `/modules`

## Qué usa exactamente este módulo

El mismo proveedor de correo se reutiliza en:

- correos de prueba desde `/mail`
- envío de facturas desde `/invoices`

Eso evita que una parte de la app funcione por un proveedor y otra por otro distinto.

## Resolución de problemas

### La app dice que el correo no está configurado

Revisa:

- `MAIL_PROVIDER`
- variables completas del proveedor elegido
- reinicio de la aplicación después del cambio

### SMTP responde pero no entrega

Revisa:

- puerto correcto
- `SMTP_SECURE`
- usuario y contraseña
- restricciones del servidor saliente
- SPF / DKIM / DMARC del dominio si aplica

### Resend devuelve error de remitente

Revisa:

- dominio verificado
- remitente permitido
- valor de `RESEND_FROM_EMAIL`

### El envío de facturas falla y la prueba también

Eso indica que el problema está en el módulo de correo, no en la factura concreta.

Empieza por `/mail` y valida el canal antes de volver a `/invoices`.

## Próxima evolución

El siguiente paso previsto no es rehacer este módulo, sino añadir **correo entrante** para unificar bandeja de entrada, cliente y seguimiento dentro de FacturaIA.
