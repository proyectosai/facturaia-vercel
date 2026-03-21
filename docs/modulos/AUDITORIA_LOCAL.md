# Auditoría Local

## Objetivo

Este módulo deja trazabilidad operativa dentro de una instalación privada de FacturaIA.

No está pensado como SIEM ni como cumplimiento avanzado. Está pensado para un despacho o autónomo que necesita responder preguntas prácticas:

- qué factura se creó o cambió
- quién marcó un cobro como pagado o lo reabrió
- qué solicitud de firma se envió, firmó o revocó
- qué importación o conciliación bancaria alteró un expediente
- cuándo se restauró una copia de seguridad

## Dónde se usa

- pantalla interna: `/auditoria`
- export JSON: `/api/auditoria/export`

## Qué registra hoy

- acceso local:
  - login correcto
  - login fallido
  - bloqueo temporal
  - logout
- perfil:
  - alta y actualización del perfil fiscal
- facturas:
  - creación de factura
- cobros:
  - marcar cobrada
  - reabrir
  - sincronización de pago desde conciliación bancaria
- CRM:
  - alta de ficha
  - actualización de ficha
- gastos:
  - alta de gasto
  - marcar revisado
  - reabrir revisión
- firmas:
  - creación de solicitud
  - revocación
  - firma o rechazo público
- banca:
  - importación de movimientos
  - conciliación manual
- mensajería:
  - creación y actualización de conexiones
  - creación de hilo
  - recepción de mensajes entrantes
  - marcar leído
  - fijar y desbloquear urgencia
- backups:
  - restauración completada

## Qué exporta

El JSON de auditoría incluye:

- usuario exportado
- política de seguridad local
- estado `ready / issues`
- lista completa de eventos

Cada evento incluye:

- actor
- origen
- acción
- entidad afectada
- snapshot `antes`
- snapshot `después`
- contexto adicional
- fecha

## Recomendación operativa

Para una instalación de despacho:

1. revisa `/auditoria` después de restaurar una copia
2. exporta el log si investigas una incidencia
3. conserva el JSON junto con la copia de seguridad cuando el caso lo merezca

## Límite actual

La auditoría local es operativa, no forense.

No sustituye:

- control multiusuario avanzado
- firma cualificada
- inmutabilidad legal tipo ledger fiscal
- correlación entre instalaciones distintas
