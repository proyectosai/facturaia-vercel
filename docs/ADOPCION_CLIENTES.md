# Adopción para Clientes

Esta guía resume qué partes de FacturaIA conviene activar hoy en una instalación real y cuáles deben tratarse con más prudencia.

No pretende vender todas las pantallas como si estuvieran igual de maduras. Pretende ayudar a instalar con criterio.

## Regla simple

- `Usar ya`: razonable para una instalación privada prudente.
- `Usar con piloto`: útil, pero conviene validarlo antes con datos de prueba.
- `No activar todavía`: mejor esperar o dejarlo fuera de la instalación inicial.

## Tabla de adopción

| Área | Estado | Recomendación | Comentario |
| --- | --- | --- | --- |
| Perfil fiscal | Listo | `Usar ya` | Base del sistema. |
| Facturas | Listo | `Usar ya` | Núcleo principal del producto. |
| PDF y factura pública | Listo | `Usar ya` | Flujo estable dentro del núcleo. |
| Correo saliente | Listo | `Usar ya` | Útil desde el primer despliegue. |
| Backups locales | Listo | `Usar ya` | Imprescindible en cualquier instalación. |
| Cobros y vencimientos | Listo | `Usar ya` | Ya forma parte del flujo operativo base. |
| Auditoría local | Listo | `Usar ya` | Muy recomendable en instalaciones reales. |
| Presupuestos y albaranes | Piloto | `Usar con piloto` | Aporta valor, pero conviene probar el ciclo completo. |
| Firma documental | Piloto | `Usar con piloto` | Funciona, pero no debe venderse como firma avanzada cerrada. |
| CRM ligero | Piloto | `Usar con piloto` | Útil, aunque todavía no es un CRM profundo. |
| Estudio documental local | Piloto | `Usar con piloto` | Ya existe, pero no debe venderse como memoria multi-año. |
| Correo entrante IMAP | Piloto | `Usar con piloto` | Validar con cuentas de prueba antes de depender de él. |
| Banca CSV | Piloto | `Usar con piloto` | Bien para conciliación controlada, no como automatización cerrada. |
| Mensajería WhatsApp / Telegram | Piloto | `Usar con piloto` | Mejor activarla solo si hay una necesidad clara. |
| Backups remotos WebDAV / Nextcloud | Piloto | `Usar con piloto` | Valioso, pero con prueba previa de restore. |
| OCR de gastos | Experimental | `No activar todavía` | Requiere demasiada revisión manual. |
| Facturae / VeriFactu | Experimental | `No activar todavía` | No equivale aún a cumplimiento fiscal cerrado. |
| Memoria local LLM multi-año | Documentado | `No activar todavía` | Arquitectura propuesta, no producto entregado. |
| RAG persistente completo | Documentado | `No activar todavía` | Sigue fuera del producto real actual. |

## Instalación recomendada por fases

### Fase 1

- perfil fiscal
- facturas
- correo saliente
- backups locales
- cobros

### Fase 2

- presupuestos
- firma documental
- CRM ligero

### Fase 3

- banca CSV
- correo entrante
- mensajería
- backups remotos

### Fase 4

- OCR
- Facturae / VeriFactu
- automatizaciones más agresivas

## Qué decir a un cliente sin engañarle

- FacturaIA ya sirve para una instalación privada prudente centrada en facturas, PDF, correo saliente, backups y cobros.
- Hay módulos adicionales valiosos, pero no todos deben activarse desde el primer día.
- La parte de IA local ya existe, pero la memoria/RAG completa sigue en fase de arquitectura.
- Facturae / VeriFactu todavía no debe venderse como cumplimiento cerrado.

## Perfil de cliente recomendado hoy

### Encaja bien

- autónomo técnico
- despacho pequeño con instalación privada controlada
- empresa que quiere empezar por núcleo local y crecer por fases

### Encaja con acompañamiento

- autónomo no técnico con ayuda de instalación
- despacho pequeño que quiere usar firma, banca o correo entrante

### No es el mejor escenario todavía

- despliegue multiusuario serio
- producto SaaS generalista
- operación fiscal cerrada con promesa de tranquilidad total
