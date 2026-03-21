# Prompt 11 · QA, CI Y End-To-End

## Prompt

Quiero que cierres FacturaIA como proyecto serio, no solo como demo que “parece funcionar”.

### Implementa

- `lint`
- `typecheck`
- tests unitarios
- suite local más dura
- smoke tests
- e2e real de navegador
- CI en Linux, macOS y Windows

### Requisitos

- el e2e debe cubrir:
  - login local
  - crear factura
  - marcar cobro
  - exportar backup
  - barrido de rutas críticas
- añade artefactos cuando falle
- deja clara la diferencia entre `core` y `mobile`

### Criterios de aceptación

- existe una pipeline útil, no decorativa
- un rojo en CI es accionable
- las instalaciones locales no rompen en silencio
