import Link from "next/link";
import { MailCheck, MoveRight } from "lucide-react";
import { redirect } from "next/navigation";

import { getOptionalUser } from "@/lib/auth";
import { requestMagicLinkAction } from "@/lib/actions/auth";
import { isDemoMode } from "@/lib/demo";
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

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const user = await getOptionalUser();
  const { error, sent } = await searchParams;
  const demoMode = isDemoMode();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="page-shell flex min-h-screen items-center px-2 py-12">
      <div className="grid w-full gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <div className="space-y-6">
          <Badge className="w-fit">Acceso por email</Badge>
          <div className="space-y-4">
            <p className="section-kicker">Inicio de sesión sin contraseña</p>
            <h1 className="font-display text-5xl leading-none tracking-tight text-foreground">
              Entra con enlace mágico y sigue facturando.
            </h1>
            <p className="max-w-xl text-lg leading-8 text-muted-foreground">
              Supabase Auth enviará un enlace a tu correo. Al abrirlo, volverás
              al dashboard con la sesión ya creada.
            </p>
          </div>

          <div className="rounded-[30px] border border-white/60 bg-white/70 p-6">
            <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">
              Qué incluye este acceso
            </p>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-foreground/90">
              <li>Dashboard protegido con middleware y verificación de sesión.</li>
              <li>Perfil fiscal persistido en Supabase.</li>
              <li>Generación y gestión de facturas desde el panel.</li>
            </ul>
          </div>
        </div>

        <Card className="mx-auto w-full max-w-xl">
          <CardHeader>
            <CardTitle>Recibir enlace de acceso</CardTitle>
            <CardDescription>
              Introduce tu correo y te enviaremos un enlace para entrar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {sent ? (
              <div className="status-banner">
                Hemos enviado el magic link. Revisa tu bandeja de entrada y
                vuelve a FacturaIA desde el enlace del email.
              </div>
            ) : null}

            {error ? (
              <div className="status-banner error">
                {decodeURIComponent(error)}
              </div>
            ) : null}

            {demoMode ? (
              <div className="status-banner">
                Estás en modo demo local. Puedes entrar al panel sin Supabase para revisar la interfaz completa.
              </div>
            ) : null}

            <form action={requestMagicLinkAction} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email de acceso</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="tu@empresa.es"
                  required
                />
              </div>

              <SubmitButton pendingLabel="Enviando enlace..." className="w-full">
                <MailCheck className="h-4 w-4" />
                {demoMode ? "Entrar en demo local" : "Enviarme enlace mágico"}
              </SubmitButton>
            </form>

            {demoMode ? (
              <Button className="w-full" asChild>
                <Link href="/dashboard">
                  Abrir panel demo
                  <MoveRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : null}

            <Button variant="ghost" className="w-full" asChild>
              <Link href="/">
                Volver a la portada
                <MoveRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
