# Prompt 09 · IA Documental Y Asistente De Renta

## Prompt

Quiero que añadas IA local útil y honesta, sin vender humo.

### Implementa

- integración con LM Studio por HTTP
- mejora de textos y documentos
- estudio documental local con citas
- apoyo IRPF / Renta con checklist y fuentes oficiales

### Archivos esperados

- `lib/ai.ts`
- `app/api/ai/generate/route.ts`
- `app/api/ai/documents/route.ts`
- `app/(protected)/documents-ai/page.tsx`
- `app/(protected)/estudio-ia/page.tsx`
- `app/(protected)/renta/page.tsx`
- componentes asociados

### Reglas de honestidad

- si no hay LM Studio, ofrece fallback razonable
- no llames “RAG completo” a una recuperación simple por fragmentos
- no llames “memoria multi-año” a una pieza todavía no implementada
- cita fuentes si hablas de renta o fiscalidad

### Criterios de aceptación

- la app puede consultar LM Studio local
- el estudio documental responde con citas
- el módulo de renta ayuda, pero no se presenta como cumplimiento cerrado
