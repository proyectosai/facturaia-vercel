# Prompt 99 · Prompt Maestro

## Uso

Este archivo sirve si quieres pedir a un agente que reconstruya el repo entero con una sola instrucción. Aun así, la vía recomendada sigue siendo usar los prompts `00` a `12` por fases.

## Prompt

Quiero que reconstruyas desde cero una aplicación llamada **FacturaIA** siguiendo estas reglas:

- Next.js 15 + React 19 + TypeScript + Tailwind
- app en español para autónomos y pequeños negocios españoles
- instalación privada local-first
- núcleo útil primero: perfil fiscal, facturas, PDF, factura pública, cobros, correo saliente, backups y auditoría
- módulos avanzados por fases: clientes, gastos, presupuestos, firmas, banca, IMAP, mensajería, IA documental, renta
- documentación honesta de madurez
- CI seria y e2e real

### Requisitos no negociables

- el núcleo debe poder funcionar sin Supabase en modo local
- usa SQLite para persistencia local
- protege sesiones locales
- añade backup/restore
- deja un catálogo de módulos con estado real
- integra LM Studio por HTTP para IA local
- no presentes memoria/RAG multi-año como entregado si no está implementado
- deja el producto usable en móvil para el núcleo, no para todo el backoffice

### Entrega esperada

1. estructura de repo limpia
2. autenticación local
3. persistencia local SQLite
4. facturación completa del núcleo
5. PDF, factura pública y cobros
6. backups, auditoría y seguridad local
7. módulos por fases
8. IA local útil y honesta
9. documentación honesta
10. QA y CI útiles

### Obligaciones de calidad

- no prometas cumplimiento fiscal cerrado si no está hecho
- no generes copy de marketing engañosa
- no dejes rutas rotas en móvil
- no des por bueno un producto local sin backup/restore probado
- deja siempre claro:
  - qué está listo
  - qué está en piloto
  - qué está solo documentado
