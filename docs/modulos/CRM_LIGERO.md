# CRM ligero

## Objetivo

Este módulo añade una ficha central de cliente o proveedor para no tener la información repartida entre facturas, presupuestos, correo, mensajería y gastos.

No pretende ser un CRM corporativo. La idea es ofrecer una vista operativa, sencilla y útil para una instalación privada.

## Qué incluye en esta primera entrega

- ficha manual de cliente o proveedor
- prioridad, estado, etiquetas y notas internas
- detección automática de contactos a partir de actividad ya existente
- timeline básica de actividad cruzando:
  - facturas
  - presupuestos y albaranes
  - mensajería opcional
  - correo entrante
  - gastos
- edición de la ficha desde la propia pantalla

## Ruta

- `/clientes`

## Requisitos

- Supabase configurado
- migración `202603201520_add_clients_module.sql` aplicada

Opcional, para sacar más partido:

- módulo de mensajería conectado
- correo entrante por IMAP
- módulo de gastos activo
- presupuestos y albaranes activos

## Instalación paso a paso

1. Aplica la migración:

```bash
supabase db push
```

o ejecuta manualmente:

- `supabase/migrations/202603201520_add_clients_module.sql`

2. Reinicia FacturaIA.

3. Abre `/clientes`.

4. Crea una ficha manual o usa una sugerencia detectada.

5. Revisa que la ficha muestre actividad relacionada.

## Cómo funciona la detección automática

FacturaIA intenta agrupar actividad usando los datos que ya existan:

- email
- teléfono
- NIF
- nombre o razón social

Si ya existe una ficha guardada que coincide con esos datos, la sugerencia no se vuelve a mostrar.

## Limitaciones actuales

- el enlace entre ficha y actividad es heurístico, no una relación fuerte en base de datos
- no hay tareas, recordatorios ni pipeline comercial
- las notas son un único bloque de texto, no un historial de comentarios
- no hay enlace automático al crear nuevas facturas o presupuestos

## Siguientes mejoras previstas

- vinculación automática de ficha al emitir documentos
- notas con historial
- recordatorios y seguimiento
- filtros por clientes sin respuesta o sin cobro
- mejor deduplicación entre contactos detectados
