# Visión, alcance y pendientes

Este documento resume qué quiere ser FacturaIA, qué partes del producto ya existen y qué trabajo sigue pendiente para convertirlo en una herramienta realmente sólida para autónomos españoles.

La idea no es vender humo. La idea es dejar claro:

- qué problema resuelve el proyecto
- qué parte está ya construida
- qué está incompleto o en fase temprana
- qué prioridades tiene el roadmap real

## 1. Qué quiere ser FacturaIA

FacturaIA quiere convertirse en un software open source para autónomos españoles centrado en tres áreas:

1. facturación profesional
2. documentación comercial y contractual
3. automatización útil con IA local

No se plantea como una simple app para emitir PDFs.

La ambición real es cubrir el trabajo administrativo que rodea a muchos autónomos:

- preparar presupuestos y propuestas
- convertir ese material en facturas consistentes
- mantener una imagen profesional
- ahorrar tiempo en tareas repetitivas
- disponer de una base técnica abierta que otros puedan estudiar o reutilizar

## 2. Para quién está pensado

El foco actual del producto está en:

- autónomos españoles
- pequeños estudios y despachos
- consultores independientes
- freelancers con flujo recurrente de propuestas, presupuestos y facturas
- personas que quieren una herramienta más simple que un ERP pesado

## 3. Qué problemas queremos resolver

### Facturación

- emitir facturas correctas y visualmente profesionales
- centralizar emisor, cliente, IVA, IRPF y numeración
- mantener un historial fácil de revisar
- descargar y enviar documentos sin salir de la app

### Documentación comercial

- redactar propuestas, presupuestos y contratos más rápido
- reutilizar una estructura profesional en español
- exportar material listo para enviar en PDF y Word

### Productividad

- reducir texto repetitivo
- guiar al usuario en vez de dejarle solo ante un formulario
- convertir tareas administrativas en flujos más claros

## 4. Estado real del proyecto hoy

FacturaIA ya tiene una base funcional seria, pero todavía no está cerrada como producto final.

Hay bastante trabajo hecho en:

- interfaz principal
- panel protegido
- facturación
- generación documental
- conciliación bancaria inicial
- mensajería opcional
- documentación del repositorio

Todavía faltan piezas importantes para considerarlo un producto completamente maduro.

## 5. Qué está hecho

### Interfaz y estructura

- aplicación con Next.js 15, App Router y TypeScript
- UI cuidada en español
- dashboard protegido con navegación lateral
- vistas diferenciadas para dashboard, facturas, nueva factura, documentos, instalación y perfil
- modo demo local para revisar el producto sin servicios externos reales

### Autenticación y datos

- integración con Supabase Auth por magic link
- persistencia en Postgres
- políticas RLS
- perfil fiscal del emisor
- almacenamiento de logo

### Facturación

- formulario visual para nueva factura
- líneas dinámicas con IVA e IRPF
- cálculo de subtotales y totales
- numeración automática
- PDF profesional con QR y página pública
- historial de facturas
- descarga de PDF
- envío por email

### Uso privado y despliegue

- guía de instalación privada integrada en la app
- copy y navegación orientadas a despliegue self-hosted
- eliminación de la monetización integrada como eje del producto
- base preparada para que cada usuario active solo las integraciones que quiera usar
- backups manuales desde la propia interfaz
- backups remotos por WebDAV / Nextcloud
- primera entrega de conciliación bancaria con importación CSV

### IA y documentos

- integración con IA local vía LM Studio
- mejora de descripciones
- cabina documental para propuestas, presupuestos y contratos
- exportación a PDF y Word
- branding con logo y bloques editables

### Documentación y repo público

- README en español
- guías de instalación, arquitectura y despliegue
- roadmap
- política de seguridad
- código de conducta
- plantillas de issues y pull requests
- workflow de CI
- licencia MIT

## 6. Qué está a medio hacer o necesita refuerzo

Estas partes existen, pero no están cerradas del todo:

### Facturación

- la experiencia de creación de factura ya es usable, pero todavía admite más refinamiento en velocidad, claridad y reutilización
- faltan flujos como duplicar factura, guardar borradores en base de datos y plantillas por tipo de servicio
- el enfoque VeriFactu está reflejado en copy y estructura, pero todavía no existe exportación operativa completa

