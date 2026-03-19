import Link from "next/link";

import { updateProfileAction } from "@/lib/actions/auth";
import { createCustomerPortalAction } from "@/lib/actions/stripe";
import {
  getCurrentAppUser,
  getCurrentProfile,
  getCurrentSubscription,
} from "@/lib/auth";
import { isDemoMode } from "@/lib/demo";
import { getEffectivePlan, getPlanLabel } from "@/lib/plans";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDateShort } from "@/lib/utils";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{
    updated?: string;
    error?: string;
    portal?: string;
    tab?: string;
  }>;
}) {
  const profile = await getCurrentProfile();
  const appUser = await getCurrentAppUser();
  const subscription = await getCurrentSubscription();
  const demoMode = isDemoMode();
  const { updated, error, portal, tab } = await searchParams;
  const effectivePlan = getEffectivePlan(appUser);
  const defaultTab = tab === "billing" ? "billing" : "fiscal";

  return (
    <div className="space-y-6">
      {demoMode ? (
        <div className="status-banner">
          Estás en modo demo local. Puedes revisar la interfaz del perfil y la suscripción, pero los cambios no se guardan ni se abre Stripe.
        </div>
      ) : null}

      <RouteToast
        type={updated ? "success" : error ? "error" : "info"}
        message={
          updated
            ? "Perfil actualizado correctamente."
            : error
              ? decodeURIComponent(error)
              : portal
                ? "Has vuelto del portal de cliente de Stripe."
                : null
        }
      />

      <div className="max-w-3xl space-y-3">
        <p className="section-kicker">Mi Perfil</p>
        <h1 className="font-display text-5xl leading-none tracking-tight text-foreground">
          Datos fiscales y control de suscripción.
        </h1>
        <p className="text-lg leading-8 text-muted-foreground">
          Gestiona tu identidad de emisor y abre el portal del cliente de Stripe
          para cambiar o cancelar tu plan.
        </p>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="fiscal">Datos fiscales</TabsTrigger>
          <TabsTrigger value="billing">Facturación</TabsTrigger>
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
                    <Button type="button" variant="secondary" disabled>
                      Guardado desactivado en demo
                    </Button>
                  ) : (
                    <SubmitButton pendingLabel="Guardando perfil...">
                      Guardar perfil
                    </SubmitButton>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Plan actual</CardTitle>
                <CardDescription>
                  Estado sincronizado con Stripe y almacenado en Supabase.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-[24px] bg-[color:var(--color-panel)] p-5">
                  <p className="text-sm text-muted-foreground">Plan</p>
                  <p className="mt-2 text-3xl font-semibold text-foreground">
                    {getPlanLabel(effectivePlan)}
                  </p>
                </div>

                <div className="rounded-[24px] bg-[color:var(--color-panel)] p-5">
                  <p className="text-sm text-muted-foreground">Renovación</p>
                  <p className="mt-2 text-xl font-semibold text-foreground">
                    {formatDateShort(appUser.current_period_end)}
                  </p>
                </div>

                <div className="rounded-[24px] bg-[color:var(--color-panel)] p-5">
                  <p className="text-sm text-muted-foreground">Estado Stripe</p>
                  <p className="mt-2 text-xl font-semibold text-foreground">
                    {subscription?.status ?? appUser.plan_status}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Gestión de suscripción</CardTitle>
                <CardDescription>
                  Cambia de plan, revisa cobros o cancela desde el portal seguro de Stripe.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center gap-3">
                  <Badge
                    variant={
                      effectivePlan === "premium"
                        ? "success"
                        : effectivePlan === "pro"
                          ? "default"
                          : "secondary"
                    }
                  >
                    {getPlanLabel(effectivePlan)}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {subscription?.billing_interval === "yearly"
                      ? "Ciclo anual"
                      : subscription?.billing_interval === "monthly"
                        ? "Ciclo mensual"
                        : "Sin ciclo activo"}
                  </span>
                </div>

                <div className="rounded-[26px] bg-[color:var(--color-panel)] p-5 text-sm leading-6 text-muted-foreground">
                  El portal del cliente permite actualizar tarjeta, cambiar de plan,
                  revisar próximos cobros y cancelar al final del periodo.
                </div>

                <div className="flex flex-wrap gap-3">
                  {demoMode ? (
                    <Button variant="secondary" disabled>
                      Portal desactivado en demo
                    </Button>
                  ) : (
                    <form action={createCustomerPortalAction}>
                      <SubmitButton pendingLabel="Abriendo portal...">
                        Abrir portal del cliente
                      </SubmitButton>
                    </form>
                  )}

                  <Button variant="outline" asChild>
                    <Link href="/pricing">Ver todos los planes</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
