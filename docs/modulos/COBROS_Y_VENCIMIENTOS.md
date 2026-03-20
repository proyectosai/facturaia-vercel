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
- permite enviar recordatorios de cobro por email
- guarda `last_reminder_at` y `reminder_count`
- añade una cola recomendada para envíos por lote
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

## Recordatorios de cobro

Desde `/cobros` puedes enviar un recordatorio real por email.

Comportamiento actual:

- adjunta el PDF de la factura
- usa IA local para redactar el mensaje si LM Studio está disponible
- si la IA local falla o no está configurada, usa una plantilla interna
- registra:
  - último recordatorio enviado
  - número total de recordatorios

Esto permite ver desde la propia tarjeta si ya se ha insistido antes o no.

Además, FacturaIA deja un historial persistente de los últimos recordatorios enviados con:

- factura afectada
- destinatario
- asunto usado
- fecha y hora del envío
- origen del envío: manual o por lote

## Recordatorios por lote

La pantalla `/cobros` incorpora una cola priorizada con reglas simples:

- `Vencidas sin aviso reciente`
  - facturas vencidas
  - sin recordatorio en los últimos 7 días
- `Parciales sin seguimiento`
  - facturas con cobro parcial
  - sin recordatorio en los últimos 5 días
- `Próximas a vencer`
  - facturas pendientes que vencen en 3 días o menos
  - sin aviso en los últimos 7 días

El envío por lote reutiliza exactamente la misma lógica que el recordatorio individual:

- mismo adjunto PDF
- mismo uso opcional de IA local
- mismo registro de `last_reminder_at`
- mismo incremento de `reminder_count`
- mismo guardado en el historial persistente de recordatorios

## Instalación

1. aplica la migración `202603201900_add_invoice_collection_tracking.sql`
2. aplica la migración `202603201945_add_invoice_reminder_tracking.sql`
3. aplica la migración `202603202015_add_invoice_reminder_history.sql`
4. reinicia la aplicación
5. abre `/cobros`
6. revisa el panel resumen
7. emite una factura nueva con vencimiento
8. concilia un ingreso en `/banca`, usa el marcado manual o envía un recordatorio
9. prueba también la cola de lotes recomendados
10. confirma que la actividad reciente aparece en la propia pantalla y que el historial entra en `/backups`

## Limitaciones actuales

- no hay recordatorios automáticos programados todavía
- no hay envío automático de reclamaciones
- no hay reglas configurables por el usuario para redefinir lotes o ventanas de espera
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
