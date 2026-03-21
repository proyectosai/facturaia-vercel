# Prompt 04 · Perfil Fiscal Y Facturación

## Prompt

Quiero que construyas el flujo base de valor de FacturaIA:

- perfil fiscal del emisor
- creación de factura
- cálculo de IVA e IRPF
- numeración automática
- listado de facturas

### Implementa

- `app/(protected)/profile/page.tsx`
- `app/(protected)/dashboard/page.tsx`
- `app/(protected)/new-invoice/page.tsx`
- `app/(protected)/invoices/page.tsx`
- `components/invoices/invoice-form.tsx`
- `lib/actions/invoices.ts`
- `lib/invoice-math.ts`
- modelos de factura y líneas

### Requisitos de negocio

- soporta IVA e IRPF españoles
- total claro y reproducible
- numeración secuencial
- cliente, concepto, líneas, vencimiento y notas
- copy en español y orientado a autónomos

### Requisitos UX

- guardar perfil y factura sin ambigüedad
- no mostrar falsos errores tipo `NEXT_REDIRECT`
- formularios razonables en desktop y móvil

### Criterios de aceptación

- se puede crear una factura real en local
- aparece en historial
- los cálculos son consistentes
- la numeración sigue tras reinicio
- tests básicos de cálculo y persistencia verdes
