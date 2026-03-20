# Asistente IRPF / Renta

## Objetivo

Ayudar a un profesional fiscal o despacho pequeño a preparar expedientes de renta en España con una combinación de:

- checklist de documentación
- detección de huecos o riesgos
- siguiente paso práctico
- referencias oficiales de AEAT
- asistencia opcional con IA local

## Qué hace ahora

- pantalla `/renta`
- chat de trabajo con contexto del cliente y del ejercicio
- modo guiado incluso sin IA local
- respuestas más completas si LM Studio está configurado
- checklist de documentación
- bloque de fuentes oficiales

## Qué no hace todavía

- no confecciona ni presenta automáticamente la renta
- no valida el expediente frente a AEAT
- no guarda un histórico estructurado de cada conversación
- no sustituye criterio fiscal profesional
- no debe venderse como asesor fiscal automático

## Instalación mínima

Sin IA local:

- entra en `/renta`
- usa el módulo en modo guiado con checklist y fuentes oficiales

Con IA local:

```env
LM_STUDIO_BASE_URL=http://tu-host-local:1234/v1
LM_STUDIO_MODEL=openai/gpt-oss-20b
LM_STUDIO_API_KEY=
```

## Uso recomendado

1. Describe el perfil del cliente.
2. Indica el ejercicio.
3. Lista la documentación que ya tienes.
4. Pide checklist, riesgos o datos pendientes.
5. Contrasta siempre el resultado en AEAT y Renta WEB antes de presentar.

## Fuentes oficiales sugeridas

- Campaña de Renta AEAT
- Gestiones IRPF
- Renta WEB
- Renta WEB Open
- Manual práctico del ejercicio

## Estado real

Es un módulo de apoyo profesional en piloto.

Sirve para ordenar trabajo y acelerar revisión previa, pero no para delegar decisiones fiscales delicadas ni para cerrar declaraciones sin comprobación externa.
