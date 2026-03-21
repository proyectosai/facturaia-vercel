# Prompt 05 · PDF, Factura Pública Y Cobros

## Prompt

Quiero que completes el flujo de uso diario de FacturaIA con:

- PDF profesional
- página pública de factura
- seguimiento de cobro
- recordatorios

### Implementa

- `app/factura/[publicId]/page.tsx`
- `app/api/invoices/[invoiceId]/pdf/route.ts`
- `app/api/public/invoices/[publicId]/pdf/route.ts`
- `app/(protected)/cobros/page.tsx`
- estado de pago en facturas
- recordatorios manuales y por lote

### Requisitos

- cada factura debe tener identificador público
- PDF usable y presentable
- vista pública sencilla, clara y sin datos innecesarios
- cobros con estado:
  - pendiente
  - cobrada
  - vencida si aplica

### UX

- el usuario debe poder ver rápido qué hay que cobrar hoy
- la factura pública y el PDF deben abrir sin errores

### Criterios de aceptación

- una factura puede abrirse por enlace público
- el PDF responde correctamente
- marcar cobrada actualiza el estado persistido
- el historial de cobros refleja el cambio
