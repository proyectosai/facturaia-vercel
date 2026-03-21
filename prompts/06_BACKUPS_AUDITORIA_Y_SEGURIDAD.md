# Prompt 06 · Backups, Auditoría Y Seguridad Local

## Prompt

Quiero que conviertas FacturaIA en una instalación local prudente, no solo funcional.

### Implementa

- `app/(protected)/backups/page.tsx`
- `app/api/backups/export/route.ts`
- `app/api/backups/restore/route.ts`
- manifest de backup
- checksum
- dry-run de restore
- validación post-restore
- `app/(protected)/auditoria/page.tsx`
- export JSON de auditoría
- lockout de login
- expiración de sesión local

### Auditoría mínima

Registra:

- bootstrap
- login correcto
- login fallido
- logout
- creación de factura
- cambio de estado de cobro
- restore

### Seguridad mínima

- fail-closed en producción si falta secreto crítico
- soporte de cifrado opcional documentado
- no ocultes errores de configuración

### Criterios de aceptación

- export y restore funcionan en local
- el restore tiene validación visible
- existe un log operativo exportable
- login local no es ilimitado
