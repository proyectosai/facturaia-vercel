import Link from "next/link";
import { ArrowRight, CheckCircle2, FileText, HardDrive, Shield } from "lucide-react";

import { getOptionalUser } from "@/lib/auth";
import { isDemoMode } from "@/lib/demo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function Home() {
  const user = await getOptionalUser();
  const demoMode = isDemoMode();

  return (
    <div className="relative overflow-hidden pb-16">
      <div className="hero-orb left-[-8rem] top-[-4rem] h-64 w-64 bg-[color:rgba(31,102,97,0.35)]" />
      <div className="hero-orb bottom-[-8rem] right-[-2rem] h-72 w-72 bg-[color:rgba(207,95,73,0.22)]" />

      <main className="page-shell px-2 py-8 sm:py-12">
        <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="space-y-7">
            <Badge className="w-fit">FacturaIA para autónomos</Badge>
            <div className="space-y-5">
              <p className="section-kicker">Facturación española asistida</p>
              <h1 className="font-display text-5xl leading-none tracking-tight text-foreground sm:text-6xl lg:text-7xl">
                Facturas y documentos con imagen profesional, listos para tu instalación privada.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
                FacturaIA centraliza tu emisión de facturas, genera PDF con QR y
                URL pública, guarda todo en Supabase y te prepara para una operativa
                compatible con VeriFactu sin depender de un SaaS comercial.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href={user ? "/dashboard" : "/login"}>
                  {user ? "Abrir panel" : "Entrar con enlace mágico"}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/instalacion">Ver instalación</Link>
              </Button>
              {demoMode ? (
                <Button variant="ghost" size="lg" asChild>
                  <Link href="/dashboard">Abrir demo local</Link>
                </Button>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-3">
              <span className="metric-pill">
                <FileText className="h-4 w-4 text-[color:var(--color-brand)]" />
                PDF con IVA desglosado
              </span>
              <span className="metric-pill">
                <Shield className="h-4 w-4 text-[color:var(--color-brand)]" />
                RLS en Supabase
              </span>
              <span className="metric-pill">
                <HardDrive className="h-4 w-4 text-[color:var(--color-brand)]" />
                Uso privado self-hosted
              </span>
            </div>
          </div>

          <Card className="relative overflow-hidden bg-[linear-gradient(155deg,rgba(255,255,255,0.9),rgba(237,248,245,0.85))]">
            <CardHeader>
              <CardTitle>Lo que ya resuelve FacturaIA</CardTitle>
              <CardDescription>
                Diseño en español, flujo protegido y automatización privada del
                ciclo básico de facturación.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                "Dashboard con sidebar y panel protegido por sesión.",
                "Formulario completo con emisor, cliente, líneas, IVA e IRPF.",
                "Listado con búsqueda, rango de fechas, descarga PDF y envío por email.",
                "Página pública de factura enlazada con QR y despliegue pensado para instalación privada.",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-[26px] bg-white/75 p-4"
                >
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-[color:var(--color-success)]" />
                  <p className="text-sm leading-6 text-foreground/90">{item}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
