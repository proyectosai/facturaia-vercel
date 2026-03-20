# Firma documental

## Objetivo

Este módulo añade enlaces públicos para registrar una aceptación de presupuesto o una firma básica de albarán sin depender de plataformas externas.

Está pensado como evidencia operativa dentro de una instalación privada.

## Qué incluye en esta primera entrega

- generación de enlace público por documento
- aceptación de presupuestos
- firma básica de albaranes
- registro de nombre, email, NIF y comentario del firmante
- fecha de solicitud, fecha de respuesta y caducidad
- evidencia técnica mínima del navegador y del origen
- hash de integridad del documento al generar el enlace
- bloqueo de respuesta si el documento cambió después de emitir la solicitud
- panel interno en `/firmas`

## Rutas

- `/firmas`
- `/firma/[token]`

## Requisitos

- Supabase configurado
- migración `202603201640_add_document_signature_module.sql` aplicada
- `NEXT_PUBLIC_APP_URL` definido correctamente

## Instalación paso a paso

1. Aplica la migración:

```bash
supabase db push
```

o ejecuta manualmente:

- `supabase/migrations/202603201640_add_document_signature_module.sql`

2. Reinicia FacturaIA.

3. Abre `/presupuestos`.

4. En un presupuesto o albarán, pulsa `Solicitar firma`.

5. Copia el enlace público y ábrelo en otra ventana para validarlo.

6. Revisa el historial en `/firmas`.

## Comportamiento actual

- al crear una solicitud desde un presupuesto en borrador, el documento pasa a `Enviado`
- al crearla desde un albarán en borrador, pasa a `Entregado`
- al aceptar un presupuesto desde el enlace, el documento pasa a `Aceptado`
- al firmar un albarán desde el enlace, el documento pasa a `Firmado`
- si se rechaza un presupuesto desde el enlace, pasa a `Rechazado`
- si el documento cambia tras crear el enlace, la firma ya no se acepta y se pide emitir una nueva solicitud

## Limitaciones

- no es firma electrónica cualificada
- no hay certificado digital ni sello de tiempo avanzado
- no hay adjuntos adicionales ni flujo legal completo
- la evidencia técnica es básica y pensada para operativa interna

## Siguientes mejoras previstas

- PDF específico para solicitud y evidencia
- plantillas de texto por tipo de documento
- firma sobre contratos desde la cabina documental
- recordatorios automáticos para solicitudes pendientes

## Diferencia importante con la firma fiscal

La firma documental de este módulo no sustituye:

- la firma XAdES de Facturae
- la firma fiscal de registros para conservación o requerimiento
- una firma cualificada de tercero de confianza

La solución correcta es separar:

1. evidencia comercial de aceptación o entrega
2. firma fiscal XML
3. firma avanzada o cualificada si el caso de uso la exige

Plan detallado:

- [../VERIFACTU_Y_FIRMA_DIGITAL.md](../VERIFACTU_Y_FIRMA_DIGITAL.md)
