# Prompts De Agentes

Esta carpeta contiene prompts más especializados que los prompts secuenciales de `/prompts`.

Úsalos cuando quieras atacar una dimensión concreta del proyecto sin mezclarlo todo a la vez.

## Agentes disponibles

- [ARQUITECTO.md](/Users/c/Desktop/carpeta%20sin%20ti%CC%81tulo%202/facturaia-app/prompts/agents/ARQUITECTO.md)
- [FRONTEND.md](/Users/c/Desktop/carpeta%20sin%20ti%CC%81tulo%202/facturaia-app/prompts/agents/FRONTEND.md)
- [QA.md](/Users/c/Desktop/carpeta%20sin%20ti%CC%81tulo%202/facturaia-app/prompts/agents/QA.md)
- [LOCAL_FIRST.md](/Users/c/Desktop/carpeta%20sin%20ti%CC%81tulo%202/facturaia-app/prompts/agents/LOCAL_FIRST.md)
- [FISCAL.md](/Users/c/Desktop/carpeta%20sin%20ti%CC%81tulo%202/facturaia-app/prompts/agents/FISCAL.md)

## Cuándo usar cada uno

- `ARQUITECTO`: cuando el problema es estructura, capas, persistencia o deuda técnica.
- `FRONTEND`: cuando el problema es UX, responsive, copy o jerarquía visual.
- `QA`: cuando quieres endurecer tests, CI, trazas y reproducibilidad.
- `LOCAL_FIRST`: cuando el foco es instalación privada, SQLite, backups, auth local y cero terceros.
- `FISCAL`: cuando el foco es facturación española, IRPF, IVA, Facturae o prudencia de cumplimiento.

## Regla de uso

No dejes que un solo agente “quiera hacerlo todo”.

La forma correcta de trabajar con FacturaIA es:

1. elegir el frente principal
2. usar un prompt especializado
3. cerrar esa fase con documentación honesta
4. pasar a la siguiente
