# Feedback y pilotos

Este documento describe la bandeja interna de feedback incorporada en FacturaIA.

## Objetivo

Convertir observaciones reales en backlog accionable sin depender de herramientas externas.

Sirve para:

- uso interno del propio autónomo o estudio
- pruebas con pilotos
- recopilar incidencias por módulo
- priorizar mejoras antes de tocar código

## Qué cubre ahora

- pantalla protegida en `/feedback`
- formulario para alta de nuevas entradas
- distinción entre origen `self` y `pilot`
- severidad `low`, `medium`, `high`
- estados `open`, `reviewed`, `planned`, `resolved`
- inclusión en backups y restore

## Instalación

1. aplica la migración `202603202120_add_feedback_entries.sql`
2. reinicia la aplicación
3. abre `/feedback`

## Flujo recomendado

1. registra cada observación con un título corto y un mensaje claro
2. usa `module_key` para agrupar por área como `cobros`, `facturae`, `ocr`, `onboarding`
3. marca `pilot` cuando venga de un usuario real en pruebas
4. pasa a `reviewed` cuando ya esté entendida
5. mueve a `planned` cuando entre en roadmap
6. cierra como `resolved` cuando el cambio ya esté desplegado

## Buenas prácticas

- no mezclar varias incidencias distintas en una sola entrada
- indicar contexto, pasos y fricción real observada
- guardar email del reportero si quieres poder volver a preguntarle
- revisar `/feedback` junto con `/system`, `/modules` y `/backups`

## Limitaciones actuales

- no hay etiquetas múltiples ni comentarios por entrada
- no hay exportación CSV específica del feedback
- no hay vínculo automático con issues de GitHub
- no hay notificaciones automáticas

## Archivos clave

- `app/(protected)/feedback/page.tsx`
- `lib/feedback.ts`
- `lib/actions/feedback.ts`
- `lib/backups.ts`
- `app/api/backups/restore/route.ts`
