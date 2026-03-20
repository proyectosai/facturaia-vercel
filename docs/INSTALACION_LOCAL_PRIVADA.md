# Instalación local privada

> Si buscas instrucciones literales por sistema operativo, usa primero estas guías:
>
> - [Windows](./INSTALACION_WINDOWS.md)
> - [macOS](./INSTALACION_MACOS.md)
> - [Linux](./INSTALACION_LINUX.md)

## Objetivo

Este modo está pensado para clientes que quieren ejecutar FacturaIA en su propio ordenador o en un servidor suyo, sin depender de enlaces mágicos ni de correo para iniciar sesión.

## Qué resuelve esta fase

- acceso por email y contraseña dentro de la instalación privada
- alta inicial del primer usuario local
- almacenamiento local del núcleo en el propio equipo
- continuidad con el resto del proyecto sin romper compatibilidad

## Qué no resuelve todavía

Todavía no sustituye por completo todos los módulos avanzados.

Hoy el modo local privado:

- elimina la dependencia del correo para entrar
- guarda el núcleo en un fichero local JSON dentro del equipo
- cubre perfil, facturas, PDF, factura pública, cobros y recordatorios
- deja todavía fuera de ese núcleo local completo a piezas como IMAP, banca, CRM, firma, OCR o mensajería
- permite cifrado opcional del fichero local y de los backups, si decides activarlo

## Variables mínimas

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
FACTURAIA_LOCAL_MODE=1
FACTURAIA_LOCAL_BOOTSTRAP=1
FACTURAIA_LOCAL_SESSION_SECRET=pon-aqui-un-secreto-largo
FACTURAIA_DATA_DIR=.facturaia-local
FACTURAIA_ENCRYPT_LOCAL_DATA=0
FACTURAIA_ENCRYPT_BACKUPS=0
FACTURAIA_ENCRYPTION_PASSPHRASE=
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

## Cifrado opcional

Si quieres que el fichero local y los backups salgan cifrados, activa:

```env
FACTURAIA_ENCRYPT_LOCAL_DATA=1
FACTURAIA_ENCRYPT_BACKUPS=1
FACTURAIA_ENCRYPTION_PASSPHRASE=una-passphrase-larga-y-unica
```

Notas importantes:

- no se activa por defecto
- si no defines la passphrase, FacturaIA seguirá funcionando en plano
- los backups JSON antiguos sin cifrar siguen restaurando
- si pierdes la passphrase, no podrás descifrar el núcleo local ni los backups cifrados

## Recomendación práctica

Para clientes no técnicos, la evolución correcta del proyecto es empaquetar:

- app
- almacenamiento local
- copia de seguridad

en una receta de instalación cada vez más cerrada y reproducible.

## Siguiente objetivo técnico

Los siguientes bloques importantes son:

- ampliar el mismo patrón local a gastos, clientes y presupuestos
- empaquetar una instalación aún más simple con Docker o instalador
- endurecer backups automáticos sobre `FACTURAIA_DATA_DIR`
