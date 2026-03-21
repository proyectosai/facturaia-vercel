import Link from "next/link";
import {
  ArrowRight,
  Blocks,
  Cable,
  Mail,
  MessageSquareText,
  ReceiptText,
  ShieldCheck,
} from "lucide-react";

import {
  getModuleCatalog,
  getModuleCategoryLabel,
  getModuleLocalSupportMeta,
  getModuleMaturityMeta,
  getModuleStatusMeta,
} from "@/lib/modules";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const categoryIcons = {
  canales: MessageSquareText,
  resiliencia: ShieldCheck,
  documentos: ReceiptText,
  finanzas: Mail,
  cumplimiento: Cable,
} as const;

export default function ModulesPage() {
  const modules = getModuleCatalog();
  const activeModules = modules.filter((module) => module.status === "active");
  const nextModule = modules.find((module) => module.status === "next") ?? null;
  const dailyModules = modules.filter((module) => module.maturity === "daily");
  const pilotModules = modules.filter((module) => module.maturity === "pilot");
  const experimentalModules = modules.filter(
    (module) => module.maturity === "experimental",
  );

  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr] xl:items-end">
        <div className="max-w-4xl space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge>Módulos</Badge>
            <Badge variant="success">Instalación privada</Badge>
          </div>

          <div className="space-y-3">
            <p className="section-kicker">Catálogo modular</p>
            <h1 className="font-display text-5xl leading-none tracking-tight text-foreground">
              Instala poco a poco solo lo que realmente necesitas.
            </h1>
            <p className="text-lg leading-8 text-muted-foreground">
              FacturaIA deja de crecer como bloque único y pasa a organizarse por
              módulos opcionales. Aquí puedes ver qué piezas ya están activas,
              cuáles están a medio camino y cuál es el siguiente módulo del roadmap.
            </p>
          </div>
        </div>

        <Card className="overflow-hidden bg-[linear-gradient(150deg,rgba(255,255,255,0.95),rgba(232,246,242,0.9))]">
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-[24px] bg-white/82 p-4">
              <p className="text-sm text-muted-foreground">Activos hoy</p>
              <p className="mt-2 font-display text-3xl text-foreground">
                {activeModules.length}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Ya disponibles en el panel actual.
              </p>
            </div>
            <div className="rounded-[24px] bg-white/82 p-4">
              <p className="text-sm text-muted-foreground">Uso diario</p>
              <p className="mt-2 font-display text-3xl text-foreground">
                {dailyModules.length}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Lo más sensato para empezar.
              </p>
            </div>
            <div className="rounded-[24px] bg-white/82 p-4">
              <p className="text-sm text-muted-foreground">Enfoque</p>
              <p className="mt-2 font-display text-3xl text-foreground">Modular</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Más control, menos complejidad obligatoria.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="border-[color:var(--color-success-soft)] bg-[color:rgba(235,249,241,0.72)]">
          <CardContent className="space-y-3">
            <Badge variant="success">Listo para uso diario</Badge>
            <p className="font-semibold text-foreground">{dailyModules.length} módulos</p>
            <p className="text-sm leading-7 text-muted-foreground">
              Son los que mejor encajan para una instalación privada prudente:
              correo saliente, backups locales y piezas básicas de operativa.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3">
            <Badge>Piloto</Badge>
            <p className="font-semibold text-foreground">{pilotModules.length} módulos</p>
            <p className="text-sm leading-7 text-muted-foreground">
              Útiles para probar con clientes o en entorno interno, pero todavía
              no deberían convertirse en piezas críticas sin validación previa.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3">
            <Badge variant="secondary">Experimental</Badge>
            <p className="font-semibold text-foreground">
              {experimentalModules.length} módulos
            </p>
            <p className="text-sm leading-7 text-muted-foreground">
              Mantén aquí lo fiscal delicado o lo que todavía exige mucha
              revisión manual. No lo instales por inercia.
            </p>
          </CardContent>
        </Card>
      </section>

      <Card className="overflow-hidden bg-[linear-gradient(155deg,rgba(255,255,255,0.96),rgba(244,239,230,0.9))]">
        <CardHeader>
          <CardTitle>Cómo leer esta página sin engañarte</CardTitle>
          <CardDescription>
            Que un módulo exista en el panel no significa que deba activarse ya
            en una instalación real.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-3">
          {[
            {
              title: "Usar ya",
              description:
                "Lo diario y prudente: facturación, PDF, correo saliente, backups locales, cobros y auditoría básica.",
            },
            {
              title: "Usar con piloto",
              description:
                "Módulos que pueden aportar valor, pero conviene validar con datos de prueba y flujo completo.",
            },
            {
              title: "No activar todavía",
              description:
                "Lo fiscal más delicado o lo que sigue sin suficiente cierre técnico y operativo.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-[24px] bg-white/80 p-4 text-sm leading-7 text-muted-foreground"
            >
              <p className="font-semibold text-foreground">{item.title}</p>
              <p className="mt-2">{item.description}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="overflow-hidden bg-[linear-gradient(155deg,rgba(255,255,255,0.96),rgba(244,239,230,0.92))]">
        <CardHeader>
          <CardTitle>Núcleo recomendado para un autónomo no técnico</CardTitle>
          <CardDescription>
            Si solo quieres empezar a trabajar sin complicarte, instala primero
            lo mínimo y deja el resto para más adelante.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          {[
            "Perfil fiscal + nueva factura + listado de facturas.",
            "Correo saliente para enviar documentos reales.",
            "Backups locales antes de tocar módulos avanzados.",
            "Cobros y vencimientos como segundo bloque útil.",
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

      {nextModule ? (
        <Card className="overflow-hidden border-white/60 bg-[radial-gradient(circle_at_top_left,rgba(233,244,240,0.96),rgba(255,255,255,0.93)_40%,rgba(244,233,215,0.76)_100%)]">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="default">Siguiente módulo</Badge>
              <Badge variant="secondary">{getModuleCategoryLabel(nextModule.category)}</Badge>
            </div>
            <CardTitle className="font-display text-4xl text-foreground">
              {nextModule.title}
            </CardTitle>
            <CardDescription className="max-w-3xl text-base leading-7">
              {nextModule.summary}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              <div className="rounded-[26px] bg-white/82 p-5">
                <p className="text-sm font-semibold text-foreground">Qué hará</p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  {nextModule.summary}
                </p>
              </div>

              {nextModule.providers?.length ? (
                <div className="rounded-[26px] bg-white/82 p-5">
                  <p className="text-sm font-semibold text-foreground">
                    Proveedores previstos
                  </p>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">
                    {nextModule.providers.join(", ")}.
                  </p>
                </div>
              ) : null}
            </div>

            <div className="space-y-4">
              <div className="rounded-[26px] bg-[color:var(--color-panel)] p-5">
                <p className="text-sm font-semibold text-foreground">
                  Estado actual
                </p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  {nextModule.configuredLabel}
                </p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  Que sea el siguiente módulo del roadmap no implica que sea el
                  siguiente que debas activar en tu instalación.
                </p>
              </div>

              {nextModule.installSteps.length ? (
                <div className="rounded-[26px] bg-[color:var(--color-panel)] p-5">
                  <p className="text-sm font-semibold text-foreground">
                    Primeros pasos
                  </p>
                  <div className="mt-2 space-y-2">
                    {nextModule.installSteps.map((step) => (
                      <p
                        key={step}
                        className="text-sm leading-7 text-muted-foreground"
                      >
                        {step}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}

              {nextModule.docsPath ? (
                <div className="rounded-[26px] bg-[color:var(--color-panel)] p-5">
                  <p className="text-sm font-semibold text-foreground">
                    Documento de referencia
                  </p>
                  <p className="mt-2 break-all text-sm leading-7 text-muted-foreground">
                    {nextModule.docsPath}
                  </p>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <section className="space-y-4">
        <div>
          <p className="section-kicker">Mapa de módulos</p>
          <h2 className="font-display text-4xl text-foreground">
            Estado actual y orden de implementación
          </h2>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {modules.map((module) => {
            const statusMeta = getModuleStatusMeta(module.status);
            const maturityMeta = getModuleMaturityMeta(module.maturity);
            const localSupportMeta = getModuleLocalSupportMeta(module.localSupport);
            const CategoryIcon = categoryIcons[module.category] ?? Blocks;

            return (
              <Card key={module.id}>
                <CardContent className="space-y-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="rounded-2xl bg-[color:var(--color-brand-soft)] p-3 text-[color:var(--color-brand)]">
                        <CategoryIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          Orden {module.order}
                        </p>
                        <h3 className="mt-1 text-2xl font-semibold text-foreground">
                          {module.title}
                        </h3>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={statusMeta.badgeVariant}>{statusMeta.label}</Badge>
                      <Badge variant={maturityMeta.badgeVariant}>{maturityMeta.label}</Badge>
                      <Badge variant={localSupportMeta.badgeVariant}>
                        {localSupportMeta.label}
                      </Badge>
                      <Badge variant={module.configured ? "success" : "secondary"}>
                        {module.configuredLabel}
                      </Badge>
                    </div>
                  </div>

                  <p className="text-sm leading-7 text-muted-foreground">
                    {module.summary}
                  </p>

                  <div className="rounded-[24px] bg-[color:var(--color-panel)] p-4">
                    <p className="text-sm font-semibold text-foreground">
                      Estado real de madurez
                    </p>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">
                      {maturityMeta.description}
                    </p>
                    {module.readinessNote ? (
                      <p className="mt-2 text-sm leading-7 text-muted-foreground">
                        {module.readinessNote}
                      </p>
                    ) : null}
                  </div>

                  <div className="rounded-[24px] bg-[color:var(--color-panel)] p-4">
                    <p className="text-sm font-semibold text-foreground">
                      Compatibilidad con instalación local
                    </p>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">
                      {localSupportMeta.description}
                    </p>
                  </div>

                  {module.providers?.length ? (
                    <div className="rounded-[24px] bg-[color:var(--color-panel)] p-4">
                      <p className="text-sm font-semibold text-foreground">Proveedores</p>
                      <p className="mt-2 text-sm leading-7 text-muted-foreground">
                        {module.providers.join(", ")}.
                      </p>
                    </div>
                  ) : null}

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-[24px] bg-[color:var(--color-panel)] p-4">
                      <p className="text-sm font-semibold text-foreground">Requisitos</p>
                      <div className="mt-2 space-y-2">
                        {module.requirements.map((item) => (
                          <p key={item} className="text-sm leading-6 text-muted-foreground">
                            {item}
                          </p>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[24px] bg-[color:var(--color-panel)] p-4">
                      <p className="text-sm font-semibold text-foreground">Instalación resumida</p>
                      <div className="mt-2 space-y-2">
                        {module.installSteps.map((item) => (
                          <p key={item} className="text-sm leading-6 text-muted-foreground">
                            {item}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {module.routeHref ? (
                      <Button variant="outline" asChild>
                        <Link href={module.routeHref}>
                          Abrir módulo
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    ) : null}

                    {module.docsPath ? (
                      <div className="inline-flex items-center rounded-full bg-[color:var(--color-panel)] px-4 py-2 text-sm text-muted-foreground">
                        Documento: {module.docsPath}
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
