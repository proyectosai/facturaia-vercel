# Prompt 01 · Bootstrap Del Repo Y UI Base

## Prompt

Quiero que crees desde cero el esqueleto inicial de FacturaIA.

### Objetivo

Arranca un repositorio moderno y mantenible con:

- Next.js 15
- TypeScript
- Tailwind CSS
- estructura `app/`
- componentes UI reutilizables
- navegación inicial
- home pública, login y zona protegida

### Alcance

Implementa:

- `app/layout.tsx`
- `app/page.tsx`
- `app/login/page.tsx`
- `app/(protected)/layout.tsx`
- `components/ui/*` para `Button`, `Card`, `Badge`, `Input`, `Textarea`
- `components/app-sidebar.tsx`
- `components/providers.tsx`
- tema visual coherente, sobrio y útil

### Requisitos UX

- Español por defecto
- buena legibilidad
- diseño serio, no startup genérica
- navegación simple
- versión móvil responsive desde el principio

### Requisitos técnicos

- App Router
- alias `@/`
- lint y typecheck funcionando
- estructura preparada para crecer a módulos

### Entregables

- proyecto arrancable con `npm install` y `npm run dev`
- layout público y protegido
- sidebar base
- design tokens razonables
- README mínimo con instrucciones de arranque

### Criterios de aceptación

- `npm run lint` verde
- `npm run typecheck` verde
- la app abre `/`, `/login` y una ruta protegida placeholder
- la UI no se rompe en móvil
