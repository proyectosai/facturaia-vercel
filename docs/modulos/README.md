# Índice de módulos

Esta carpeta reúne documentación específica por módulo para que una instalación privada de FacturaIA se pueda configurar sin depender de explicaciones dispersas.

## Antes de abrir un módulo suelto

Lee primero:

- [Sistema de módulos](../SISTEMA_DE_MODULOS.md)
- [DFD y plan técnico modular](../MODULOS_DFD.md)

Eso te da el contexto correcto:

- qué módulo conviene instalar primero
- qué significa `uso diario`, `piloto` o `experimental`
- qué módulos son realmente compatibles con modo local
- cuáles necesitan servicios o canales externos

## Documentos actuales

### Canales e integraciones

- `MENSAJERIA_WHATSAPP_TELEGRAM.md`
- `CORREO_SALIENTE.md`
- `CORREO_ENTRANTE.md`

### Resiliencia

- `BACKUPS_REMOTOS.md`

### Documentos y flujo comercial

- `PRESUPUESTOS_ALBARANES.md`
- `FIRMA_DOCUMENTAL.md`

### Finanzas y operativa

- `GASTOS_OCR.md`
- `CRM_LIGERO.md`
- `CONCILIACION_BANCARIA.md`
- `COBROS_Y_VENCIMIENTOS.md`

### Cumplimiento y apoyo profesional

- `FACTURAE_VERIFACTU.md`
- `ASISTENTE_RENTA.md`
- `FEEDBACK_PILOTOS.md`

## Regla práctica

Para un autónomo o despacho pequeño, lo sensato suele ser:

1. `backups + correo saliente + cobros`
2. `clientes + presupuestos + firma`
3. `gastos + renta`
4. `mensajería + correo entrante + banca + Facturae` solo cuando realmente hagan falta
