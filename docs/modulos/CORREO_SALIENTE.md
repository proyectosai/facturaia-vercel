# Módulo de correo saliente

## Qué existe ya

FacturaIA ya puede enviar facturas por email mediante Resend desde el historial de facturas.

## Ruta relacionada

- `/invoices`

## Requisitos

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

## Instalación

1. Configura `RESEND_API_KEY`.
2. Configura `RESEND_FROM_EMAIL`.
3. Verifica el remitente o dominio en Resend.
4. Abre el historial de facturas y prueba el envío.

## Estado actual

- envío saliente implementado
- sin bandeja de entrada
- sin SMTP alternativo todavía

## Próxima evolución natural

- añadir SMTP como alternativa a Resend
- enlazar correo saliente con CRM ligero y documentos
