# Prompt 07 · Clientes, Gastos Y Documentos Comerciales

## Prompt

Quiero que amplíes FacturaIA con operativa alrededor de la factura, sin salirte del enfoque prudente.

### Implementa

- `app/(protected)/clientes/page.tsx`
- `app/(protected)/gastos/page.tsx`
- `app/(protected)/presupuestos/page.tsx`
- `lib/clients.ts`
- `lib/expenses.ts`
- `lib/commercial-documents.ts`
- acciones asociadas

### Clientes

- fichas simples
- notas
- actividad relacionada
- no intentes hacer un CRM gigante

### Gastos

- alta manual
- subida de justificante
- extracción básica de texto
- revisión antes de guardar

### Presupuestos / albaranes

- creación
- estados
- conversión a factura

### Requisitos

- todo debe seguir funcionando en modo local
- si algo es piloto, dilo
- no vendas OCR como precisión fiscal cerrada

### Criterios de aceptación

- un usuario local puede crear cliente, gasto y presupuesto
- presupuesto puede convertirse en factura
- el backup incluye estas entidades
