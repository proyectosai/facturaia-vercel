# Prompt 00 · Principios Del Proyecto

## Uso

Lee este archivo antes de usar cualquier prompt de esta carpeta.

## Prompt

Quiero que construyas una aplicación llamada **FacturaIA** para autónomos y pequeños negocios españoles. La app debe ser:

- `local-first`
- en `español`
- pensada para instalación privada en ordenador propio o servidor pequeño
- honesta con su grado de madurez
- útil primero para facturas, PDF, cobros, correo saliente y backups

### Stack obligatorio

- Next.js 15 con App Router
- React 19
- TypeScript
- Tailwind CSS
- Server Components por defecto
- Server Actions para mutaciones críticas
- SQLite para modo local
- Supabase solo como vía opcional para despliegues remotos, no como dependencia obligatoria del núcleo

### Principios de producto

- No prometas más de lo que realmente está implementado.
- Prioriza una instalación local prudente y estable.
- No conviertas módulos experimentales en piezas críticas del primer día.
- La UI debe servir a autónomos reales, no a demos vacías.
- Si algo es piloto o experimental, dilo de forma visible.

### Principios de ingeniería

- Separa lo crítico del núcleo de los módulos opcionales.
- Da prioridad a persistencia local, backup/restore y auditoría antes que a nuevas features vistosas.
- Usa nombres de variables y copy en español cuando afecten al usuario final.
- Documenta siempre:
  - qué está terminado
  - qué está en piloto
  - qué está solo propuesto

### No hagas esto

- No vendas VeriFactu como resuelto si no lo está.
- No vendas RAG o memoria multi-año como producto entregado si todavía es arquitectura.
- No construyas una app pensada para cloud como si luego fuese trivial convertirla a local.
- No priorices módulos bonitos sobre backup/restore, auth local y facturación.

### Criterios de aceptación globales

- La app debe arrancar en local sin depender de servicios externos para el núcleo.
- Debe existir una ruta clara de adopción:
  - usar ya
  - usar con piloto
  - no activar todavía
- Debe ser comprensible para alguien que quiera estudiar el repo con fines educativos.
