import Link from "next/link";
import {
  ArchiveRestore,
  ArrowRight,
  CheckCircle2,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { getCurrentProfile, requireUser } from "@/lib/auth";
import { isDemoMode, demoInvoices } from "@/lib/demo";
import { getOutboundMailStatusSummary } from "@/lib/mail";
import { getRemoteBackupStatusSummary } from "@/lib/remote-backups";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function PrimerosPasosPage() {
  const user = await requireUser();
  const demoMode = isDemoMode();
  const profile = await getCurrentProfile();
  const outboundMail = getOutboundMailStatusSummary();
  const remoteBackups = getRemoteBackupStatusSummary();
  const invoiceCount = demoMode
    ? demoInvoices.filter((invoice) => invoice.user_id === user.id).length
    : Number(
        (
          await (await createServerSupabaseClient())
            .from("invoices")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
        ).count ?? 0,
      );
  const profileReady = Boolean(profile.full_name && profile.nif && profile.address);

  const steps = [
    {
      title: "Completa tu perfil fiscal",
      description:
        "Nombre o razón social, NIF, dirección y logo. Sin eso, cada factura nace coja.",
      done: profileReady,
      href: "/profile",
      label: profileReady ? "Revisar perfil" : "Completar perfil",
      icon: UserRound,
    },
    {
      title: "Emite la primera factura",
      description:
        "Valida el circuito básico antes de tocar módulos avanzados o instalar más cosas.",
      done: invoiceCount > 0,
      href: invoiceCount > 0 ? "/invoices" : "/new-invoice",
      label: invoiceCount > 0 ? "Ver facturas" : "Crear factura",
      icon: CheckCircle2,
    },
    {
      title: "Configura el correo saliente",
      description:
        "Si no puedes enviar una factura por email, todavía no tienes una instalación cómoda para el día a día.",
      done: outboundMail.configured,
      href: "/mail",
      label: "Abrir correo",
      icon: Mail,
    },
    {
      title: "Valida tu estrategia de backup",
      description:
        "Haz al menos una exportación local y solo después piensa en copias remotas o módulos delicados.",
      done: remoteBackups.configured,
      href: "/backups",
      label: "Abrir backups",
      icon: ArchiveRestore,
    },
  ];

  const completedSteps = steps.filter((step) => step.done).length;

  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="overflow-hidden bg-[linear-gradient(155deg,rgba(255,255,255,0.96),rgba(236,247,243,0.9))]">
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge>Primeros pasos</Badge>
              <Badge variant="success">Instalación guiada</Badge>
              {demoMode ? <Badge variant="secondary">Modo demo</Badge> : null}
            </div>
            <div className="space-y-3">
              <CardTitle className="font-display text-5xl leading-none tracking-tight">
                Empieza por lo que de verdad te hace trabajar.
              </CardTitle>
              <CardDescription className="max-w-2xl text-base leading-7">
                Esta pantalla existe para que un autónomo no técnico no tenga que
                descifrar medio repositorio. Primero núcleo, después comodidad, y solo al final módulos avanzados.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[26px] bg-white/82 p-5">
              <p className="text-sm text-muted-foreground">Progreso básico</p>
              <p className="mt-2 font-display text-4xl text-foreground">
                {completedSteps}/{steps.length}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Pasos clave cerrados antes de ampliar la instalación.
              </p>
            </div>
            <div className="rounded-[26px] bg-white/82 p-5">
              <p className="text-sm text-muted-foreground">Lo importante hoy</p>
              <p className="mt-2 font-display text-4xl text-foreground">Núcleo</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Perfil, facturas, correo saliente y backup.
              </p>
            </div>
            <div className="rounded-[26px] bg-white/82 p-5">
              <p className="text-sm text-muted-foreground">Lo que puede esperar</p>
              <p className="mt-2 font-display text-4xl text-foreground">Extras</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                OCR, banca, mensajería, IRPF asistido o Facturae.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Regla de uso prudente</CardTitle>
            <CardDescription>
              FacturaIA ya tiene muchas piezas. No conviene activarlas todas a la vez.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-7 text-muted-foreground">
            <p>1. Cierra perfil, facturas, correo y backup.</p>
            <p>2. Trabaja unos días con el núcleo.</p>
            <p>3. Añade cobros o presupuestos si de verdad los necesitas.</p>
            <p>4. Deja IRPF, mensajería, OCR o Facturae para una segunda fase.</p>
            <Button variant="outline" asChild>
              <Link href="/modules">
                Ver estado real de módulos
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {steps.map((step) => {
          const Icon = step.icon;

          return (
            <Card key={step.title}>
              <CardContent className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-[color:var(--color-brand-soft)] p-3 text-[color:var(--color-brand)]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold text-foreground">
                        {step.title}
                      </h2>
                      <p className="mt-2 text-sm leading-7 text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                  </div>
                  <Badge variant={step.done ? "success" : "secondary"}>
                    {step.done ? "Hecho" : "Pendiente"}
                  </Badge>
                </div>

                <Button variant={step.done ? "outline" : "default"} asChild>
                  <Link href={step.href}>
                    {step.label}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle>No actives todavía todo esto</CardTitle>
            <CardDescription>
              Estas piezas aportan valor, pero no deberían ser lo primero en una instalación nueva.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-3">
            {[
              {
                title: "Mensajería y correo entrante",
                description:
                  "Solo cuando el núcleo de facturación ya esté estable y sepas realmente qué conversaciones quieres centralizar.",
              },
              {
                title: "OCR, banca y Facturae",
                description:
                  "Son módulos útiles, pero todavía exigen más revisión manual y más criterio operativo.",
              },
              {
                title: "Asistentes IA avanzados",
                description:
                  "Úsalos para acelerar trabajo, no para delegar decisiones fiscales o cierres delicados.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-[26px] bg-[color:var(--color-panel)] p-5"
              >
                <p className="font-semibold text-foreground">{item.title}</p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Documentos IA</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm leading-7 text-muted-foreground">
              Úsalo cuando tu flujo de facturas ya esté asentado y quieras ganar velocidad en propuestas o contratos.
            </p>
            <Button variant="outline" asChild>
              <Link href="/documents-ai">Abrir documentos</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Asistente fiscal IRPF</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm leading-7 text-muted-foreground">
              Módulo de apoyo para preparar expedientes de renta con checklist y fuentes oficiales, no para delegar la validación final.
            </p>
            <Button variant="outline" asChild>
              <Link href="/renta">Abrir asistente IRPF</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sistema</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm leading-7 text-muted-foreground">
              Si tienes dudas de configuración, revisa antes el estado técnico del entorno y ejecuta el doctor.
            </p>
            <Button variant="outline" asChild>
              <Link href="/system">
                Abrir sistema
                <ShieldCheck className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
