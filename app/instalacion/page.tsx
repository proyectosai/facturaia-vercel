import Link from "next/link";
import {
  Database,
  HardDrive,
  LockKeyhole,
  ServerCog,
  Sparkles,
  TerminalSquare,
} from "lucide-react";

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
    title: "1. Clona y arranca",
    description:
      "Instala dependencias, copia el entorno de ejemplo y levanta la app en local con tu propio Node.js.",
    icon: TerminalSquare,
  },
  {
    title: "2. Conecta solo lo que quieras",
    description:
      "Supabase, SMTP o Resend, IMAP, LM Studio y mensajería son opcionales según tu forma de trabajar.",
    icon: LockKeyhole,
  },
  {
    title: "3. Despliega en tu entorno",
    description:
      "Puedes usar tu ordenador, un VPS o el servidor que prefieras. La idea es que el control sea tuyo.",
    icon: ServerCog,
  },
];

export default function InstalacionPage() {
  return (
    <div className="space-y-8">
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
              <Link href="/dashboard">Abrir panel</Link>
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
                title: "5. Activa documentos o mensajería",
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
