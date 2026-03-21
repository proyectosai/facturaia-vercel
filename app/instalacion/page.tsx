import Link from "next/link";
import {
  ArrowRight,
  Database,
  HardDrive,
  LockKeyhole,
  ServerCog,
  Sparkles,
  TerminalSquare,
} from "lucide-react";

import { isLocalMode } from "@/lib/demo";
import { getLocalSecurityReadiness } from "@/lib/local-core";
import { RouteToast } from "@/components/route-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const setupSteps = [
  {
    title: "1. Empieza por una demo simple",
    description:
      "Si solo quieres ver cómo funciona, usa Docker en modo demo y evita tocar Supabase, IMAP o LM Studio el primer día.",
    icon: TerminalSquare,
  },
  {
    title: "2. Monta primero el núcleo",
    description:
      "Perfil fiscal, nueva factura, historial, correo saliente y backups locales. Eso ya te da una instalación útil sin abrumarte.",
    icon: LockKeyhole,
  },
  {
    title: "3. Activa módulos avanzados después",
    description:
      "Mensajería, IMAP, OCR, banca o Facturae no deberían ser lo primero. Instálalos solo cuando el núcleo ya te funcione bien.",
    icon: ServerCog,
  },
];

function getSingleSearchParam(value: string | string[] | undefined, fallback = "") {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }

  return value ?? fallback;
}

