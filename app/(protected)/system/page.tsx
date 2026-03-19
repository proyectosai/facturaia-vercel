import Link from "next/link";
import {
  Bot,
  Database,
  HardDriveDownload,
  Mail,
  ServerCog,
  ShieldCheck,
  Smartphone,
} from "lucide-react";

import { isDemoMode } from "@/lib/demo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function getEnvironmentFlags() {
  return {
    demoMode: isDemoMode(),
    hasSupabase:
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
      Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    hasResend:
      Boolean(process.env.RESEND_API_KEY) && Boolean(process.env.RESEND_FROM_EMAIL),
    hasLocalAi:
      Boolean(process.env.LM_STUDIO_BASE_URL) && Boolean(process.env.LM_STUDIO_MODEL),
    appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    lmStudioBaseUrl: process.env.LM_STUDIO_BASE_URL || "No configurado",
    lmStudioModel: process.env.LM_STUDIO_MODEL || "No configurado",
  };
}

export default function SystemPage() {
  const env = getEnvironmentFlags();
  const checks = [
    {
      title: "Supabase",
      description: env.hasSupabase
        ? "Auth, base de datos y storage listos."
        : "Faltan variables de Supabase para usar persistencia real.",
      ready: env.hasSupabase,
      icon: Database,
    },
    {
      title: "LM Studio",
      description: env.hasLocalAi
        ? `IA local apuntando a ${env.lmStudioModel}.`
        : "Falta la URL o el modelo de LM Studio.",
      ready: env.hasLocalAi,
      icon: Bot,
    },
    {
      title: "Resend",
      description: env.hasResend
        ? "Correo saliente disponible para enviar facturas."
        : "El envío por email está desactivado hasta configurar Resend.",
      ready: env.hasResend,
      icon: Mail,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="max-w-4xl space-y-3">
        <p className="section-kicker">Sistema</p>
        <h1 className="font-display text-5xl leading-none tracking-tight text-foreground">
          Estado de tu instalación privada.
        </h1>
        <p className="text-lg leading-8 text-muted-foreground">
          Esta pantalla resume qué piezas del entorno self-hosted están listas y
          cuáles conviene completar antes de usar FacturaIA a diario.
        </p>
      </div>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="overflow-hidden bg-[linear-gradient(150deg,rgba(255,255,255,0.95),rgba(232,246,242,0.88))]">
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="success">Uso privado</Badge>
              {env.demoMode ? <Badge variant="secondary">Modo demo</Badge> : null}
            </div>
            <div>
              <CardTitle className="font-display text-4xl text-foreground">
                Resumen operativo del entorno
              </CardTitle>
              <CardDescription className="mt-3 max-w-2xl text-base leading-7">
                Todo está pensado para que puedas controlar tu despliegue sin depender
                de un servicio comercial centralizado.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-[26px] bg-white/82 p-5">
              <p className="text-sm text-muted-foreground">Modo actual</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">
                {env.demoMode ? "Demo" : "Real"}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {env.demoMode
                  ? "La interfaz se puede recorrer sin persistencia real."
                  : "La instalación está preparada para trabajar con datos reales."}
              </p>
            </div>

            <div className="rounded-[26px] bg-white/82 p-5">
              <p className="text-sm text-muted-foreground">URL pública</p>
              <p className="mt-2 text-xl font-semibold text-foreground">
                {env.appUrl.replace(/^https?:\/\//, "")}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Se usa para enlaces mágicos, URLs públicas y QR de facturas.
              </p>
            </div>

            <div className="rounded-[26px] bg-white/82 p-5">
              <p className="text-sm text-muted-foreground">Modelo IA</p>
              <p className="mt-2 text-xl font-semibold text-foreground">
                {env.hasLocalAi ? env.lmStudioModel : "Pendiente"}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {env.hasLocalAi ? env.lmStudioBaseUrl : "Configura LM Studio para usar IA local."}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Checklist técnico</CardTitle>
            <CardDescription>
              Estado resumido de las integraciones principales.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {checks.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="rounded-[26px] bg-[color:var(--color-panel)] p-5"
                >
                  <div className="flex items-start gap-4">
                    <div className="rounded-2xl bg-white p-3 text-[color:var(--color-brand)]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="font-semibold text-foreground">{item.title}</p>
                        <Badge variant={item.ready ? "success" : "secondary"}>
                          {item.ready ? "Listo" : "Pendiente"}
                        </Badge>
                      </div>
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
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        {[
          {
            title: "Backups",
            description:
              "Guarda copias de tu base de datos y del almacenamiento de logos con la frecuencia que necesites.",
            icon: HardDriveDownload,
            href: "/instalacion",
            label: "Ver guía privada",
          },
          {
            title: "Mensajería opcional",
            description:
              "Conecta WhatsApp Business o Telegram por webhook solo si te aporta valor operativo.",
            icon: Smartphone,
            href: "/messages",
            label: "Abrir mensajes",
          },
          {
            title: "Endurecimiento",
            description:
              "Revisa HTTPS, acceso a LM Studio y credenciales antes de abrir la app fuera de tu red de trabajo.",
            icon: ShieldCheck,
            href: "/instalacion",
            label: "Revisar despliegue",
          },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <Card key={item.title}>
              <CardContent className="space-y-4">
                <div className="rounded-2xl bg-[color:var(--color-brand-soft)] p-3 text-[color:var(--color-brand)] w-fit">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-foreground">
                    {item.title}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    {item.description}
                  </p>
                </div>
                <Button variant="outline" asChild>
                  <Link href={item.href}>{item.label}</Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Notas del entorno</CardTitle>
          <CardDescription>
            Recomendaciones rápidas para uso privado en portátil, sobremesa o VPS.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[26px] bg-[color:var(--color-panel)] p-5">
            <div className="flex items-start gap-3">
              <ServerCog className="mt-1 h-5 w-5 text-[color:var(--color-brand)]" />
              <div>
                <p className="font-semibold text-foreground">Despliegue recomendado</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Usa Node.js 20+, HTTPS delante de la app y limita el acceso a LM Studio
                  si lo expones en red interna.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[26px] bg-[color:var(--color-panel)] p-5">
            <div className="flex items-start gap-3">
              <Database className="mt-1 h-5 w-5 text-[color:var(--color-brand)]" />
              <div>
                <p className="font-semibold text-foreground">Migraciones activas</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Asegúrate de aplicar también la migración que elimina tablas y columnas
                  heredadas de billing para mantener la base coherente con el modo self-hosted.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
