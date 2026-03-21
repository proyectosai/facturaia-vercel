# Prompts Educativos

Esta carpeta reúne una ruta completa para reconstruir FacturaIA desde cero.

La idea no es vender magia, sino dejar un material útil para:

- aprender cómo se ha montado el repo
- rehacer una versión equivalente por fases
- usar cada prompt con un agente de código o como guía manual de implementación

## Cómo usar esta carpeta

1. Empieza por [00_PRINCIPIOS.md](/Users/c/Desktop/carpeta%20sin%20ti%CC%81tulo%202/facturaia-app/prompts/00_PRINCIPIOS.md).
2. Sigue el orden numérico.
3. No saltes a módulos avanzados si el núcleo todavía no está sólido.
4. Después de cada fase, valida con `lint`, `typecheck` y tests acordes al alcance.
5. No prometas features futuras como si ya estuvieran entregadas.

Prompts especializados:

- [Prompts de agentes](./agents/README.md)

## Orden recomendado

- [00_PRINCIPIOS.md](/Users/c/Desktop/carpeta%20sin%20ti%CC%81tulo%202/facturaia-app/prompts/00_PRINCIPIOS.md)
- [01_BOOTSTRAP_NEXT_UI.md](/Users/c/Desktop/carpeta%20sin%20ti%CC%81tulo%202/facturaia-app/prompts/01_BOOTSTRAP_NEXT_UI.md)
- [02_AUTENTICACION_Y_LAYOUT.md](/Users/c/Desktop/carpeta%20sin%20ti%CC%81tulo%202/facturaia-app/prompts/02_AUTENTICACION_Y_LAYOUT.md)
- [03_NUCLEO_LOCAL_SQLITE.md](/Users/c/Desktop/carpeta%20sin%20ti%CC%81tulo%202/facturaia-app/prompts/03_NUCLEO_LOCAL_SQLITE.md)
- [04_PERFIL_Y_FACTURACION.md](/Users/c/Desktop/carpeta%20sin%20ti%CC%81tulo%202/facturaia-app/prompts/04_PERFIL_Y_FACTURACION.md)
- [05_PDF_FACTURA_PUBLICA_Y_COBROS.md](/Users/c/Desktop/carpeta%20sin%20ti%CC%81tulo%202/facturaia-app/prompts/05_PDF_FACTURA_PUBLICA_Y_COBROS.md)
- [06_BACKUPS_AUDITORIA_Y_SEGURIDAD.md](/Users/c/Desktop/carpeta%20sin%20ti%CC%81tulo%202/facturaia-app/prompts/06_BACKUPS_AUDITORIA_Y_SEGURIDAD.md)
- [07_CLIENTES_GASTOS_Y_DOCUMENTOS.md](/Users/c/Desktop/carpeta%20sin%20ti%CC%81tulo%202/facturaia-app/prompts/07_CLIENTES_GASTOS_Y_DOCUMENTOS.md)
- [08_FIRMAS_BANCA_MAIL_Y_MENSAJERIA.md](/Users/c/Desktop/carpeta%20sin%20ti%CC%81tulo%202/facturaia-app/prompts/08_FIRMAS_BANCA_MAIL_Y_MENSAJERIA.md)
- [09_IA_DOCUMENTAL_Y_RENTA.md](/Users/c/Desktop/carpeta%20sin%20ti%CC%81tulo%202/facturaia-app/prompts/09_IA_DOCUMENTAL_Y_RENTA.md)
- [10_MODULOS_ADOPCION_Y_DOCUMENTACION.md](/Users/c/Desktop/carpeta%20sin%20ti%CC%81tulo%202/facturaia-app/prompts/10_MODULOS_ADOPCION_Y_DOCUMENTACION.md)
- [11_QA_CI_Y_E2E.md](/Users/c/Desktop/carpeta%20sin%20ti%CC%81tulo%202/facturaia-app/prompts/11_QA_CI_Y_E2E.md)
- [12_RESPONSIVE_Y_MOVIL_UTIL.md](/Users/c/Desktop/carpeta%20sin%20ti%CC%81tulo%202/facturaia-app/prompts/12_RESPONSIVE_Y_MOVIL_UTIL.md)
- [99_PROMPT_MAESTRO.md](/Users/c/Desktop/carpeta%20sin%20ti%CC%81tulo%202/facturaia-app/prompts/99_PROMPT_MAESTRO.md)

## Qué reconstruyen estos prompts

Estos prompts apuntan al estado real actual del proyecto:

- núcleo local usable
- instalación privada
- facturas, PDF, cobros, correo saliente y backups
- módulos por fases
- IA local útil, pero no memoria/RAG multi-año cerrada
- documentación honesta y QA razonable

## Qué no debes leer aquí como promesa cerrada

- cumplimiento fiscal completo de VeriFactu
- Facturae firmada y cerrada para producción fiscal sin matices
- memoria multi-año con embeddings persistentes ya entregada
- experiencia móvil perfecta en todos los módulos

La lectura correcta es: esto te permite recrear una base seria y honesta, no una fantasía de marketing.
