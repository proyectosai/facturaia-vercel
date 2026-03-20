# Instalación y configuración

> Si quieres el camino más simple, empieza por [la guía en 15 minutos](./GUIA_15_MINUTOS.md). Si ya sabes en qué sistema vas a instalar FacturaIA, usa directamente la guía de tu sistema operativo.

## Guías por sistema operativo

- [Instalación en Windows](./INSTALACION_WINDOWS.md)
- [Instalación en macOS](./INSTALACION_MACOS.md)
- [Instalación en Linux](./INSTALACION_LINUX.md)

## Qué instalación elegir

### Demo rápida

Úsala si solo quieres ver la interfaz:

- no necesita Supabase
- no necesita correo
- no necesita LM Studio
- no modifica datos reales

### Instalación local privada

Úsala si quieres trabajar en tu propio ordenador con acceso local por email y contraseña:

- es la opción recomendada para autónomos y pequeños despachos
- evita Supabase en el núcleo
- guarda los datos principales en tu propio equipo
- prioriza simplicidad y privacidad

### Instalación completa

Úsala si quieres también la arquitectura completa con Supabase y todos los módulos que todavía dependen de ella.

## Requisitos generales

- `Docker Desktop` o `Docker + docker compose` si quieres la vía más fácil
- o `Node.js 20 LTS` + `npm` si prefieres arrancar la app directamente
- `LM Studio` solo si vas a usar IA local
- `SMTP` o `Resend` solo si vas a usar correo saliente

## Variables mínimas para instalación local privada

Estas son las variables mínimas para arrancar FacturaIA en modo local privado:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
FACTURAIA_DEMO_MODE=0
FACTURAIA_LOCAL_MODE=1
FACTURAIA_LOCAL_BOOTSTRAP=1
FACTURAIA_LOCAL_SESSION_SECRET=pon-aqui-un-secreto-largo-y-unico
FACTURAIA_DATA_DIR=.facturaia-local
```

Notas:

- `FACTURAIA_LOCAL_BOOTSTRAP=1` solo se usa en el primer arranque
- después de crear la primera cuenta local, cambia ese valor a `0` y reinicia la app
- si quieres más control, usa una ruta absoluta en `FACTURAIA_DATA_DIR`

## Variables para instalación completa con Supabase

Si vas a usar también Supabase, añade:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Correo saliente opcional

### SMTP

```env
MAIL_PROVIDER=smtp
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_FROM_EMAIL=
```

### Resend

```env
MAIL_PROVIDER=resend
RESEND_API_KEY=
RESEND_FROM_EMAIL=
```

## IA local opcional con LM Studio

Ejemplo de configuración:

```env
LM_STUDIO_BASE_URL=http://127.0.0.1:1234/v1
LM_STUDIO_MODEL=openai/gpt-oss-20b
```

Actívala después de validar que el núcleo de facturación ya funciona bien.

## Validación recomendada

Antes de usar FacturaIA con datos reales:

```bash
npm run doctor
npm run test:local-core
npm run test:quality
```

## Backups y restauración

La pantalla `/backups` permite:

- exportar un JSON del usuario actual
- restaurar ese JSON en modo reemplazo

Además:

- guarda también la carpeta indicada en `FACTURAIA_DATA_DIR`
- prueba una restauración antes de meter datos importantes

## Instalación completa con Supabase

Si vas a usar Supabase:

### Autenticación

- activa login por email / magic link
- define `Site URL` con tu dominio o `http://localhost:3000`
- añade `http://localhost:3000/auth/callback` como callback local

### Migraciones

Ejecuta las migraciones de `supabase/migrations/` en orden numérico.

Incluyen:

- tablas principales
- políticas RLS
- secuencia de numeración
- mensajería
- correo entrante
- presupuestos y albaranes
- gastos
- CRM
- firma documental
- conciliación bancaria
- backups remotos

## Documentación relacionada

- [Guía en 15 minutos](./GUIA_15_MINUTOS.md)
- [Instalación local privada](./INSTALACION_LOCAL_PRIVADA.md)
- [Estado real del proyecto](./ESTADO_REAL.md)
- [Calidad del modo local](./CALIDAD_LOCAL.md)
