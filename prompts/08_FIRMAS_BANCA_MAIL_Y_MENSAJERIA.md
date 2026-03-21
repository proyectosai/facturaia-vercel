# Prompt 08 · Firmas, Banca, Mail Y Mensajería

## Prompt

Quiero que añadas los módulos operativos de segunda fase, dejando clara su madurez.

### Implementa

- firma documental por enlace público
- importación bancaria CSV y conciliación básica
- correo saliente
- correo entrante IMAP manual
- mensajería por webhook

### Archivos esperados

- `app/(protected)/firmas/page.tsx`
- `app/firma/[token]/page.tsx`
- `app/(protected)/banca/page.tsx`
- `app/(protected)/mail/page.tsx`
- `app/(protected)/messages/page.tsx`
- APIs de integraciones necesarias

### Condiciones

- firma documental solo como evidencia operativa básica
- banca como conciliación asistida, no automática mágica
- IMAP y mensajería marcados como piloto
- correo saliente sí puede estar en “uso diario prudente”

### Criterios de aceptación

- se puede enviar un documento a firma y aceptar por enlace
- se puede importar un CSV bancario
- se puede enviar correo saliente de prueba
- IMAP y mensajería quedan visibles como módulos por fases
