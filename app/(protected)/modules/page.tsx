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
              <p className="text-sm text-muted-foreground">Siguiente módulo</p>
              <p className="mt-2 font-display text-3xl text-foreground">
                {nextModule ? "01" : "--"}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {nextModule ? nextModule.title : "Roadmap por definir"}
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
                  Permitirá que la copia de seguridad local no se quede solo en el
                  disco del equipo o del VPS principal, sino que pueda enviarse a un
                  almacenamiento remoto elegido por el propio usuario.
                </p>
              </div>

              <div className="rounded-[26px] bg-white/82 p-5">
                <p className="text-sm font-semibold text-foreground">Proveedores previstos</p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  {(nextModule.providers ?? []).join(", ")}.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[26px] bg-[color:var(--color-panel)] p-5">
                <p className="text-sm font-semibold text-foreground">
                  Estado actual
                </p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  {nextModule.configuredLabel}
                </p>
              </div>

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
                      <Badge variant={module.configured ? "success" : "secondary"}>
                        {module.configuredLabel}
                      </Badge>
                    </div>
                  </div>

                  <p className="text-sm leading-7 text-muted-foreground">
                    {module.summary}
                  </p>

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
