# VeriFactu y firma digital

Fecha de revisión: 20 de marzo de 2026

## Resumen corto

FacturaIA tiene ahora dos piezas distintas que no conviene mezclar:

1. firma documental comercial
2. preparación fiscal Facturae / VeriFactu

Hoy ambas existen, pero todavía no constituyen un circuito de cumplimiento completo.

La solución correcta pasa por separar tres problemas técnicos:

- aceptación o firma operativa de presupuestos, albaranes y contratos
- firma XML de Facturae
- cadena de registros y remisión a AEAT para VeriFactu

## Situación actual

### Firma documental

Lo que ya existe:

- enlace público de aceptación o firma
- captura de identidad declarada del firmante
- evidencia básica del navegador
- control de caducidad
- hash de integridad del documento
- bloqueo si el documento cambió tras emitir el enlace

Lo que no existe aún:

- firma avanzada o cualificada
- sello de tiempo de tercero de confianza
- paquete probatorio PDF con evidencias
- doble factor u OTP

### Facturae / VeriFactu

Lo que ya existe:

- panel `/facturae`
- XML Facturae 3.2.2 base
- revisión previa de datos mínimos
- detalle de vencimiento y forma de pago

Lo que no existe aún:

- firma XAdES del XML Facturae
- remisión a FACe
- cadena completa de registros VeriFactu
- registros de evento
- remisión AEAT por servicio web
- conservación y auditoría de huellas

## Requisitos oficiales que mandan

Referencias oficiales:

