import Link from "next/link";
import { ArrowRight, CheckCircle2, FileText, HardDrive, Shield } from "lucide-react";

import { getOptionalUser } from "@/lib/auth";
import { isDemoMode, isLocalMode } from "@/lib/demo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function Home() {
  const user = await getOptionalUser();
  const demoMode = isDemoMode();
  const localMode = isLocalMode();

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
                Núcleo de facturación local para empezar con criterio, no un “todo incluido” todavía.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
                FacturaIA ya cubre bien perfil fiscal, facturas, PDF, cobros, backups
                locales y auditoría básica. El resto de módulos existe, pero no todos
                tienen aún la misma madurez ni conviene activarlos el primer día.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href={user ? "/dashboard" : "/login"}>
                  {user
                    ? "Abrir panel"
                    : localMode
                      ? "Entrar con cuenta local"
                      : "Entrar con enlace mágico"}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/instalacion">Ver instalación</Link>
              </Button>
              <Button variant="ghost" size="lg" asChild>
                <Link href="/modules">Ver módulos por fases</Link>
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
                Núcleo usable hoy
              </span>
              <span className="metric-pill">
                <Shield className="h-4 w-4 text-[color:var(--color-brand)]" />
                {localMode ? "Acceso local con contraseña" : "Despliegue privado opcional"}
              </span>
              <span className="metric-pill">
                <HardDrive className="h-4 w-4 text-[color:var(--color-brand)]" />
                Activación por fases
              </span>
            </div>
          </div>

          <Card className="relative overflow-hidden bg-[linear-gradient(155deg,rgba(255,255,255,0.9),rgba(237,248,245,0.85))]">
            <CardHeader>
              <CardTitle>Qué puedes activar hoy sin forzar la instalación</CardTitle>
              <CardDescription>
                La recomendación actual es empezar por el núcleo y dejar los módulos
                de piloto para una segunda fase.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                "Usar ya: perfil fiscal, facturas, PDF, factura pública, cobros, correo saliente, backups locales y auditoría básica.",
                "Usar con piloto: presupuestos, firma documental, CRM ligero, estudio documental, IMAP, banca CSV, mensajería y backups remotos.",
                "No activar todavía como promesa cerrada: OCR de gastos, Facturae / VeriFactu y memoria local RAG multi-año.",
                "La instalación privada ya es mucho más sólida, pero el backend local sigue en transición hacia una base SQLite más primaria.",
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
