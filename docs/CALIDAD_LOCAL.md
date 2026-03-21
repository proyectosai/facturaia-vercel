# Calidad Local

Este documento fija el estándar mínimo para que FacturaIA sea usable como producto **local, privado y estable** para autónomos y pequeños despachos.

## Objetivo

La prioridad no es añadir más módulos sin control. La prioridad es que un autónomo pueda:

- instalar FacturaIA en su ordenador o servidor privado
- entrar sin depender de terceros
- emitir facturas y documentos sin miedo a perder datos
- exportar y restaurar copias de seguridad
- usar los flujos principales sin errores ambiguos

## Gates de calidad

Antes de dar por buena una iteración del modo local, deben pasar estos gates:

1. `npm run lint`
2. `npm run typecheck`
3. `npm test`
4. `npm run test:massive-local`
5. `npm run test:smoke`
6. prueba manual segmentada sobre:
   - login local
   - perfil fiscal
   - alta de cliente
   - gasto
   - presupuesto
   - solicitud de firma
   - aceptación pública
   - conversión a factura
   - export de backup
7. prueba de desastre:
   - exportar
   - validar la copia en `dry-run`
   - restaurar en instalación vacía
   - reexportar
   - comparar contenido
   - validar continuidad de numeración

En el repositorio, `lint`, `typecheck`, `npm test`, `test:massive-local`, build demo y smoke tests ya se ejecutan en CI sobre `Linux`, `macOS` y `Windows`. El e2e largo sigue siendo una capa adicional de endurecimiento y todavía no sustituye a los gates segmentados.

## Qué debe quedar cubierto por tests

### Núcleo local

- persistencia en fichero local
- numeración de facturas
- numeración separada de presupuestos y albaranes
- restauración de datos y recalculo de contadores
- estados de cobro
- recordatorios
- ciclo de firma documental

### Seguridad operativa

- redirects no atrapados como errores falsos
- validación de uploads
- errores legibles en modo local
- acceso protegido a export y restore
- cifrado opcional reproducible del núcleo local y de los backups cuando esté activado
- expiración real del token local
- bloqueo temporal tras intentos fallidos
- auditoría persistente de login, logout y restore
- manifest y checksum válidos en el backup
- restauración rechazada si la copia ha sido manipulada

### UX operativa

- no mostrar éxito cuando no se ha guardado nada
- no mostrar error cuando el dato sí se ha guardado
- no generar enlaces públicos con host o puerto antiguos
- no depender de Supabase en pantallas declaradas como locales

## Estado mínimo exigible para “uso diario”

Para considerar un módulo apto para uso diario local debe cumplir:

- persistencia local real
- carga sin variables de Supabase
- exportación en backup
- restauración válida
- al menos una prueba unitaria o de integración
- al menos una prueba manual reproducible

## Estado actual que perseguimos

### Listo para endurecer ya

- perfil fiscal
- facturación base
- facturas públicas y PDF
- cobros
- presupuestos y albaranes
- firma documental básica
- backups locales

### Todavía en consolidación

- CRM ligero
- gastos OCR
- correo entrante
- banca
- mensajería
- Facturae / VeriFactu

## Estrategia de QA recomendada

No depender de un único e2e largo.

Usar tres capas:

1. **tests unitarios**
   - lógica del núcleo local
   - snapshots fiscales
   - seguridad y parsing

2. **smoke de rutas**
   - comprobar que las pantallas cargan en `next start`

3. **flujos segmentados**
   - login local
   - perfil fiscal
   - nueva factura
   - cobro
   - alta de cliente
   - gasto
   - presupuesto
   - firma
   - conversión
   - backup

4. **suite masiva local**
   - lotes de facturas
   - mezcla de clientes, gastos y documentos
   - restore en instalación limpia
   - continuidad de numeración

## Criterio de producto

Si hay conflicto entre:

- añadir una función nueva
- o hacer más sólido un flujo local ya existente

la prioridad es la segunda.

FacturaIA debe madurar como herramienta **usable en local** antes de ampliar más superficie.

## Ejecución recomendada

Para validar una iteración seria del modo local:

1. `npm run test:massive-local`
2. `npm run test:smoke`

Además, queda preparado un harness de navegador en `npm run test:e2e:local` para endurecer el flujo local crítico sobre SQLite temporal. Recorre login, perfil, nueva factura, cobros, backup export y un barrido de rutas protegidas, pero todavía no forma parte del gate principal.
