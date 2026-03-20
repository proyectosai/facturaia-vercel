# Conciliación bancaria

## Objetivo

Importar extractos CSV desde el banco para revisar ingresos y cargos dentro de FacturaIA y enlazarlos manualmente con:

- facturas emitidas
- gastos ya importados

Esta primera entrega prioriza control manual y claridad operativa. No cambia estados de cobro de forma automática.

## Qué hace ahora

- importar extractos CSV manuales desde `/banca`
- guardar movimientos bancarios por usuario
- clasificar cada movimiento como `pendiente`, `conciliado` o `ignorado`
- detectar sugerencias por importe, fecha y contraparte
- enlazar manualmente un ingreso con una factura
- enlazar manualmente un cargo con un gasto
- incluir los movimientos bancarios en backups y restauración

## Qué no hace todavía

- lectura de OFX o Norma 43
- conexión directa con bancos
- reglas automáticas persistentes
- previsión de caja
- marcar facturas como cobradas en un estado propio
- conciliación masiva por lotes

## Requisitos

- migración `202603201730_add_bank_reconciliation_module.sql` aplicada
- Supabase configurado
- al menos una factura o un gasto ya creado si quieres validar sugerencias
- extracto CSV exportado desde tu banco

## Ruta principal

- `/banca`

## Formato CSV esperado

FacturaIA intenta detectar cabeceras frecuentes como:

- `fecha`
- `fecha operación`
- `fecha valor`
- `concepto`
- `descripción`
- `contraparte`
- `importe`
- `abono`
- `cargo`
- `saldo`
- `moneda`

No hace falta que tu fichero use exactamente esos nombres, pero conviene que se parezcan.

## Instalación mínima

1. Aplica la migración:

```bash
supabase db push
```

o ejecuta directamente el SQL de:

- `supabase/migrations/202603201730_add_bank_reconciliation_module.sql`

2. Reinicia la aplicación.
3. Abre `/banca`.
4. Exporta desde tu banco un CSV corto, por ejemplo de una o dos semanas.
5. Sube el fichero indicando un alias de cuenta.
6. Revisa las sugerencias y enlaza primero unos pocos movimientos manualmente.

## Recomendaciones de uso

- empieza con un CSV pequeño
- valida que la cabecera de tu banco se interpreta bien
- revisa antes los gastos en `/gastos`
- revisa antes las facturas en `/invoices`
- usa `Ignorar` para movimientos internos o irrelevantes

## Datos guardados

Tabla principal:

- `bank_movements`

Campos importantes:

- `account_label`
- `booking_date`
- `value_date`
- `description`
- `counterparty_name`
- `amount`
- `direction`
- `status`
- `matched_invoice_id`
- `matched_expense_id`
- `source_hash`

## Backups

El módulo ya está incluido en:

- exportación JSON local
- restauración en modo reemplazo

Esto permite mover tu histórico bancario entre instalaciones privadas.

## Próximas mejoras previstas

- soporte OFX
- conciliación por reglas repetibles
- conciliación masiva
- estado de cobro real en facturas
- vista de caja y vencimientos
