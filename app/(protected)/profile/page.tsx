import Link from "next/link";

import { updateProfileAction } from "@/lib/actions/auth";
import { getCurrentAppUser, getCurrentProfile } from "@/lib/auth";
import { isDemoMode } from "@/lib/demo";
import { RouteToast } from "@/components/route-toast";
import { SubmitButton } from "@/components/submit-button";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{
    updated?: string;
    error?: string;
    tab?: string;
  }>;
}) {
  const profile = await getCurrentProfile();
  const appUser = await getCurrentAppUser();
  const demoMode = isDemoMode();
  const { updated, error, tab } = await searchParams;
  const defaultTab = tab === "environment" ? "environment" : "fiscal";

  return (
    <div className="space-y-6">
      {demoMode ? (
        <div className="status-banner">
          Estás en modo demo local. Puedes revisar la interfaz del perfil y del entorno privado, pero los cambios no se guardan.
        </div>
      ) : null}

      <RouteToast
        type={updated ? "success" : error ? "error" : "info"}
        message={
          updated
            ? "Perfil actualizado correctamente."
            : error
              ? decodeURIComponent(error)
              : null
        }
      />

      <div className="max-w-3xl space-y-3">
        <p className="section-kicker">Mi Perfil</p>
        <h1 className="font-display text-4xl leading-none tracking-tight text-foreground sm:text-5xl">
          Datos fiscales y control del entorno privado.
        </h1>
        <p className="text-lg leading-8 text-muted-foreground">
          Gestiona tu identidad de emisor y deja lista tu instalación privada para trabajar desde tu equipo o tu servidor.
        </p>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList className="flex w-full max-w-full gap-1 overflow-x-auto rounded-[28px] p-1 sm:grid sm:max-w-xl sm:grid-cols-2">
          <TabsTrigger className="min-w-[140px] sm:min-w-0" value="fiscal">Datos fiscales</TabsTrigger>
          <TabsTrigger className="min-w-[150px] sm:min-w-0" value="environment">Entorno privado</TabsTrigger>
        </TabsList>

        <TabsContent value="fiscal">
          <Card>
            <CardHeader>
              <CardTitle>Perfil de emisor</CardTitle>
              <CardDescription>
                Esta información se reutiliza al generar nuevas facturas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                action={demoMode ? undefined : updateProfileAction}
                className="grid gap-5 md:grid-cols-2"
              >
                <input
                  type="hidden"
                  name="existingLogoPath"
                  value={profile.logo_path ?? ""}
                />
                <input
                  type="hidden"
                  name="existingLogoUrl"
                  value={profile.logo_url ?? ""}
                />

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="fullName">Nombre o razón social</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    defaultValue={profile.full_name ?? ""}
                    placeholder="FacturaIA Studio S.L."
                    required
                    disabled={demoMode}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nif">NIF</Label>
                  <Input
                    id="nif"
                    name="nif"
                    defaultValue={profile.nif ?? ""}
                    placeholder="B12345678"
                    required
                    disabled={demoMode}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logo">Logo</Label>
                  <Input
                    id="logo"
                    name="logo"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    disabled={demoMode}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Dirección</Label>
                  <Input
                    id="address"
                    name="address"
                    defaultValue={profile.address ?? ""}
                    placeholder="Calle Alcalá 123, Madrid"
                    required
                    disabled={demoMode}
                  />
                </div>

                {profile.logo_url ? (
                  <div className="rounded-[24px] bg-[color:var(--color-panel)] p-4 md:col-span-2">
                    <div className="flex items-center gap-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={profile.logo_url}
                        alt="Logo actual"
                        className="h-16 w-16 rounded-2xl object-cover"
                      />
                      <div>
                        <p className="font-medium text-foreground">
                          Logo actual guardado
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Se usará automáticamente en las próximas facturas y en el PDF.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="md:col-span-2">
                  {demoMode ? (
                    <Button className="w-full sm:w-auto" type="button" variant="secondary" disabled>
                      Guardado desactivado en demo
                    </Button>
                  ) : (
                    <SubmitButton className="w-full sm:w-auto" pendingLabel="Guardando perfil...">
                      Guardar perfil
                    </SubmitButton>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="environment">
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Estado de la instalación</CardTitle>
                <CardDescription>
                  Resumen del entorno de uso privado de FacturaIA.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-[24px] bg-[color:var(--color-panel)] p-5">
                  <p className="text-sm text-muted-foreground">Modo de uso</p>
                  <p className="mt-2 text-3xl font-semibold text-foreground">
                    Instalación privada
                  </p>
                </div>

                <div className="rounded-[24px] bg-[color:var(--color-panel)] p-5">
                  <p className="text-sm text-muted-foreground">Cuenta local</p>
                  <p className="mt-2 text-xl font-semibold text-foreground">
                    {appUser.email}
                  </p>
                </div>

                <div className="rounded-[24px] bg-[color:var(--color-panel)] p-5">
                  <p className="text-sm text-muted-foreground">Despliegue</p>
                  <p className="mt-2 text-xl font-semibold text-foreground">
                    {demoMode ? "Demo local" : "Autogestionado"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Guía de uso privado</CardTitle>
                <CardDescription>
                  FacturaIA ya no está orientada a pagos ni a monetización integrada.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="rounded-[26px] bg-[color:var(--color-panel)] p-5 text-sm leading-6 text-muted-foreground">
                  La aplicación está planteada para que cada autónomo la instale en
                  su propio ordenador o en el servidor que prefiera, sin planes de
                  pago ni servicios comerciales obligatorios.
                </div>

                <div className="grid gap-3 sm:flex sm:flex-wrap">
                  <Button className="w-full sm:w-auto" variant="outline" asChild>
                    <Link href="/instalacion">Abrir guía de instalación</Link>
                  </Button>
                </div>

                <p className="text-sm leading-7 text-muted-foreground">
                  Puedes desplegar FacturaIA solo para ti, mantener tus claves bajo tu control
                  y activar únicamente las integraciones que realmente quieras usar.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