- Real Decreto 1007/2023:
  - [https://www.boe.es/buscar/act.php?id=BOE-A-2023-24840](https://www.boe.es/buscar/act.php?id=BOE-A-2023-24840)
- Orden HAC/1177/2024:
  - [https://www.boe.es/buscar/doc.php?id=BOE-A-2024-22138](https://www.boe.es/buscar/doc.php?id=BOE-A-2024-22138)
- Descripción técnica del servicio web AEAT:
  - [https://sede.agenciatributaria.gob.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Veri-Factu_Descripcion_SWeb.pdf](https://sede.agenciatributaria.gob.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Veri-Factu_Descripcion_SWeb.pdf)
- Folleto AEAT de plazos y modalidades:
  - [https://sede.agenciatributaria.gob.es/static_files/Sede/Biblioteca/Folleto/VERIFACTU/Folleto_VERIFACTU_en_gb.pdf](https://sede.agenciatributaria.gob.es/static_files/Sede/Biblioteca/Folleto/VERIFACTU/Folleto_VERIFACTU_en_gb.pdf)

Puntos clave ya vigentes:

- los sistemas deben generar registros de alta y anulación en XML
- debe existir encadenamiento por huella o `hash`
- deben conservar integridad, inalterabilidad, trazabilidad y legibilidad
- el sistema debe incorporar fecha, hora y huso horario en formato ISO 8601
- la AEAT publica servicio web para la remisión voluntaria VeriFactu
- según el folleto oficial AEAT, los plazos prácticos son:
  - `1 de enero de 2027` para contribuyentes del Impuesto sobre Sociedades
  - `1 de julio de 2027` para el resto de empresas y autónomos

Punto especialmente importante:

- la Orden HAC/1177/2024 exige firma XAdES Enveloped con certificado cualificado para los registros de facturación y evento en conservación y requerimiento
- la propia especificación técnica aclara que el bloque `Signature` no es obligatorio en remisión voluntaria `VERI*FACTU`

Conclusión práctica:

- si FacturaIA implementa la modalidad `VERI*FACTU` real, puede priorizar primero la remisión web service y la cadena de huellas
- si quiere cubrir también conservación completa y escenarios de requerimiento, necesitará además firma fiscal XAdES con certificado cualificado

## Camino correcto para VeriFactu

### Fase 1. Capa fiscal interna e inmutable

Crear tablas nuevas separadas del modelo de factura visible:

- `verifactu_installations`
- `verifactu_records`
- `verifactu_events`
- `verifactu_submissions`

Cada registro de facturación debe guardar:

- NIF del emisor
- serie y número
- fecha de expedición
- tipo de factura
- cuota total
- importe total
- fecha/hora/zona horaria de generación
- tipo de huella
- huella propia
- referencia al registro anterior
- estado de remisión
- XML generado
- respuesta AEAT cuando exista

Cada evento debe guardar:

- instalación
- tipo de evento
- fecha/hora/zona horaria
- huella propia
- huella del evento anterior
- XML y metadatos

Principio clave:

- estos registros no deben regenerarse “al vuelo”
- deben persistirse de forma append-only y auditable

### Fase 2. Cadena de huellas y control temporal

Implementar:

- cadena única por obligado tributario e instalación
- referencia al registro anterior
- reloj con desviación controlada
- validación de error máximo temporal
- alertas cuando se rompa la integridad

Sin esta capa, no hay VeriFactu serio.

### Fase 3. Generación XML AEAT real

Añadir:

- XML de alta
- XML de anulación
- XML de eventos
- validación contra esquemas oficiales
- documento de errores y validaciones AEAT

### Fase 4. Remisión voluntaria `VERI*FACTU`

Implementar el servicio web AEAT con:

- autenticación por certificado
- alta y anulación
- consulta de registros presentados
- persistencia de respuestas y errores
- reintentos controlados

### Fase 5. QR y trazabilidad visible

Añadir en la factura:

- QR con los datos y formato exigidos
- estado visible de envío a AEAT
- referencia clara a modalidad `VERI*FACTU` cuando aplique

### Fase 6. Conservación y requerimiento

Si se quiere cubrir también el escenario completo no limitado a remisión voluntaria:

- firma XAdES de registros
- conservación de firmas
- verificación de firma
- exportación íntegra para requerimiento

## Camino correcto para la firma digital

## 1. Firma documental comercial

Esto cubre:

- presupuestos
- albaranes
- contratos de servicios

La recomendación realista es evolucionar así:

### Nivel A. Evidencia reforzada

- OTP por email
- PDF de evidencia con snapshot del documento
- IP, user-agent y huella temporal normalizada
- resumen de aceptación y texto aceptado

### Nivel B. Sello de tiempo

- integrar RFC 3161 o servicio equivalente
- sellar el hash del documento y la aceptación

### Nivel C. Firma avanzada o cualificada

Dos caminos posibles:

- integración con proveedor externo de confianza
- firma local con certificado del usuario y flujo de custodia controlada

Para una app self-hosted, el camino más prudente suele ser:

- evidencia reforzada por defecto
- firma avanzada como módulo adicional

## 2. Firma XML Facturae / fiscal

Esto es otra cosa.

Aquí no vale la firma documental actual.

Se necesita:

- estándar XAdES Enveloped
- certificado cualificado en vigor
- generación y verificación de firma
- gestión segura del certificado

Recomendación técnica:

- aislar la firma fiscal en un servicio dedicado
- soportar certificado `PFX/P12` con contraseña o PKCS#11/HSM
- cifrar la configuración sensible en reposo
- validar caducidad y cadena de confianza

## Orden recomendado de implementación

1. append-only fiscal ledger
2. hash chain y registros de evento
3. XML AEAT real y validación
4. remisión `VERI*FACTU`
5. QR y trazabilidad visible
6. firma XAdES fiscal
7. FACe / administración pública si se quiere cubrir ese circuito

Para firma comercial:

1. OTP y PDF de evidencia
2. sello de tiempo
3. firma avanzada o integración con tercero de confianza

## Qué mejora más el proyecto a corto plazo

Lo que más sube la madurez real no es “poner una firma cualquiera”.

Lo que más sube la madurez es:

- separar el modelo fiscal del modelo visible de factura
- hacer persistente la cadena de registros
- validar XML de forma automática
- soportar remisión real a AEAT
- tratar la firma fiscal y la comercial como problemas distintos

## Conclusión

Hoy FacturaIA puede:

- preparar documentos
- ayudar a ordenar la operativa
- generar un XML Facturae base
- registrar una aceptación documental básica con evidencia

Para cerrar de verdad el problema de VeriFactu y firma digital necesita una siguiente fase claramente fiscal y criptográfica, no solo de interfaz:

- ledger fiscal inmutable
- hash chain
- XML oficial validado
- integración AEAT
- firma XAdES con certificado cualificado cuando aplique
