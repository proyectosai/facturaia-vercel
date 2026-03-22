import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  CreditCard,
  Database,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Github,
  Globe,
  HardDrive,
  Landmark,
  LockKeyhole,
  Mail,
  MessageSquare,
  PenLine,
  Receipt,
  ScanLine,
  Shield,
  Smartphone,
  Sparkles,
  TerminalSquare,
  Users,
  Wallet,
} from "lucide-react";

import { getOptionalUser } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const coreModules = [
  {
    icon: FileText,
    title: "Perfil fiscal",
    description:
      "Nombre, NIF, dirección y logo del emisor. Se reutiliza en cada factura y PDF sin repetir datos.",
    href: "/profile",
  },
  {
    icon: Receipt,
    title: "Facturación con IVA/IRPF",
    description:
      "Creación de facturas con líneas, cálculos fiscales españoles automáticos y numeración secuencial.",
    href: "/new-invoice",
  },
  {
    icon: FileSpreadsheet,
    title: "PDF profesional",
    description:
      "Generación de PDF con datos fiscales completos, descargable y envíable directamente desde la app.",
    href: "/invoices",
  },
  {
    icon: Globe,
    title: "Factura pública",
    description:
      "Cada factura tiene un enlace público para que el cliente la consulte sin necesidad de cuenta.",
    href: "/invoices",
  },
  {
    icon: Wallet,
    title: "Cobros y vencimientos",
    description:
      "Seguimiento de pagos: pendiente, cobrado, vencido. Recordatorios manuales y vista de prioridad.",
    href: "/cobros",
  },
  {
    icon: Mail,
    title: "Correo saliente",
    description:
      "Envío de facturas por email vía SMTP o Resend. Listo para uso diario desde el primer día.",
    href: "/mail",
  },
  {
    icon: HardDrive,
    title: "Backups locales",
    description:
      "Exportación con manifiesto y checksum. Restauración con dry-run y validación post-restore.",
    href: "/backups",
  },
  {
    icon: Shield,
    title: "Auditoría",
    description:
      "Log de eventos: logins, facturas, cobros, restauraciones. Exportable en JSON para trazabilidad.",
    href: "/auditoria",
  },
];

const pilotModules = [
  {
    icon: Users,
    title: "CRM ligero",
    description:
      "Fichas de cliente con notas y actividad cruzada desde facturas, correo y gastos.",
    href: "/clientes",
  },
  {
    icon: FileCheck2,
    title: "Presupuestos y albaranes",
    description:
      "Documentos comerciales con estados y conversión directa a factura cuando se aceptan.",
    href: "/presupuestos",
  },
  {
    icon: PenLine,
    title: "Firma documental",
    description:
      "Aceptación de presupuestos y firma básica de albaranes mediante enlaces públicos.",
    href: "/firmas",
  },
  {
    icon: Landmark,
    title: "Conciliación bancaria",
    description:
      "Importa extractos CSV y cruza movimientos con facturas emitidas o gastos revisados.",
    href: "/banca",
  },
  {
    icon: ScanLine,
    title: "Gastos y OCR asistido",
    description:
      "Registro manual de gastos con subida de justificantes. OCR local opcional con Ollama.",
    href: "/gastos",
  },
  {
    icon: BookOpen,
    title: "Correo entrante (IMAP)",
    description:
      "Importación de correos para ordenarlos dentro de la propia app junto a cada cliente.",
    href: "/mail",
  },
  {
    icon: MessageSquare,
    title: "Mensajería",
    description:
      "WhatsApp Business y Telegram por webhook para ordenar conversaciones con clientes.",
    href: "/messages",
  },
];

const aiModules = [
  {
    icon: BrainCircuit,
    title: "IA documental local",
    description:
      "Mejora de textos y descripciones con LM Studio. Sin dependencia de APIs externas.",
    href: "/documents-ai",
  },
  {
    icon: Sparkles,
    title: "Estudio de documentos",
    description:
      "Análisis local de documentos con citas extraídas. No promete RAG multi-año: es honesto.",
    href: "/estudio-ia",
  },
  {
    icon: BarChart3,
    title: "Asistente IRPF / Renta",
    description:
      "Checklists fiscales con referencias a fuentes oficiales. Ayuda, no sustituye al asesor.",
    href: "/renta",
  },
];

