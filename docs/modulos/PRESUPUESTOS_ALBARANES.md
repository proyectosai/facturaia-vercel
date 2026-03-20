# Módulo: presupuestos y albaranes

Este módulo añade a FacturaIA una capa de **pre-facturación**. Sirve para guardar documentos previos a la emisión final de la factura y mantenerlos dentro del mismo circuito fiscal.

## Qué resuelve

- preparar un presupuesto sin usar un documento externo
- registrar un albarán o entrega realizada
- mantener estados claros antes de facturar
- convertir el documento en factura definitiva sin reescribir líneas ni datos del cliente

## Estado actual del módulo

Primera entrega ya operativa:

- persistencia en base de datos
- numeración propia para presupuestos y albaranes
- cambio de estado desde la interfaz
- conversión a factura
- inclusión en backups y restauración

Pendiente para iteraciones posteriores:

- PDF específico de presupuesto y albarán
- aceptación o firma por cliente
- enlace más profundo con la cabina de documentos IA
- plantillas más ricas y envío directo al cliente

## Ruta de la aplicación

- `/presupuestos`

## Requisitos

- Supabase configurado
- autenticación operativa
- migración `202603201330_add_commercial_documents_module.sql` aplicada

## Migración necesaria

Archivo:

- `supabase/migrations/202603201330_add_commercial_documents_module.sql`

Qué crea:

- tabla `public.commercial_documents`
- secuencia `public.commercial_document_number_seq`
- índices
- trigger de `updated_at`
- políticas RLS para el usuario autenticado

## Instalación paso a paso

1. Aplica la migración nueva en tu proyecto Supabase.
2. Reinicia FacturaIA.
3. Entra en `/presupuestos`.
4. Crea un presupuesto o un albarán de prueba.
5. Cambia su estado según el avance real.
6. Cuando proceda, pulsa `Convertir en factura`.

## Flujo recomendado

### Presupuesto

1. Crear presupuesto.
2. Marcar como `Enviado`.
3. Marcar como `Aceptado` si el cliente confirma.
4. Convertir en factura cuando llegue el momento de emitir.

### Albarán

1. Crear albarán.
2. Marcar como `Entregado`.
3. Marcar como `Firmado` si tienes esa validación.
4. Convertir en factura cuando quieras cerrar el trabajo.

## Qué conserva al convertir a factura

FacturaIA reutiliza:

- nombre y NIF del emisor
- dirección del emisor
- logo
- datos del cliente
- líneas y totales
- IVA e IRPF

La factura nueva usa la numeración propia de `invoices` y marca el documento origen como `converted`.

## Limitaciones actuales

- la fecha de la factura convertida se fija con la fecha actual del sistema
- no existe todavía PDF independiente de presupuesto o albarán
- no hay firma externa ni aceptación pública por enlace

## Integración con backups

Las copias de seguridad del usuario ya incluyen:

- `commercial_documents`

Eso permite mover la instalación o restaurarla sin perder el histórico de pre-facturación.

## Verificación recomendada

Después de activar el módulo:

1. crea un presupuesto con una línea de prueba
2. crea un albarán con otra línea distinta
3. actualiza al menos un estado en cada tipo
4. convierte uno de los documentos en factura
5. revisa `/invoices`
6. exporta un backup desde `/backups`

## Archivos principales

- `app/(protected)/presupuestos/page.tsx`
- `components/commercial/commercial-document-form.tsx`
- `lib/commercial-documents.ts`
- `lib/actions/commercial-documents.ts`
- `supabase/migrations/202603201330_add_commercial_documents_module.sql`

## Relación con otros módulos

- se apoya en el núcleo de facturación
- quedará mejor conectado con `Documentos IA`
- prepara el terreno para firma documental y CRM ligero
