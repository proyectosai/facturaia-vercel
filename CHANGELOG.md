# Changelog

Todos los cambios relevantes de FacturaIA se documentarán aquí.

El formato está inspirado en Keep a Changelog y el versionado irá madurando conforme avance el proyecto.

## [0.1.1] - 2026-03-20

### Añadido

- Primera entrega real del módulo de backups remotos con WebDAV / Nextcloud.
- Nueva ruta `app/api/backups/push/route.ts` para enviar snapshots remotos manualmente.
- Historial de ejecuciones remotas en la pantalla `/backups`.
- Migración `202603201030_add_remote_backup_runs.sql`.
- Nuevo módulo de correo saliente con soporte SMTP o Resend.
- Nueva pantalla `/mail` para comprobar proveedor y enviar correos de prueba.
- Primera entrega del correo entrante con IMAP manual, bandeja interna e historial de sincronizaciones.
- Migración `202603201200_add_inbound_mail_module.sql`.

### Mejorado

- Catálogo `/modules` actualizado para reflejar el estado real del sistema modular.
- Pantalla `/system` con visibilidad sobre la configuración de backups remotos.
- Documentación de instalación y despliegue ampliada para usuarios self-hosted.
- Envío de facturas desacoplado de Resend como único proveedor.
- Los backups ahora incluyen también el inbox de correo y su historial de sincronización.

## [0.1.0] - 2026-03-19

### Añadido

- Base del proyecto con Next.js 15, TypeScript y Tailwind CSS.
- Dashboard protegido con autenticación vía Supabase.
- Gestión de perfil fiscal del emisor.
- Creación de facturas con IVA, IRPF, numeración automática y PDF profesional.
- Historial de facturas con descarga de PDF y envío por email.
- Página pública de factura con QR.
- Estudio documental con IA local vía LM Studio.
- Exportación documental a PDF y Word.
- Módulo opcional de mensajería unificada para WhatsApp Business y Telegram.
- Centro de backups con exportación y restauración JSON del usuario.
- Modo demo para revisar la interfaz sin servicios reales.
- Documentación inicial en español.

### Mejorado

- UX del dashboard, instalación privada, nueva factura, historial y documentos.
- Integración de legislación oficial BOE y AEAT dentro del flujo de facturación.
- Soporte para propuestas, presupuestos y contratos desde la cabina documental.
- Reorientación del proyecto a instalación privada sin monetización integrada.

### Documentación

- `README.md`
- `docs/INSTALACION.md`
- `docs/ARQUITECTURA.md`
- `docs/DESPLIEGUE.md`
- `CONTRIBUTING.md`
- `CODE_OF_CONDUCT.md`
- `SECURITY.md`
- plantillas de issues y pull requests
- workflow de CI para `lint`, `typecheck` y `demo:build`

### Notas

- El repositorio está preparado para publicarse como proyecto open source.
- La licencia asumida en esta primera versión es MIT.
