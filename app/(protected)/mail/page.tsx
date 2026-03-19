import Link from "next/link";
import {
  Mail,
  MailCheck,
  Send,
  Server,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { requireUser } from "@/lib/auth";
import { isDemoMode } from "@/lib/demo";
import { getOutboundMailStatusSummary } from "@/lib/mail";
import { sendMailTestAction } from "@/lib/actions/mail";
import { RouteToast } from "@/components/route-toast";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default async function MailPage({
  searchParams,
}: {
  searchParams: Promise<{
    sent?: string;
    error?: string;
  }>;
}) {
  const user = await requireUser();
  const demoMode = isDemoMode();
  const mailStatus = getOutboundMailStatusSummary();
  const { sent, error } = await searchParams;

  return (
    <div className="space-y-8">
      <RouteToast
        type="success"
        message={sent ? `Correo de prueba enviado a ${sent}.` : null}
      />
      <RouteToast type="error" message={error ?? null} />

      <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr] xl:items-end">
        <div className="max-w-4xl space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge>Correo</Badge>
            <Badge variant="success">Módulo activo</Badge>
            {demoMode ? <Badge variant="secondary">Modo demo</Badge> : null}
          </div>

          <div className="space-y-3">
            <p className="section-kicker">Correo saliente</p>
            <h1 className="font-display text-5xl leading-none tracking-tight text-foreground">
              Envía facturas y pruebas con el proveedor que prefieras.
            </h1>
            <p className="text-lg leading-8 text-muted-foreground">
              FacturaIA ya no depende de un único servicio: puedes trabajar con
              SMTP clásico o con Resend, y comprobar la configuración desde una
              pantalla propia antes de usarla en el día a día.
            </p>
          </div>
        </div>

        <Card className="overflow-hidden bg-[linear-gradient(150deg,rgba(255,255,255,0.95),rgba(232,246,242,0.9))]">
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-[24px] bg-white/82 p-4">
              <p className="text-sm text-muted-foreground">Proveedor</p>
              <p className="mt-2 font-display text-3xl text-foreground">
                {mailStatus.providerLabel}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Detección automática o explícita por `MAIL_PROVIDER`.
              </p>
            </div>
            <div className="rounded-[24px] bg-white/82 p-4">
              <p className="text-sm text-muted-foreground">Remitente</p>
              <p className="mt-2 text-xl font-semibold text-foreground">
                {mailStatus.fromLabel}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Se usa para facturas y correos de prueba.
              </p>
            </div>
            <div className="rounded-[24px] bg-white/82 p-4">
              <p className="text-sm text-muted-foreground">Uso</p>
              <p className="mt-2 font-display text-3xl text-foreground">Privado</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Diseñado para tu servidor, tu VPS o tu equipo.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[color:var(--color-brand-soft)] p-3 text-[color:var(--color-brand)]">
                <MailCheck className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Estado del módulo</CardTitle>
                <CardDescription>
                  Resumen técnico de la salida de correo activa.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[26px] bg-[color:var(--color-panel)] p-5">
              <div className="flex flex-wrap items-center gap-3">
                <p className="font-semibold text-foreground">{mailStatus.providerLabel}</p>
                <Badge variant={mailStatus.configured ? "success" : "secondary"}>
                  {mailStatus.configured ? "Configurado" : "Pendiente"}
                </Badge>
              </div>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                {mailStatus.detail}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[26px] bg-[color:var(--color-panel)] p-5">
                <div className="flex items-start gap-3">
                  <Server className="mt-1 h-5 w-5 text-[color:var(--color-brand)]" />
                  <div>
                    <p className="font-semibold text-foreground">SMTP</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Recomendado para despliegues privados con tu propio buzón o relay.
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-[26px] bg-[color:var(--color-panel)] p-5">
                <div className="flex items-start gap-3">
                  <Sparkles className="mt-1 h-5 w-5 text-[color:var(--color-brand)]" />
                  <div>
                    <p className="font-semibold text-foreground">Resend</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Sencillo para correo transaccional si prefieres un proveedor gestionado.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button variant="outline" asChild>
                <Link href="/invoices">Probar con facturas</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/modules">Ver catálogo</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[color:var(--color-panel)] p-3 text-[color:var(--color-brand)]">
                <Send className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Enviar correo de prueba</CardTitle>
                <CardDescription>
                  Verifica el módulo antes de usarlo para facturas reales.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {!mailStatus.configured ? (
              <div className="rounded-[26px] bg-[color:rgba(202,145,34,0.12)] p-5">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-1 h-5 w-5 text-[color:#8b5b00]" />
                  <p className="text-sm leading-7 text-[color:#6d4b00]">
                    Antes de enviar pruebas, configura el módulo en `.env.local` o en tu
                    panel de despliegue. La guía está en `docs/modulos/CORREO_SALIENTE.md`.
                  </p>
                </div>
              </div>
            ) : null}

            <form action={sendMailTestAction} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="recipientEmail">Destinatario</Label>
                  <Input
                    id="recipientEmail"
                    name="recipientEmail"
                    type="email"
                    defaultValue={user.email ?? ""}
                    disabled={demoMode || !mailStatus.configured}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Asunto</Label>
                  <Input
                    id="subject"
                    name="subject"
                    defaultValue="Prueba de correo desde FacturaIA"
                    disabled={demoMode || !mailStatus.configured}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Mensaje</Label>
                <Textarea
                  id="message"
                  name="message"
                  rows={6}
                  defaultValue="Este es un correo de prueba enviado desde mi instalación privada de FacturaIA para verificar que el módulo de correo saliente funciona correctamente."
                  disabled={demoMode || !mailStatus.configured}
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <SubmitButton
                  pendingLabel="Enviando prueba..."
                  disabled={demoMode || !mailStatus.configured}
                >
                  <Mail className="h-4 w-4" />
                  Enviar correo de prueba
                </SubmitButton>
                <div className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-panel)] px-4 py-2 text-sm text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-[color:var(--color-success)]" />
                  Usa el mismo canal que el envío de facturas
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
