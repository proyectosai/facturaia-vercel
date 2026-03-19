# Módulo siguiente: correo entrante

## Objetivo

Dar a FacturaIA una bandeja de entrada asociable a clientes, facturas y documentos.

## Por qué es el siguiente paso natural

El correo saliente ya está resuelto para uso privado. Lo siguiente lógico es poder:

- recibir correos
- ordenarlos por cliente
- enlazarlos con facturas y documentos
- preparar una base para CRM ligero

## Qué debería incluir

- importación por IMAP o reenvío entrante
- ficha de conversación por cliente
- asociación con facturas y propuestas
- clasificación básica por asunto, remitente y fecha

## Estado actual

Todavía no está implementado.

## Dependencias previas

- correo saliente estable
- modelo de cliente más consolidado
- persistencia de hilos y mensajes similar a mensajería
