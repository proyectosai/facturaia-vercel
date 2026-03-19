# Guía de contribución

Gracias por interesarte en contribuir a FacturaIA.

Antes de participar, revisa también:

- [Código de conducta](./CODE_OF_CONDUCT.md)
- [Política de seguridad](./SECURITY.md)

La idea del proyecto es doble:

- construir una herramienta útil para autónomos españoles
- enseñar, en abierto, cómo se puede crear un producto real paso a paso

Por eso conviene que las contribuciones sean claras, pequeñas y fáciles de revisar.

## Antes de empezar

1. Lee el [README](./README.md).
2. Revisa la documentación de [`docs`](./docs).
3. Comprueba si ya existe un issue o una discusión relacionada.
4. Si el cambio es grande, abre antes una propuesta corta para alinear enfoque.

## Qué tipo de contribuciones encajan mejor

- mejoras de UX y UI
- correcciones de errores
- mejoras de rendimiento
- refactorizaciones con beneficio claro
- documentación
- mejoras de accesibilidad
- integraciones útiles para el flujo de facturación o documentos

## Qué conviene evitar sin hablarlo antes

- cambios masivos de arquitectura
- cambios de naming en todo el proyecto sin necesidad real
- reescrituras completas de módulos estables
- cambios legales o fiscales sin fuente oficial contrastable

## Estilo de trabajo

- Mantén los cambios lo más acotados posible.
- Prioriza claridad sobre complejidad.
- Si cambias comportamiento, explica el motivo.
- Si tocas copy en la interfaz, mantenlo en español correcto.
- Si añades referencias legales o fiscales, usa fuentes oficiales.

## Preparación local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Modo demo:

```bash
FACTURAIA_DEMO_MODE=1 npm run dev
```

## Validaciones mínimas

Antes de abrir una contribución, ejecuta:

```bash
npm run typecheck
npm run lint
FACTURAIA_DEMO_MODE=1 npm run build
```

## Convenciones recomendadas

### Commits

Se agradecen mensajes claros, por ejemplo:

- `feat: mejora la cabina documental`
- `fix: corrige el cálculo de IVA en vista previa`
- `docs: añade guía de despliegue`

### Pull requests

Incluye:

- qué cambia
- por qué cambia
- impacto funcional
- capturas si afecta a UI
- notas de configuración si aplica
- validaciones ejecutadas

## Áreas sensibles del proyecto

Ten especial cuidado en:

- `lib/billing.ts`
- `lib/actions/invoices.ts`
- `lib/ai-document-export.tsx`
- migraciones de `supabase/migrations`

Son zonas donde un cambio pequeño puede afectar a persistencia, métricas internas o exportación documental.

## Documentación y ejemplos

Si añades una funcionalidad nueva, intenta actualizar también:

- `README.md`
- `docs/INSTALACION.md`
- `docs/ARQUITECTURA.md`
- `docs/DESPLIEGUE.md`
- `CHANGELOG.md`

## Filosofía del proyecto

FacturaIA no pretende ser solo una app.

También quiere ser una base de aprendizaje para quienes quieran observar:

- cómo se estructura una app self-hosted moderna
- cómo se integra IA local en un producto real
- cómo se cuida la UX en un panel de trabajo
- cómo se conecta facturación, documentos, mensajería y backend

Si tu contribución ayuda en esa dirección, encaja bien.
