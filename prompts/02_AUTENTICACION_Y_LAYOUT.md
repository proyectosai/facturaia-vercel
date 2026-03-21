# Prompt 02 · Autenticación Y Layout Protegido

## Prompt

Quiero que implementes la autenticación base de FacturaIA con dos caminos:

- modo local privado con email y contraseña
- compatibilidad opcional con Supabase para despliegues remotos

### Objetivo

La aplicación debe poder funcionar para el núcleo sin Supabase, pero no cerrar la puerta a despliegues remotos.

### Implementa

- `middleware.ts`
- `lib/auth.ts`
- `lib/actions/auth.ts`
- sesión local firmada
- login y logout
- bootstrap del primer usuario en modo local
- `requireUser()` y helpers similares
- control de acceso a rutas protegidas

### Requisitos

- variables de entorno claras para:
  - `FACTURAIA_LOCAL_MODE`
  - `FACTURAIA_LOCAL_BOOTSTRAP`
  - `FACTURAIA_LOCAL_SESSION_SECRET`
  - `FACTURAIA_DATA_DIR`
- copy visible cuando el sistema está en modo local
- sin dependencia accidental de Supabase en el flujo local

### No hagas

- no uses magic link como única vía
- no obligues a configurar correo para entrar en local
- no ocultes errores de entorno detrás de 500 genéricos

### Criterios de aceptación

- con `FACTURAIA_LOCAL_MODE=1`, el login funciona sin Supabase
- el bootstrap crea el primer usuario local
- `/dashboard` redirige a `/login` si no hay sesión
- `logout` destruye la sesión
- `lint` y `typecheck` verdes
