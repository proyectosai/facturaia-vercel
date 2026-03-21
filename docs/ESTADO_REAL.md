# Estado real del producto

Este documento existe para evitar una lectura demasiado optimista del proyecto.

FacturaIA ya tiene bastante funcionalidad, pero no todas las áreas tienen la misma madurez.

## Listo para uso diario

Estas piezas son las más razonables para una instalación privada prudente:

- perfil fiscal del emisor
- nueva factura
- listado de facturas
- PDF y factura pública
- correo saliente
- backups locales
- cobros y vencimientos básicos
- instalación local privada sin depender de Google Fonts ni servicios web externos para compilar

Interpretación práctica:

- sí sirven para empezar a trabajar
- siguen necesitando una instalación correcta y pruebas básicas
- no conviene mezclar esto con módulos avanzados el primer día

## En piloto

Estas piezas tienen valor, pero todavía conviene tratarlas como módulos de validación:

- presupuestos y albaranes
- firma documental básica
- documentos con IA local y estudio documental con citas
- correo entrante por IMAP
- backups remotos WebDAV / Nextcloud
- CRM ligero
- mensajería WhatsApp / Telegram
- conciliación bancaria por CSV

Interpretación práctica:

- útiles para probar
- no deberían ser la primera capa de una instalación nueva
- conviene validarlas con datos de prueba antes de depender de ellas

## Experimentales

Estas piezas todavía requieren mucha revisión manual o madurez adicional:

- OCR de gastos
- Facturae / VeriFactu

Interpretación práctica:

- no conviene venderlas como cumplimiento cerrado
- no deben sustituir revisión humana
- no son todavía una base suficiente para delegar tranquilidad fiscal

## Documentado, pero no implementado todavía

Estas piezas existen como arquitectura, roadmap o documento técnico, pero no deben leerse como funcionalidad cerrada:

- memoria local multi-capa para LLM
- vector store / RAG persistente de varios años
- embeddings locales integrados en el flujo principal

Interpretación práctica:

- sirven para entender hacia dónde va FacturaIA
- no conviene presentarlas como algo ya entregado
- si el proyecto se instala hoy, la capa real es la de recuperación por fragmentos y citas, no una memoria completa tipo NotebookLM

## Qué le falta al proyecto para dar más confianza

- más restauraciones de backup validadas
- mejor instalación para no técnicos
- más pilotos reales con autónomos
- mayor cierre fiscal en Facturae / VeriFactu
- menos dependencia de configuración manual en módulos avanzados
- seguir reduciendo el papel del snapshot legacy frente a SQLite estructurado

## Estado de la fase local

La fase local ya no está en “base sin cerrar”. Ahora mismo queda en una situación intermedia más defendible:

- SQLite estructurado ya soporta la operativa crítica y la recuperación de slices principales.
- el snapshot compatible sigue existiendo, pero ya no debería mandar sobre el estado real diario.
- la copia local se valida antes y después del restore.
- el build local ya compila offline sin depender de `fonts.googleapis.com`.

Lo que todavía falta para dar la fase por completamente cerrada es rematar la transición del snapshot legado a una capa SQLite todavía más primaria y seguir estabilizando el cierre de release alrededor de esa base.

## Orden recomendado de adopción

1. perfil fiscal
2. facturas
3. correo saliente
4. backups
5. cobros
6. presupuestos
7. firma
8. banca
9. correo entrante
10. mensajería
11. OCR
12. Facturae / VeriFactu

## Regla general

Si eres autónomo y no técnico:

- no intentes instalarlo todo a la vez
- no conviertas un módulo experimental en pieza crítica
- no metas datos sensibles hasta haber validado backup, envío y recuperación
