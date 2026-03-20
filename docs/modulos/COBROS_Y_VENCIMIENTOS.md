# Cobros y vencimientos

Este documento describe la primera entrega del circuito de cobros dentro de FacturaIA.

## Objetivo

Dar visibilidad operativa al estado económico de cada factura sin depender de hojas externas:

- fecha de vencimiento
- importe ya cobrado
- saldo pendiente
- facturas vencidas
- cobros manuales
- sincronización con conciliación bancaria

## Qué hace ahora

- añade una vista dedicada en `/cobros`
- guarda en cada factura:
  - `due_date`
  - `payment_status`
  - `amount_paid`
  - `paid_at`
  - `collection_notes`
- calcula automáticamente si una factura está vencida
- actualiza el estado cuando un movimiento bancario conciliado se vincula a una factura
- permite marcar una factura como cobrada manualmente
- permite reabrir el seguimiento si el cobro se registró por error
- refleja el estado en:
  - `/dashboard`
  - `/invoices`
  - `/clientes`
  - `/factura/[publicId]`
  - PDF de factura

## Estado funcional actual

La lógica de cobros tiene tres estados persistidos:

- `pending`
- `partial`
- `paid`

Además, la app calcula un cuarto estado visual:

- `overdue`

`overdue` no se guarda como valor en base de datos; se deriva cuando:

- la factura no está `paid`
- existe saldo pendiente
- `due_date` ya ha pasado

## Sincronización con banca

Cuando concilias un ingreso en `/banca` contra una factura:

1. el movimiento queda enlazado con `matched_invoice_id`
2. FacturaIA recalcula los cobros conciliados de esa factura
3. actualiza:
   - `amount_paid`
   - `payment_status`
   - `paid_at`

Reglas actuales:

- si el total conciliado es `0` → `pending`
- si es mayor que `0` pero menor que el total de la factura → `partial`
- si cubre el total de la factura → `paid`

## Marcado manual

Desde `/cobros` puedes:

- `Marcar cobrada`
- `Reabrir cobro`

Esto sirve cuando el cobro no entra por conciliación bancaria o todavía no has importado el extracto.

## Instalación

1. aplica la migración `202603201900_add_invoice_collection_tracking.sql`
2. reinicia la aplicación
3. abre `/cobros`
4. revisa el panel resumen
5. emite una factura nueva con vencimiento
6. concilia un ingreso en `/banca` o usa el marcado manual

## Limitaciones actuales

- no hay recordatorios automáticos de cobro
- no hay envío automático de reclamaciones
- no existe todavía histórico de acciones sobre cobro
- no hay reglas por lotes
- no hay conciliación OFX
- no se distingue todavía entre cobro manual y cobro bancario como fuentes separadas

## Archivos clave

- `app/(protected)/cobros/page.tsx`
- `app/(protected)/dashboard/page.tsx`
- `app/(protected)/invoices/page.tsx`
- `components/invoices/invoices-collection.tsx`
- `lib/collections.ts`
- `lib/collections-server.ts`
- `lib/actions/invoices.ts`
- `lib/actions/banking.ts`
- `supabase/migrations/202603201900_add_invoice_collection_tracking.sql`
