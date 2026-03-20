# Sistema de Módulos

FacturaIA debe instalarse y mantenerse por capas. No es buena idea activar todo el primer día.

La forma correcta de leer el producto es esta:

1. **núcleo local**
2. **módulos de operativa diaria**
3. **módulos de integración**
4. **módulos delicados o experimentales**

Este documento explica qué significa cada módulo, qué nivel de madurez tiene y cómo encaja en una instalación privada para autónomos y pequeños despachos.

## Qué es un módulo en FacturaIA

Un módulo es una pieza opcional de la app con:

- ruta propia dentro del panel
- documentación específica
- requisitos de instalación
- nivel de madurez
- compatibilidad real con modo local

La regla práctica es esta:

- no instales todo el primer día
- instala primero lo que vas a usar cada semana
- deja para más tarde lo que requiere URL pública, canales externos o revisión fiscal intensa

## Cómo leer el catálogo

### Estado funcional

- `Activo`: ya existe y cubre su flujo principal.
- `Parcial`: existe, pero aún no cierra toda la operativa.
- `Siguiente`: está diseñado para la siguiente iteración.
- `Planificado`: todavía no está implementado.

### Madurez

- `Uso diario`: razonable para trabajo habitual si ya has validado tu instalación.
- `Piloto`: sirve para probar con cuidado.
- `Experimental`: no debe convertirse en una pieza crítica sin revisión manual.

### Compatibilidad con instalación local

- `Local nativo`: puede vivir dentro del ordenador o servidor privado del cliente sin depender de Supabase para su operativa principal.
- `Local asistido`: la app corre en local, pero el módulo necesita una URL pública, un proveedor externo o un canal adicional para ser realmente útil.
- `Local pendiente`: la pantalla existe, pero el flujo local todavía no está cerrado para una instalación privada pura.

## Orden recomendado para un autónomo no técnico

### Fase 1. Núcleo mínimo

- perfil fiscal
- nueva factura
- listado de facturas
- backups locales
- correo saliente
- cobros y vencimientos

### Fase 2. Operativa diaria ampliada

- clientes
- presupuestos y albaranes
- firma documental básica
- OCR de gastos

### Fase 3. Integraciones opcionales

- correo entrante
- mensajería WhatsApp / Telegram
- backups remotos
- asistente IRPF / Renta

### Fase 4. Solo si realmente lo necesitas

- conciliación bancaria
- Facturae / VeriFactu

## Matriz real de módulos

| Módulo | Ruta | Madurez | Compatibilidad local | Dependencias externas | Cuándo activarlo |
| --- | --- | --- | --- | --- | --- |
| Backups locales | `/backups` | Uso diario | Local nativo | No | Desde el primer día |
| Correo saliente | `/mail` | Uso diario | Local asistido | SMTP o Resend | En cuanto quieras enviar facturas reales |
| Mensajería unificada | `/messages` | Piloto | Local asistido | WhatsApp Business o Telegram + webhook público | Solo si el despacho ya atiende por esos canales |
| Backups remotos | `/backups` | Piloto | Local asistido | WebDAV / Nextcloud | Después de validar backups locales |
| Correo entrante | `/mail` | Piloto | Local asistido | IMAP | Cuando quieras centralizar seguimiento por email |
| Presupuestos y albaranes | `/presupuestos` | Piloto | Local nativo | No | Cuando ya facturas con soltura y necesitas pre-facturación |
| OCR de gastos | `/gastos` | Experimental | Local nativo | No | Cuando aceptes revisar cada gasto manualmente |
| CRM ligero | `/clientes` | Piloto | Local nativo | No | Cuando ya tengas clientes y quieras centralizar contexto |
| Firma documental | `/firmas` | Piloto | Local asistido | URL pública para compartir el enlace | Cuando uses presupuestos o albaranes con aceptación externa |
| Conciliación bancaria | `/banca` | Piloto | Local pendiente | CSV del banco | No como primera instalación local |
| Facturae / VeriFactu | `/facturae` | Experimental | Local nativo | No para el borrador XML; sí para cumplimiento real posterior | Solo si necesitas preparar borradores XML y revisar normativa |
| Asistente IRPF / Renta | `/renta` | Piloto | Local nativo | LM Studio recomendado, aunque tiene modo guiado | Cuando el despacho quiera apoyo documental y fiscal |

## Qué módulos viajan bien en backup local

En modo local privado, el backup JSON cubre bien estas piezas:

- perfil fiscal
- clientes
- feedback
- facturas
- recordatorios
- presupuestos y albaranes
- firmas documentales
- gastos

En cambio, estas piezas todavía requieren más consolidación o dependen de servicios o canales externos:

- conciliación bancaria persistente en local
- correo entrante completo
- mensajería con conversaciones reales
- historial operativo completo de integraciones externas

## Regla de producto para instalar módulos

Antes de activar un módulo nuevo, comprueba estas cuatro cosas:

1. que el núcleo ya funciona sin errores ambiguos
2. que tienes un backup local reciente
3. que el módulo tiene documentación propia
4. que entiendes si es `uso diario`, `piloto` o `experimental`

## Qué debe mirar el programador antes de declarar un módulo “listo”

- carga en modo local sin variables públicas de Supabase si se declara local
- persistencia real de los datos
- inclusión en backup y restore cuando proceda
- al menos una prueba unitaria o de integración
- una prueba manual reproducible
- documentación clara en `docs/modulos/`

## Documentos relacionados

- [Índice de módulos](./modulos/README.md)
- [DFD y plan técnico modular](./MODULOS_DFD.md)
- [Estado real del proyecto](./ESTADO_REAL.md)
- [Calidad local](./CALIDAD_LOCAL.md)
