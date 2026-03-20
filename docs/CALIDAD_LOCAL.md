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
   - alta cliente
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
