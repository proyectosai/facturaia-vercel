# Módulo de mensajería: WhatsApp Business y Telegram

## Qué hace

Este módulo crea una bandeja unificada para recibir mensajes entrantes del canal oficial de WhatsApp Business y del bot de Telegram del negocio.

Permite:

- ordenar por fecha
- ordenar por urgencia
- ordenar por nombre y apellidos
- marcar conversaciones como leídas
- fijar urgencia manual

## Qué no hace

- no accede al WhatsApp personal del cliente
- no lee Telegram fuera del bot configurado
- no responde todavía desde la propia app

## Ruta de uso

- `/messages`

## Requisitos

- `NEXT_PUBLIC_APP_URL` pública y correcta
- Supabase configurado
- despliegue accesible por HTTPS si usarás webhooks reales

## Instalación de WhatsApp Business

1. Abre `/messages`.
2. Copia la `Webhook URL`.
3. Copia el `Verify token`.
4. Ve a la configuración de tu app de Meta / WhatsApp Business Platform.
5. Pega la URL y el token.
6. Completa la verificación.
7. Envía un mensaje de prueba al número Business.

## Instalación de Telegram

1. Crea un bot con `@BotFather`.
2. Abre `/messages`.
3. Copia la `Webhook URL` de Telegram.
4. Define el webhook del bot apuntando a esa URL.
5. Envía un mensaje de prueba al bot.

## Datos que se guardan

- conexión del canal
- hilos por cliente
- mensajes recibidos
- urgencia detectada
- alias, nombre, apellidos o teléfono cuando existan

## Diagnóstico rápido

- si no llegan mensajes, revisa `NEXT_PUBLIC_APP_URL`
- si WhatsApp no valida, revisa el `verify token`
- si Telegram no entrega mensajes, revisa la URL pública del webhook
- si la app está en modo demo, la bandeja solo enseña datos simulados
