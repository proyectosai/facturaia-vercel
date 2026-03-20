# Despliegue demo en Vercel

## Objetivo

Esta guía sirve para publicar **una demo navegable** de FacturaIA en Vercel sin tocar Supabase, IMAP, SMTP o LM Studio reales.

No está pensada para uso fiscal real ni para trabajar con datos de empresa en producción. Para eso sigue siendo preferible una instalación privada en Node, Coolify o Hetzner.

## Variables mínimas

En el proyecto de Vercel configura solo estas variables:

```env
NEXT_PUBLIC_APP_URL=https://tu-demo.vercel.app
FACTURAIA_DEMO_MODE=1
```

Con esas dos variables:

- el middleware no intentará inicializar Supabase
- el panel funcionará con datos demo internos
- podrás enseñar el flujo completo de la interfaz

## Qué no hace esta demo

- no autentica usuarios reales
- no guarda datos persistentes
- no envía correos reales
- no conecta IMAP real
- no ejecuta backups reales
- no usa la IA local real salvo que expongas el endpoint manualmente
- no debe presentarse como entorno de facturación productiva

## Pasos en Vercel

1. Importa el repositorio `proyectosai/facturaia-vercel`.
2. Framework: `Next.js`.
3. Root directory: deja la raíz del repo.
4. Añade las variables:

```env
NEXT_PUBLIC_APP_URL=https://tu-demo.vercel.app
FACTURAIA_DEMO_MODE=1
```

5. Despliega.

## Comprobación rápida

Después del despliegue, revisa:

1. `/`
2. `/login`
3. `/dashboard`
4. `/new-invoice`
5. `/invoices`
6. `/documents-ai`
7. `/modules`
8. `/system`

Si Vercel devuelve `MIDDLEWARE_INVOCATION_FAILED`, lo normal es que falte `FACTURAIA_DEMO_MODE=1` o que el despliegue se haya hecho con una build previa.

## Recomendación comercial

Para demos a empresas:

- usa Vercel solo como escaparate funcional
- recoge feedback desde `/feedback`
- si una empresa quiere probar con sus datos, crea un piloto privado fuera de Vercel