### Documentos

- la cabina documental funciona, pero necesita más plantillas y más control sobre bloques reutilizables
- falta histórico persistente de documentos generados
- falta duplicación, versionado y biblioteca de plantillas propias del usuario
- la firma documental ya existe en una primera fase, pero necesita mayor solidez operativa y legal

### Finanzas privadas

- la conciliación bancaria ya importa CSV y propone enlaces, pero todavía no cubre reglas automáticas ni estado de cobro real
- faltan formatos adicionales como OFX o Norma 43
- falta reporting sencillo de caja y vencimientos

### Instalación privada

- conviene reforzar scripts de setup para VPS y servidores domésticos
- falta una experiencia más guiada de backup y restauración
- hacen falta checks más visibles del estado del entorno local
- faltan snapshots programados o cifrados

### Calidad

- no hay suite de tests seria todavía
- falta observabilidad más formal
- falta semilla de datos y más utilidades de onboarding técnico

## 7. Qué todavía no está hecho

Esto forma parte de la visión, pero hoy no está implementado o no está completo:

### Facturación avanzada

- borradores persistentes de factura
- duplicación de facturas
- estados de factura más ricos
- exportación XML orientada a VeriFactu
- más automatizaciones fiscales

### Documentos avanzados

- guardado permanente de propuestas, contratos y presupuestos
- biblioteca de plantillas por usuario
- colaboración o revisión entre varias personas
- firma avanzada o flujo de aceptación más sólido y auditable

### IA más madura

- prompts más controlados por caso de uso
- biblioteca de instrucciones por sector profesional
- mejora de calidad de salida en documentos complejos
- más herramientas de reescritura y adaptación del tono

### Producto

- onboarding inicial más guiado
- vacíos y ayudas contextuales más trabajadas
- métricas de uso más claras en dashboard
- experiencia móvil todavía más fina en flujos densos
- herramientas mejores para administración self-hosted
- reglas de conciliación más automáticas para banca y caja

### Infraestructura

- tests unitarios e integración
- tests e2e
- healthchecks más formales
- monitorización de errores y eventos críticos
- pipeline de despliegue más completo

## 8. Qué no queremos que sea

FacturaIA no quiere convertirse en:

- un ERP gigantesco y pesado
- una app genérica sin foco en España
- una demo de IA sin utilidad práctica
- un proyecto que esconda limitaciones reales

El criterio es simple: menos funciones vacías y más flujos útiles que ahorren tiempo.

## 9. Prioridades reales a corto plazo

### Prioridad 1. Mejorar el núcleo de facturación

- más velocidad en el flujo de creación
- mejores borradores
- duplicación de facturas
- revisión visual final más sólida

### Prioridad 2. Fortalecer la cabina documental

- mejores plantillas
- historial persistente
- documentos reutilizables
- branding más potente

### Prioridad 3. Cerrar huecos de producto

- onboarding
- ayudas de instalación privada más claras
- estados vacíos y ayudas
- UX más consistente entre escritorio y móvil

### Prioridad 4. Endurecer la base técnica

- tests
- observabilidad
- scripts de setup
- despliegue más formal

## 10. Cómo se puede contribuir mejor

Las contribuciones más valiosas ahora mismo son:

- mejoras de UI y UX realmente útiles
- refactorizaciones con impacto claro
- mejoras de documentación
- endurecimiento técnico
- plantillas documentales mejores
- mejoras reales del flujo de facturación

No aporta tanto valor en esta fase:

- añadir muchas funciones sin cerrar las actuales
- introducir complejidad arquitectónica por adelantado
- reescribir módulos estables sin un beneficio claro

## 11. Resumen honesto

FacturaIA ya es una base potente y enseñable.

No es todavía el producto final.

Lo importante es que la dirección está clara:

- software open source
- útil para autónomos españoles
- centrado en facturación y documentación real
- construido de forma visible y explicable

El trabajo pendiente no es menor, pero tampoco es humo. Hay una base de verdad sobre la que seguir construyendo.
