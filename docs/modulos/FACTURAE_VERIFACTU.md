# Facturae / VeriFactu

## Objetivo

Dar una primera salida estructurada desde FacturaIA hacia formatos y circuitos de cumplimiento españoles sin fingir automatización completa.

Esta entrega añade:

- panel `/facturae`
- exportación de borrador XML Facturae 3.2.2
- revisión previa por factura
- validación más estricta de NIF y vencimiento
- detalle de pago con vencimiento dentro del XML
- enlaces oficiales a BOE, Facturae y AEAT

## Qué hace ahora

- lista facturas emitidas y las prepara para exportación
- genera un XML Facturae 3.2.2 sin firma XAdES
- avisa sobre datos que conviene revisar antes de usar el fichero fuera de la app
- bloquea mejor casos con NIF no reconocible o vencimiento incoherente
- muestra referencias oficiales para seguir Facturae y VeriFactu

## Qué no hace todavía

- firma XAdES
- integración con FACe
- remisión automática a VeriFactu
- validación completa contra todos los escenarios de la especificación
- códigos DIR3 o metadatos de administración pública

## Ruta principal

- `/facturae`

## Requisitos

- Supabase configurado
- facturas emitidas con emisor, cliente, NIF y líneas
- revisión manual del XML antes de usarlo en un flujo externo

## Instalación mínima

No requiere migraciones nuevas.

Pasos:

1. Reinicia la aplicación con esta versión del proyecto.
2. Abre `/facturae`.
3. Filtra por cliente o número si hace falta.
4. Descarga un XML de prueba.
5. Contrasta el borrador con la documentación oficial si vas a usarlo fuera de FacturaIA.

## Referencias oficiales

- Facturae 3.2.2 en BOE:
  - [https://www.boe.es/boe/dias/2017/08/25/pdfs/BOE-A-2017-9982.pdf](https://www.boe.es/boe/dias/2017/08/25/pdfs/BOE-A-2017-9982.pdf)
- Portal oficial Facturae:
  - [https://www.facturae.gob.es/formato/Paginas/versiones-anteriores-formato-facturae.aspx](https://www.facturae.gob.es/formato/Paginas/versiones-anteriores-formato-facturae.aspx)
- Reglamento VeriFactu:
  - [https://www.boe.es/buscar/act.php?id=BOE-A-2023-24840](https://www.boe.es/buscar/act.php?id=BOE-A-2023-24840)
- Descripción técnica AEAT:
  - [https://sede.agenciatributaria.gob.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Veri-Factu_Descripcion_SWeb.pdf](https://sede.agenciatributaria.gob.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Veri-Factu_Descripcion_SWeb.pdf)
- Nota AEAT de plazos:
  - [https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu/nota-informativa-ampliacion-plazo-adaptacion-facturacion.html](https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu/nota-informativa-ampliacion-plazo-adaptacion-facturacion.html)

## Estado real del módulo

Es una fase preparatoria útil, no un circuito de cumplimiento cerrado.

Interpretación práctica:

- sirve para empezar a sacar XML estructurado
- sirve para detectar huecos de datos en tus facturas
- sirve para ordenar el trabajo previo a Facturae / VeriFactu
- no sustituye asesoramiento fiscal, legal o técnico especializado

## Próximas mejoras previstas

- firma XAdES
- validación más estricta por factura
- vista de incidencias fiscales por documento
- preparación de remisión o registro VeriFactu
- soporte más sólido para flujos con administración pública

## Plan recomendado de cumplimiento

La forma correcta de evolucionar este módulo no es “añadir un botón más”.

El siguiente salto serio pasa por:

1. crear un ledger fiscal append-only separado de la factura visible
2. generar registros de alta, anulación y evento con cadena de huellas
3. validar XML contra esquemas y documento de errores AEAT
4. implementar remisión voluntaria `VERI*FACTU`
5. añadir firma XAdES con certificado cualificado para escenarios de conservación y requerimiento

Documento detallado:

- [../VERIFACTU_Y_FIRMA_DIGITAL.md](../VERIFACTU_Y_FIRMA_DIGITAL.md)
