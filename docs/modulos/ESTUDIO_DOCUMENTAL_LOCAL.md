# Estudio documental local

Este módulo sirve para consultar documentación privada del despacho dentro de la propia instalación de FacturaIA.

## Qué hace hoy

- guarda notas manuales y archivos `TXT`, `Markdown` y `PDF` extraído
- persiste texto y metadatos en local por usuario
- recupera fragmentos relevantes según la consulta
- envía esos fragmentos a LM Studio cuando está disponible
- devuelve respuesta con citas visibles
- si LM Studio no está disponible, devuelve recuperación guiada sin LLM

## Qué no hace todavía

- no usa embeddings persistentes
- no monta un vector store local
- no es una memoria multi-año completa
- no es un clon local de NotebookLM

La lectura correcta es esta: **sí es un estudio documental real de primera fase; no es todavía el RAG completo descrito en `docs/MEMORIA_LOCAL_LLM.md`.**

## Ruta

- `/estudio-ia`

## Requisitos

- usuario autenticado
- `FACTURAIA_DATA_DIR` accesible
- LM Studio opcional pero recomendado para respuestas redactadas

## Formatos aceptados

- `TXT`
- `MD`
- `PDF`
- nota pegada manualmente

## Instalación y uso

1. Abre `/estudio-ia`.
2. Carga una nota o un archivo de trabajo.
3. Espera a que FacturaIA guarde el texto extraído.
4. Haz una pregunta concreta sobre esa documentación.
5. Revisa siempre las citas antes de tomar una decisión fiscal u operativa.

## Seguridad local

- si `FACTURAIA_ENCRYPT_LOCAL_DATA=1`, el índice y los textos del módulo se guardan cifrados
- si falta `FACTURAIA_ENCRYPTION_PASSPHRASE` y el cifrado está activado, el módulo falla en modo seguro

## Backups

Las notas y documentos de estudio exportan y restauran junto con el backup JSON del usuario.

## Recomendación práctica

Úsalo para:

- notas de reuniones
- manuales internos
- extractos normativos
- documentación de cliente
- dossiers de preparación de expedientes

No lo uses todavía para vender:

- memoria fiscal total de varios años
- agente fiscal autónomo
- cumplimiento automático
