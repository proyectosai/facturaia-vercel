# Instalación local privada

## Objetivo

Este modo está pensado para clientes que quieren ejecutar FacturaIA en su propio ordenador o en un servidor suyo, sin depender de enlaces mágicos ni de correo para iniciar sesión.

## Qué resuelve esta fase

- acceso por email y contraseña dentro de la instalación privada
- alta inicial del primer usuario local
- continuidad con el modelo actual de datos sin romper compatibilidad

## Qué no resuelve todavía

Todavía no sustituye por completo toda la capa central de persistencia.

Hoy el modo local privado:

- elimina la dependencia del correo para entrar
- sigue necesitando que el backend de datos corra dentro de la instalación del cliente

## Variables mínimas

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
FACTURAIA_LOCAL_MODE=1
FACTURAIA_LOCAL_BOOTSTRAP=1
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Primer arranque

1. Levanta la instalación privada del proyecto.
2. Configura `FACTURAIA_LOCAL_MODE=1`.
3. Deja `FACTURAIA_LOCAL_BOOTSTRAP=1` solo para el primer arranque.
4. Abre `/login`.
5. Introduce el email y la contraseña que quieras usar como cuenta local inicial.
6. Comprueba que ya puedes entrar al panel.
7. Cambia después:

```env
FACTURAIA_LOCAL_BOOTSTRAP=0
```

8. Reinicia la aplicación.

## Recomendación práctica

Para clientes no técnicos, la evolución correcta del proyecto es empaquetar:

- backend local
- app
- almacenamiento
- copia de seguridad

en una receta de instalación cada vez más cerrada y reproducible.

## Siguiente objetivo técnico

El siguiente bloque importante es reducir la dependencia estructural de `auth.users` y avanzar hacia una persistencia todavía más local.