const techStack = [
  { label: "Next.js 15", detail: "App Router + Server Components" },
  { label: "React 19", detail: "Server Actions nativas" },
  { label: "TypeScript", detail: "Tipado estricto en todo el proyecto" },
  { label: "Tailwind CSS", detail: "Design system cohesivo" },
  { label: "SQLite", detail: "Base de datos local, sin dependencias" },
  { label: "LM Studio", detail: "IA local opcional, sin APIs externas" },
];

export default async function Home() {
  const user = await getOptionalUser();

  return (
    <div className="relative overflow-hidden pb-16">
      <div className="hero-orb left-[-8rem] top-[-4rem] h-64 w-64 bg-[color:rgba(31,102,97,0.35)]" />
      <div className="hero-orb bottom-[-8rem] right-[-2rem] h-72 w-72 bg-[color:rgba(207,95,73,0.22)]" />
      <div className="hero-orb left-[40%] top-[20%] h-48 w-48 bg-[color:rgba(31,102,97,0.15)]" />

      <main className="page-shell px-2 py-8 sm:py-12">
        {/* Hero */}
        <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="space-y-7">
            <div className="flex flex-wrap gap-2">
              <Badge>Open Source</Badge>
              <Badge variant="secondary">Self-hosted</Badge>
              <Badge variant="success">Demo disponible</Badge>
            </div>
            <div className="space-y-5">
              <p className="section-kicker">Facturación española para autónomos</p>
              <h1 className="font-display text-5xl leading-none tracking-tight text-foreground sm:text-6xl lg:text-7xl">
                Tu facturación completa, privada y en tu ordenador.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
                FacturaIA es una herramienta open source de facturación española con
                IVA/IRPF, PDF profesional, cobros, backups, CRM, firma documental,
                banca, IA local y más. Sin planes de pago, sin dependencias externas
                obligatorias.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href={user ? "/dashboard" : "/dashboard"}>
                  Explorar demo completa
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="https://github.com/proyectosai/facturaia" target="_blank" rel="noopener noreferrer">
                  <Github className="h-4 w-4" />
                  Ver en GitHub
                </Link>
              </Button>
              <Button variant="ghost" size="lg" asChild>
                <Link href="/instalacion">Guía de instalación</Link>
              </Button>
            </div>

            <div className="flex flex-wrap gap-3">
              <span className="metric-pill">
                <FileText className="h-4 w-4 text-[color:var(--color-brand)]" />
                20+ módulos
              </span>
              <span className="metric-pill">
                <Shield className="h-4 w-4 text-[color:var(--color-brand)]" />
                100% privado
              </span>
              <span className="metric-pill">
                <Database className="h-4 w-4 text-[color:var(--color-brand)]" />
                SQLite local
              </span>
              <span className="metric-pill">
                <Smartphone className="h-4 w-4 text-[color:var(--color-brand)]" />
                Responsive
              </span>
            </div>
          </div>

          <Card className="relative overflow-hidden bg-[linear-gradient(155deg,rgba(255,255,255,0.9),rgba(237,248,245,0.85))]">
            <CardHeader>
              <CardTitle className="font-display text-3xl">Showroom interactivo</CardTitle>
              <CardDescription>
                Navega por todos los módulos con datos de ejemplo reales.
                Sin registro, sin configuración.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Facturas", value: "5", sub: "con PDF y cobros" },
                  { label: "Clientes", value: "4", sub: "con actividad" },
                  { label: "Gastos", value: "3", sub: "con justificantes" },
                  { label: "Módulos", value: "20+", sub: "explorables" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[22px] bg-white/75 p-4 text-center"
                  >
                    <p className="font-display text-3xl text-[color:var(--color-brand)]">
                      {item.value}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {item.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{item.sub}</p>
                  </div>
                ))}
              </div>
              <Button className="w-full" asChild size="lg">
                <Link href="/dashboard">
                  Abrir panel demo
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Modo demo: los datos son de ejemplo y no se guardan.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Núcleo — Usar ya */}
        <section className="mt-20 space-y-6">
          <div className="max-w-3xl space-y-3">
            <div className="flex items-center gap-3">
              <Badge variant="success">Usar ya</Badge>
              <p className="section-kicker">Núcleo de facturación</p>
            </div>
            <h2 className="font-display text-4xl leading-none tracking-tight text-foreground sm:text-5xl">
              Todo lo que necesitas para facturar desde el primer día
            </h2>
            <p className="text-lg leading-8 text-muted-foreground">
              Perfil fiscal, facturas con IVA/IRPF, PDF profesional, cobros,
              correo saliente, backups con validación y auditoría completa.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {coreModules.map((mod) => {
              const Icon = mod.icon;

              return (
                <Link
                  key={mod.title}
                  href={mod.href}
                  className="group"
                >
                  <Card className="h-full transition hover:border-[color:var(--color-brand)] hover:shadow-lg hover:shadow-[color:color-mix(in_oklab,var(--color-brand)_8%,transparent)]">
                    <CardContent className="mt-0 space-y-4">
                      <div className="rounded-2xl bg-[color:var(--color-brand-soft)] p-3 text-[color:var(--color-brand)] w-fit transition group-hover:bg-[color:var(--color-brand)] group-hover:text-white">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">
                          {mod.title}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          {mod.description}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-[color:var(--color-brand)] opacity-0 transition group-hover:opacity-100">
                        Ver módulo <ArrowRight className="h-3 w-3" />
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Módulos piloto */}
        <section className="mt-20 space-y-6">
          <div className="max-w-3xl space-y-3">
            <div className="flex items-center gap-3">
              <Badge variant="secondary">Piloto</Badge>
              <p className="section-kicker">Módulos de segunda fase</p>
            </div>
            <h2 className="font-display text-4xl leading-none tracking-tight text-foreground sm:text-5xl">
              Expande la operativa cuando el núcleo ya funcione
            </h2>
            <p className="text-lg leading-8 text-muted-foreground">
              CRM, presupuestos, firma documental, banca CSV, gastos con OCR,
              correo entrante y mensajería. Activación progresiva.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {pilotModules.map((mod) => {
              const Icon = mod.icon;

              return (
                <Link
                  key={mod.title}
                  href={mod.href}
                  className="group"
                >
                  <Card className="h-full transition hover:border-[color:var(--color-brand)] hover:shadow-lg hover:shadow-[color:color-mix(in_oklab,var(--color-brand)_8%,transparent)]">
                    <CardContent className="mt-0 space-y-4">
                      <div className="rounded-2xl bg-[color:var(--color-panel)] p-3 text-muted-foreground w-fit transition group-hover:bg-[color:var(--color-brand)] group-hover:text-white">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">
                          {mod.title}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          {mod.description}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-[color:var(--color-brand)] opacity-0 transition group-hover:opacity-100">
                        Ver módulo <ArrowRight className="h-3 w-3" />
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>

        {/* IA local */}
        <section className="mt-20 space-y-6">
          <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-center">
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <Badge>IA Local</Badge>
                <p className="section-kicker">Sin APIs externas</p>
              </div>
              <h2 className="font-display text-4xl leading-none tracking-tight text-foreground sm:text-5xl">
                Inteligencia artificial que corre en tu equipo
              </h2>
              <p className="text-lg leading-8 text-muted-foreground">
                Integración con LM Studio para mejora de textos, estudio de
                documentos con citas y asistente fiscal IRPF. Todo local, todo
                privado, sin enviar datos a terceros.
              </p>
              <Button asChild>
                <Link href="/documents-ai">
                  Probar IA documental
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-1">
              {aiModules.map((mod) => {
                const Icon = mod.icon;

                return (
                  <Link key={mod.title} href={mod.href}>
                    <Card className="transition hover:border-[color:var(--color-brand)] hover:shadow-lg hover:shadow-[color:color-mix(in_oklab,var(--color-brand)_8%,transparent)]">
                      <CardContent className="mt-0 flex items-start gap-4">
                        <div className="rounded-2xl bg-[color:var(--color-brand-soft)] p-3 text-[color:var(--color-brand)] shrink-0">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">
                            {mod.title}
                          </h3>
                          <p className="mt-1 text-sm leading-6 text-muted-foreground">
                            {mod.description}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* Arquitectura y stack */}
        <section className="mt-20 space-y-6">
          <div className="max-w-3xl space-y-3">
            <p className="section-kicker">Arquitectura</p>
            <h2 className="font-display text-4xl leading-none tracking-tight text-foreground sm:text-5xl">
              Stack moderno, local-first
            </h2>
            <p className="text-lg leading-8 text-muted-foreground">
              Construido con las mejores prácticas de Next.js 15, tipado estricto
              y base de datos local. Sin vendor lock-in.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {techStack.map((tech) => (
              <div
                key={tech.label}
                className="rounded-[26px] border border-white/60 bg-white/75 p-5"
              >
                <p className="font-display text-2xl text-foreground">{tech.label}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {tech.detail}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Principios */}
        <section className="mt-20">
          <Card className="overflow-hidden bg-[linear-gradient(155deg,rgba(255,255,255,0.96),rgba(244,239,230,0.88))]">
            <CardHeader>
              <p className="section-kicker">Filosofía del proyecto</p>
              <CardTitle className="font-display text-3xl sm:text-4xl">
                Honesto sobre lo que es y lo que no es
              </CardTitle>
              <CardDescription className="max-w-3xl text-base">
                FacturaIA no exagera sus capacidades. Cada módulo indica su
                nivel de madurez real y se activa por fases.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-3">
              {[
                {
                  icon: CheckCircle2,
                  title: "Usar ya",
                  items: [
                    "Perfil fiscal y datos del emisor",
                    "Facturas con IVA/IRPF y PDF",
                    "Factura pública por enlace",
                    "Cobros, vencimientos y recordatorios",
                    "Correo saliente (SMTP/Resend)",
                    "Backups con checksum y restore",
                    "Auditoría de eventos",
                  ],
                },
                {
                  icon: CreditCard,
                  title: "Piloto funcional",
                  items: [
                    "Presupuestos y albaranes",
                    "Firma documental por enlace público",
                    "CRM ligero con fichas de cliente",
                    "Estudio documental con IA local",
                    "IMAP para correo entrante",
                    "Conciliación bancaria CSV",
                    "Mensajería (WhatsApp/Telegram)",
                  ],
                },
                {
                  icon: LockKeyhole,
                  title: "Todavía no listo",
                  items: [
                    "OCR de gastos como promesa cerrada",
                    "Facturae / VeriFactu producción",
                    "Memoria local RAG multi-año",
                    "Firma fiscal electrónica",
                    "Automatizaciones agresivas",
                  ],
                },
              ].map((col) => {
                const Icon = col.icon;

                return (
                  <div
                    key={col.title}
                    className="rounded-[24px] bg-white/80 p-5"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-[color:var(--color-brand)]" />
                      <p className="text-lg font-semibold text-foreground">
                        {col.title}
                      </p>
                    </div>
                    <ul className="mt-4 space-y-2">
                      {col.items.map((item) => (
                        <li
                          key={item}
                          className="text-sm leading-6 text-muted-foreground"
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </section>

        {/* Seguridad */}
        <section className="mt-20 space-y-6">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <Badge>Seguridad</Badge>
                <p className="section-kicker">Fail-closed en producción</p>
              </div>
              <h2 className="font-display text-4xl leading-none tracking-tight text-foreground sm:text-5xl">
                Privacidad y seguridad por defecto
              </h2>
              <p className="text-lg leading-8 text-muted-foreground">
                Autenticación local con contraseña, bloqueo por intentos
                fallidos, sesiones con expiración, auditoría de todo y
                backups con validación criptográfica.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { title: "Auth local", desc: "Email + contraseña sin servicios externos" },
                { title: "Lockout", desc: "Bloqueo automático tras intentos fallidos" },
                { title: "Sesiones", desc: "Firmadas con expiración configurable" },
                { title: "Fail-closed", desc: "Si faltan secretos, la app bloquea acceso" },
                { title: "Auditoría", desc: "Log de cada login, factura y operación" },
                { title: "Backups", desc: "Checksum, manifiesto y dry-run restore" },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-[22px] bg-white/75 p-4"
                >
                  <p className="font-semibold text-foreground">{item.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Responsive + QA */}
        <section className="mt-20 grid gap-6 lg:grid-cols-2">
          <Card className="overflow-hidden bg-[linear-gradient(155deg,rgba(255,255,255,0.9),rgba(237,248,245,0.85))]">
            <CardHeader>
              <div className="rounded-2xl bg-[color:var(--color-brand-soft)] p-3 text-[color:var(--color-brand)] w-fit">
                <Smartphone className="h-5 w-5" />
              </div>
              <CardTitle>Responsive real</CardTitle>
              <CardDescription>
                El núcleo diario funciona en móvil: dashboard, nueva factura,
                historial, cobros y perfil. Las pantallas densas como banca
                o Facturae indican que van mejor en escritorio.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {["Dashboard", "Facturas", "Cobros", "Perfil", "Clientes", "Gastos"].map(
                  (screen) => (
                    <div
                      key={screen}
                      className="rounded-[18px] bg-white/80 px-3 py-2 text-center text-sm text-foreground"
                    >
                      {screen}
                    </div>
                  ),
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden bg-[linear-gradient(155deg,rgba(255,255,255,0.9),rgba(244,239,230,0.88))]">
            <CardHeader>
              <div className="rounded-2xl bg-[color:var(--color-panel)] p-3 text-foreground w-fit">
                <TerminalSquare className="h-5 w-5" />
              </div>
              <CardTitle>QA y CI completos</CardTitle>
              <CardDescription>
                Lint, typecheck, tests unitarios, smoke tests y E2E con
                Playwright en Linux, macOS y Windows. Artefactos en caso
                de fallo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {["Lint", "TypeCheck", "Unit", "Smoke", "E2E", "CI x3"].map(
                  (check) => (
                    <div
                      key={check}
                      className="flex items-center justify-center gap-2 rounded-[18px] bg-white/80 px-3 py-2 text-sm text-foreground"
                    >
                      <CheckCircle2 className="h-3 w-3 text-[color:var(--color-success)]" />
                      {check}
                    </div>
                  ),
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Recorrido rápido por pantallas */}
        <section className="mt-20 space-y-6">
          <div className="max-w-3xl space-y-3">
            <p className="section-kicker">Recorrido rápido</p>
            <h2 className="font-display text-4xl leading-none tracking-tight text-foreground sm:text-5xl">
              Explora cada pantalla del demo
            </h2>
            <p className="text-lg leading-8 text-muted-foreground">
              Todas las rutas protegidas están disponibles con datos de ejemplo.
              Haz clic en cualquiera para verla.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[
              { label: "Dashboard", href: "/dashboard", desc: "Panel principal con métricas" },
              { label: "Nueva factura", href: "/new-invoice", desc: "Formulario con IVA/IRPF" },
              { label: "Historial", href: "/invoices", desc: "Listado y filtros" },
              { label: "Cobros", href: "/cobros", desc: "Seguimiento de pagos" },
              { label: "Perfil fiscal", href: "/profile", desc: "Datos del emisor" },
              { label: "Clientes", href: "/clientes", desc: "CRM ligero" },
              { label: "Gastos", href: "/gastos", desc: "Justificantes y OCR" },
              { label: "Presupuestos", href: "/presupuestos", desc: "Documentos comerciales" },
              { label: "Firmas", href: "/firmas", desc: "Firma por enlace público" },
              { label: "Banca", href: "/banca", desc: "Conciliación CSV" },
              { label: "Correo", href: "/mail", desc: "Saliente + IMAP" },
              { label: "Mensajería", href: "/messages", desc: "WhatsApp / Telegram" },
              { label: "IA documental", href: "/documents-ai", desc: "Mejora con LM Studio" },
              { label: "Estudio IA", href: "/estudio-ia", desc: "Análisis con citas" },
              { label: "Renta / IRPF", href: "/renta", desc: "Asistente fiscal" },
              { label: "Facturae", href: "/facturae", desc: "XML 3.2.2 y VeriFactu" },
              { label: "Backups", href: "/backups", desc: "Export y restore" },
              { label: "Auditoría", href: "/auditoria", desc: "Log de eventos" },
              { label: "Módulos", href: "/modules", desc: "Catálogo con madurez" },
              { label: "Primeros pasos", href: "/primeros-pasos", desc: "Asistente inicial" },
            ].map((route) => (
              <Link key={route.href} href={route.href}>
                <div className="rounded-[22px] border border-white/60 bg-white/75 p-4 transition hover:border-[color:var(--color-brand)] hover:shadow-md">
                  <p className="font-semibold text-foreground">{route.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{route.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* CTA final */}
        <section className="mt-20">
          <Card className="overflow-hidden bg-[linear-gradient(155deg,rgba(31,102,97,0.08),rgba(237,248,245,0.9))]">
            <CardContent className="flex flex-col items-center gap-6 py-12 text-center">
              <Badge>Código abierto</Badge>
              <h2 className="font-display text-4xl leading-none tracking-tight text-foreground sm:text-5xl">
                Instálalo en tu equipo hoy
              </h2>
              <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
                FacturaIA es gratuito, open source y autogestionado.
                Clona el repositorio, levanta Docker y empieza a facturar
                en minutos.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Button asChild size="lg">
                  <Link href="/dashboard">
                    Explorar demo
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link href="https://github.com/proyectosai/facturaia" target="_blank" rel="noopener noreferrer">
                    <Github className="h-4 w-4" />
                    GitHub
                  </Link>
                </Button>
                <Button variant="ghost" size="lg" asChild>
                  <Link href="/instalacion">Guía de instalación</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
