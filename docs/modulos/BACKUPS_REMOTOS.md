# Módulo siguiente: backups remotos

## Objetivo

Extender el sistema actual de backups locales para que una instalación privada pueda enviar sus copias de seguridad a un almacenamiento externo.

## Por qué es prioritario

La app ya permite exportar y restaurar JSON, pero una instalación self-hosted sigue necesitando una segunda ubicación fuera del equipo o VPS principal.

## Base ya implementada

- exportación JSON en `/backups`
- restauración en modo reemplazo
- resincronización de numeración de facturas

## Qué añadirá este módulo

- selección de proveedor remoto
- configuración segura de credenciales
- envío manual y programado de snapshots
- política de retención
- verificación del último backup remoto correcto

## Proveedores previstos

- S3 compatible
- WebDAV
- Dropbox
- Google Drive

## Requisitos técnicos

- sistema actual de backups funcionando
- cifrado del fichero antes de subirlo o canal seguro hacia el proveedor
- estrategia clara de retención y borrado

## Estado

Todavía no está implementado en código. Es el siguiente módulo del roadmap.
