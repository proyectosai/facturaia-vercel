# Changelog

Todos los cambios relevantes de FacturaIA se documentarán aquí.

El formato está inspirado en Keep a Changelog y el versionado irá madurando conforme avance el proyecto.

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
