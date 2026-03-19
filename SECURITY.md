# Política de seguridad

Gracias por ayudar a mantener FacturaIA seguro.

## Versiones cubiertas

Por ahora, el proyecto se encuentra en una fase temprana y solo se da soporte activo a la rama principal:

| Versión | Soporte de seguridad |
| --- | --- |
| `main` | Sí |
| `0.1.x` | Sí, mientras coincida con `main` |
| Versiones antiguas o forks desactualizados | No |

## Cómo reportar una vulnerabilidad

No publiques detalles sensibles en un issue público.

Canales recomendados:

1. Usa la funcionalidad de reporte privado de vulnerabilidades de GitHub, si está habilitada en el repositorio.
2. Si no está disponible, abre un issue muy breve sin detalles explotables y explica únicamente que necesitas un canal privado para reportar un problema de seguridad.

## Qué incluir en el reporte

- componente afectado
- impacto esperado
- pasos para reproducirlo
- entorno o configuración implicada
- propuesta de mitigación, si la tienes

## Tiempos orientativos

- confirmación de recepción: en cuanto sea posible
- evaluación inicial: normalmente en pocos días
- parche o mitigación: dependerá de la gravedad y del alcance

## Alcance sensible en FacturaIA

Estas áreas merecen especial atención:

- autenticación con Supabase
- políticas RLS y migraciones
- webhooks de Stripe
- generación pública de PDFs y facturas
- subida de logos y acceso a Storage
- uso de IA local y endpoints internos

## Divulgación responsable

Se agradece no hacer pública una vulnerabilidad hasta que exista una mitigación razonable o una versión corregida.
