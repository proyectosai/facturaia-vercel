# Módulo: OCR de gastos

Este módulo añade una primera capa de gestión de justificantes de gasto dentro de FacturaIA.

## Objetivo

Evitar que el autónomo tenga que guardar tickets y facturas de proveedor fuera del sistema o revisar importes completamente a mano desde cero.

## Qué hace ahora

- subir tickets o facturas proveedor
- guardar el archivo original
- extraer texto de PDFs que ya contienen texto
- extraer texto de imágenes `PNG/JPG/WEBP` con Ollama + `glm-ocr:latest`
- aceptar texto OCR pegado manualmente
- proponer proveedor, NIF, fecha e importes
- dejar el gasto como pendiente o revisado

## Qué no hace todavía

- OCR de PDF escaneado por rasterización local
- clasificación contable avanzada
- exportación fiscal o libro de gastos
- conciliación con movimientos bancarios

## Ruta de la aplicación

- `/gastos`

## Requisitos

- Supabase configurado
- migración `202603201430_add_expenses_module.sql` aplicada
- bucket `expense-files` disponible

## Migración necesaria

Archivo:

- `supabase/migrations/202603201430_add_expenses_module.sql`

Qué crea:

- tabla `public.expenses`
- bucket privado `expense-files`
- índices
- trigger de `updated_at`
- políticas RLS y políticas de storage por usuario

## Instalación paso a paso

1. Aplica la migración nueva en Supabase.
2. Reinicia FacturaIA.
3. Abre `/gastos`.
4. Sube un PDF, ticket o factura proveedor.
5. Si ya tienes texto OCR, pégalo manualmente para mejorar la extracción.
6. Revisa el resultado y marca el gasto como revisado cuando corresponda.

Si quieres OCR automático de imágenes:

```env
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_OCR_MODEL=glm-ocr:latest
```

Y asegúrate de tener Ollama instalado y el modelo descargado:

```bash
ollama pull glm-ocr:latest
```

## Flujo recomendado

1. Importar justificante.
2. Comprobar proveedor, fecha e importes propuestos.
3. Añadir nota interna si hace falta.
4. Marcar como revisado cuando lo hayas comprobado.

## Métodos de extracción en esta fase

- `pdf_text`: el PDF ya contenía texto y se ha leído directamente
- `image_ocr`: una imagen se ha pasado por Ollama GLM-OCR
- `plain_text`: se ha subido un archivo de texto
- `manual`: el usuario ha pegado texto OCR manualmente
- `unavailable`: no se ha podido extraer texto de forma automática

## Uso de IA local

Si LM Studio está configurado, FacturaIA intenta normalizar los datos del justificante usando IA local.

Si Ollama está configurado con `glm-ocr:latest`, FacturaIA puede leer automáticamente tickets e imágenes de justificantes antes de pasar ese texto al parser local.

Si no lo está, cae a una heurística local basada en:

- palabras como `total`, `iva` o `base imponible`
- fechas en formato español
- detección básica de NIF
- búsqueda de la primera línea útil como proveedor

## Limitaciones actuales

- los PDF escaneados siguen necesitando rasterización previa o pegado manual de texto
- no hay previsualización del archivo dentro de la app
- el resultado siempre debe revisarse manualmente

## Relación con otros módulos

- prepara el terreno para conciliación bancaria
- puede alimentar un futuro CRM o panel fiscal más completo
- ya se incluye en backups y restauración

## Verificación recomendada

1. Sube un PDF con texto.
2. Comprueba que se rellenan proveedor, fecha e importes.
3. Sube un justificante con texto OCR pegado manualmente.
4. Marca uno como revisado.
5. Exporta un backup desde `/backups`.

## Archivos principales

- `app/(protected)/gastos/page.tsx`
- `lib/expenses.ts`
- `lib/actions/expenses.ts`
- `lib/ai.ts`
- `supabase/migrations/202603201430_add_expenses_module.sql`