export default async function InstalacionPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const error = getSingleSearchParam(params.error);
  const localMode = isLocalMode();
  const localSecurity = localMode ? getLocalSecurityReadiness() : { ready: true, issues: [] };

  return (
    <div className="space-y-8">
      <RouteToast type="error" message={error ? decodeURIComponent(error) : null} />

      <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr] xl:items-end">
        <div className="max-w-4xl space-y-4">
          <p className="section-kicker">Instalación privada</p>
          <h1 className="font-display text-5xl leading-none tracking-tight text-foreground">
            FacturaIA ya no está pensada como producto de pago, sino como herramienta privada y autogestionada.
          </h1>
          <p className="text-lg leading-8 text-muted-foreground">
            La idea ahora es sencilla: que cada autónomo pueda instalar FacturaIA en su
            ordenador o en el servidor que prefiera, activar solo las integraciones que le
            interesen y trabajar sin planes, pasarela de pago integrada ni dependencias comerciales obligatorias.
          </p>

          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/primeros-pasos">Abrir asistente</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/modules">Ver módulos</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="https://github.com/proyectosai/facturaia">
                Ver repositorio
              </Link>
            </Button>
          </div>
        </div>

        <Card className="overflow-hidden bg-[linear-gradient(150deg,rgba(255,255,255,0.95),rgba(232,246,242,0.88))]">
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-[24px] bg-white/80 p-4">
              <p className="text-sm text-muted-foreground">Modelo</p>
              <p className="mt-2 font-display text-3xl text-foreground">Privado</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Sin monetización integrada.
              </p>
            </div>
            <div className="rounded-[24px] bg-white/80 p-4">
              <p className="text-sm text-muted-foreground">Despliegue</p>
              <p className="mt-2 font-display text-3xl text-foreground">Libre</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Tu equipo o tu servidor.
              </p>
            </div>
            <div className="rounded-[24px] bg-white/80 p-4">
              <p className="text-sm text-muted-foreground">Control</p>
              <p className="mt-2 font-display text-3xl text-foreground">Tuyo</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Configuras solo lo necesario.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {localMode && !localSecurity.ready ? (
        <Card className="border-[color:rgba(180,68,54,0.24)] bg-[linear-gradient(145deg,rgba(255,249,247,0.98),rgba(255,238,233,0.92))]">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Bloqueo preventivo</Badge>
              <Badge
                variant="secondary"
                className="bg-[color:rgba(180,68,54,0.14)] text-[color:#8f2f2f]"
              >
                Seguridad pendiente
              </Badge>
            </div>
            <CardTitle>La instalación local no puede operar cerrada todavía</CardTitle>
            <CardDescription>
              FacturaIA ha pasado a fail-closed en producción: si faltan secretos o una
              passphrase obligatoria para cifrado, la app bloquea acceso protegido hasta corregirlo.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {localSecurity.issues.map((issue) => (
              <div key={issue} className="rounded-[24px] bg-white/85 p-4 text-sm leading-7 text-[color:#8f2f2f]">
                {issue}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-3">
        {setupSteps.map((step) => {
          const Icon = step.icon;

          return (
            <Card key={step.title}>
              <CardContent className="space-y-4">
                <div className="rounded-2xl bg-[color:var(--color-brand-soft)] p-3 text-[color:var(--color-brand)] w-fit">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-foreground">
                    {step.title}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle>Demo en 5 minutos</CardTitle>
            <CardDescription>
              Para mirar la interfaz y enseñar el producto sin tocar servicios externos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[24px] bg-[color:var(--color-panel)] p-4">
              <pre className="overflow-x-auto text-sm leading-7 text-foreground">
                <code>docker compose -f compose.demo.yml up --build</code>
              </pre>
            </div>
            <p className="text-sm leading-7 text-muted-foreground">
              Esto levanta FacturaIA en modo demo con datos internos, sin Supabase
              ni correo real. Es el camino correcto si primero quieres ver el producto.
            </p>
          </CardContent>
        </Card>

        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle>Instalación básica en 15 minutos</CardTitle>
            <CardDescription>
              La forma más sensata de empezar una instalación privada real.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[24px] bg-[color:var(--color-panel)] p-4">
              <pre className="overflow-x-auto text-sm leading-7 text-foreground">
                <code>{`cp .env.example .env.local
docker compose -f compose.app.yml up --build`}</code>
              </pre>
            </div>
            <p className="text-sm leading-7 text-muted-foreground">
              Primero configura solo `NEXT_PUBLIC_APP_URL`, Supabase y correo saliente.
              Todo lo demás puede esperar.
            </p>
          </CardContent>
        </Card>

        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle>Lee esto antes de instalar módulos</CardTitle>
            <CardDescription>
              La app ya tiene bastante superficie. No conviene activarlo todo a la vez.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-7 text-muted-foreground">
              Empieza por facturación, correo saliente, backups y cobros. Cuando eso
              funcione bien, añade banca, OCR, mensajería o Facturae si de verdad te aportan valor.
            </p>
            <Button variant="outline" asChild>
              <Link href="/modules">
                Ver estado real de módulos
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <Card className="overflow-hidden bg-[linear-gradient(160deg,rgba(255,255,255,0.95),rgba(236,247,243,0.85))]">
        <CardHeader>
          <CardTitle>Lo que sí conviene instalar primero</CardTitle>
          <CardDescription>
            Si eres autónomo y no quieres pelearte con la herramienta, este es el orden correcto.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          {[
            "1. Perfil fiscal del emisor.",
            "2. Nueva factura y listado de facturas.",
            "3. Correo saliente para enviar PDFs.",
            "4. Backups locales y, si puedes, una primera restauración de prueba.",
            "5. Cobros y vencimientos.",
            "6. Solo después: banca, OCR, CRM, mensajería, firma o Facturae.",
          ].map((item) => (
            <div
              key={item}
              className="rounded-[24px] bg-white/80 p-4 text-sm leading-7 text-muted-foreground"
            >
              {item}
            </div>
          ))}
        </CardContent>
      </Card>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle>Integraciones opcionales</CardTitle>
            <CardDescription>
              Puedes montar un entorno mínimo o uno más completo según tu necesidad.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              {
                title: "Supabase",
                description:
                  "Auth, base de datos y storage para logos y persistencia.",
                icon: Database,
              },
              {
                title: "LM Studio",
                description:
                  "IA local para descripciones, propuestas, presupuestos y contratos.",
                icon: Sparkles,
              },
              {
                title: "Mensajería opcional",
                description:
                  "WhatsApp Business y Telegram por webhook si quieres ordenar conversaciones.",
                icon: HardDrive,
              },
              {
                title: "Correo saliente",
                description:
                  "SMTP o Resend para enviar facturas y correos de prueba desde tu instalación.",
                icon: LockKeyhole,
              },
              {
                title: "Correo entrante",
                description:
                  "IMAP para importar correos y ordenarlos dentro de la propia app.",
                icon: Sparkles,
              },
              {
                title: "Pre-facturación",
                description:
                  "Presupuestos y albaranes para trabajar el paso previo antes de emitir la factura final.",
                icon: Database,
              },
              {
                title: "CRM ligero",
                description:
                  "Fichas de cliente y proveedor con contexto cruzado desde facturas, correo, chats y gastos.",
                icon: Database,
              },
              {
                title: "Firma documental",
                description:
                  "Aceptación de presupuestos y firma básica de albaranes mediante enlaces públicos.",
                icon: LockKeyhole,
              },
              {
                title: "Gastos y OCR asistido",
                description:
                  "Importa justificantes y revísalos dentro de la app sin depender de servicios externos.",
                icon: HardDrive,
              },
              {
                title: "Conciliación bancaria",
                description:
                  "Carga extractos CSV y cruza cada movimiento con facturas emitidas o gastos ya revisados.",
                icon: Database,
              },
              {
                title: "Facturae / VeriFactu",
                description:
                  "Prepara XML Facturae 3.2.2 sin firma y revisa normativa oficial antes de dar un salto mayor en cumplimiento.",
                icon: LockKeyhole,
              },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="rounded-[26px] bg-[color:var(--color-panel)] p-5"
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-white p-3 text-[color:var(--color-brand)]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{item.title}</p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rutas recomendadas</CardTitle>
            <CardDescription>
              Si vas a usarlo como herramienta privada, este es el recorrido más natural.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              {
                title: "1. Configura tu emisor",
                description: "Rellena nombre, NIF, dirección y logo en tu perfil.",
                href: "/profile",
                label: "Abrir perfil",
              },
              {
                title: "2. Prepara un presupuesto o albarán",
                description:
                  "Valida el flujo previo a facturación y conviértelo en factura cuando toque.",
                href: "/presupuestos",
                label: "Abrir pre-facturación",
              },
              {
                title: "3. Emite una primera factura",
                description:
                  "Verifica el flujo base con cliente, líneas, PDF y envío por email.",
                href: "/new-invoice",
                label: "Nueva factura",
              },
              {
                title: "4. Revisa correo y backups",
                description:
                  "Configura el envío saliente y prepara copias remotas antes de usarlo a diario.",
                href: "/mail",
                label: "Abrir correo",
              },
              {
                title: "5. Importa tus primeros gastos",
                description:
                  "Valida el circuito de justificantes y deja revisado al menos un gasto real o de prueba.",
                href: "/gastos",
                label: "Abrir gastos",
              },
              {
                title: "6. Importa un extracto bancario",
                description:
                  "Carga un CSV corto desde tu banco y valida las primeras sugerencias de conciliación manual.",
                href: "/banca",
                label: "Abrir banca",
              },
              {
                title: "7. Crea tus primeras fichas de cliente",
                description:
                  "Centraliza datos de contacto y deja notas internas antes de trabajar a diario con documentos y mensajes.",
                href: "/clientes",
                label: "Abrir CRM",
              },
              {
                title: "8. Valida una firma documental",
                description:
                  "Genera un enlace de aceptación desde un presupuesto o albarán y comprueba la respuesta en tu entorno.",
                href: "/firmas",
                label: "Abrir firmas",
              },
              {
                title: "9. Revisa el exportador Facturae",
                description:
                  "Descarga un XML de prueba y contrástalo con la normativa oficial si vas a trabajar flujos estructurados.",
                href: "/facturae",
                label: "Abrir Facturae",
              },
              {
                title: "10. Activa documentos o mensajería",
                description:
                  "Añade IA local y bandeja de mensajes solo si de verdad te aportan valor.",
                href: "/documents-ai",
                label: "Abrir documentos",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-[26px] border border-white/60 bg-white/75 p-5"
              >
                <h3 className="text-xl font-semibold text-foreground">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {item.description}
                </p>
                <Button className="mt-4" variant="outline" asChild>
                  <Link href={item.href}>{item.label}</Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
