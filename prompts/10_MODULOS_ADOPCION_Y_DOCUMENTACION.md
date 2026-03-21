# Prompt 10 · Módulos, Adopción Y Documentación Honesta

## Prompt

Quiero que el repo y la app expliquen con honestidad qué está listo, qué va por piloto y qué no debe activarse todavía.

### Implementa

- catálogo de módulos
- estado por módulo
- guía de adopción para clientes
- estado real del producto
- instalación por sistema operativo
- documentación de arquitectura

### Archivos esperados

- `lib/modules.ts`
- `app/(protected)/modules/page.tsx`
- `docs/ADOPCION_CLIENTES.md`
- `docs/ESTADO_REAL.md`
- `docs/ARQUITECTURA.md`
- `docs/INSTALACION_WINDOWS.md`
- `docs/INSTALACION_MACOS.md`
- `docs/INSTALACION_LINUX.md`

### Reglas

- no confundas “existe en el árbol” con “recomendado para producción”
- deja visible:
  - usar ya
  - usar con piloto
  - no activar todavía
- evita tono de marketing

### Criterios de aceptación

- un lector nuevo entiende el estado real del proyecto en menos de 5 minutos
- la documentación no exagera la parte IA ni la fiscal
