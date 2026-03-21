# Prompt 03 · Núcleo Local Con SQLite

## Prompt

Quiero que construyas el núcleo local de FacturaIA con persistencia SQLite para instalaciones privadas.

### Objetivo

Crear una base local fiable para:

- usuario
- perfil fiscal
- clientes
- facturas
- cobros
- recordatorios
- auditoría
- feedback

### Implementa

- `lib/local-db.ts`
- `lib/local-core.ts`
- `lib/local-repositories/*`
- inicialización automática de base
- tablas mínimas para núcleo
- helpers de lectura y escritura por usuario
- soporte de `FACTURAIA_DATA_DIR`

### Enfoque

- SQLite como fuente real del modo local
- si mantienes compatibilidad con snapshot, trátala como transición, no como verdad principal
- prepara la estructura para backups y restore
- usa índices básicos donde aporten valor

### Requisitos de seguridad

- no guardar secretos en claro en el código
- bloquear arranque protegido si faltan secretos críticos en producción
- preparar el terreno para cifrado opcional

### Entregables

- núcleo local arrancable
- persistencia por usuario
- repositorios básicos
- tipos y modelos claros

### Criterios de aceptación

- crear perfil y factura sobrevive a reinicio
- el sistema no depende de Supabase para el núcleo local
- `lint`, `typecheck` y tests mínimos del núcleo verdes
