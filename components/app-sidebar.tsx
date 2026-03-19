"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FilePlus2,
  FileText,
  Files,
  Home,
  LogOut,
  MessageSquareText,
  Settings2,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";

import { signOutAction } from "@/lib/actions/auth";
import type { Profile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SubmitButton } from "@/components/submit-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const navigation = [
  { href: "/dashboard", label: "Inicio", icon: Home },
  { href: "/new-invoice", label: "Nueva Factura", icon: FilePlus2 },
  { href: "/invoices", label: "Mis Facturas", icon: Files },
  { href: "/messages", label: "Mensajes", icon: MessageSquareText },
  { href: "/documents-ai", label: "Documentos", icon: FileText },
  { href: "/system", label: "Sistema", icon: Wrench },
  { href: "/instalacion", label: "Instalación", icon: ShieldCheck },
  { href: "/profile", label: "Mi Perfil", icon: Settings2 },
];

export function AppSidebar({
  children,
  profile,
  demoMode = false,
}: {
  children: React.ReactNode;
  profile: Profile;
  demoMode?: boolean;
}) {
  const pathname = usePathname();
  const initials =
    profile.full_name
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((segment) => segment[0]?.toUpperCase())
      .join("") || "FI";

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-[286px] shrink-0 border-r border-white/40 bg-[color:rgba(251,247,241,0.84)] px-5 py-6 backdrop-blur lg:block">
        <div className="sticky top-6 flex h-[calc(100vh-3rem)] flex-col">
          <Link href="/" className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--color-brand)] text-sm font-bold uppercase tracking-[0.2em] text-[color:var(--color-brand-foreground)]">
              FIA
            </div>
            <div>
              <p className="font-display text-2xl text-foreground">FacturaIA</p>
              <p className="text-sm text-muted-foreground">
                Facturación española para uso privado.
              </p>
            </div>
          </Link>

          <nav className="space-y-1.5">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                    active
                      ? "bg-[color:var(--color-brand)] text-[color:var(--color-brand-foreground)] shadow-lg shadow-[color:color-mix(in_oklab,var(--color-brand)_18%,transparent)]"
                      : "text-muted-foreground hover:bg-white/70 hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <Card className="mt-auto rounded-[30px] bg-[color:rgba(255,255,255,0.82)] p-5">
            <div className="flex items-center gap-3">
              <Avatar>
                {profile.logo_url ? <AvatarImage src={profile.logo_url} alt="Logo" /> : null}
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">
                  {profile.full_name || "Tu perfil"}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {profile.email}
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <Badge variant="success">Uso privado</Badge>
              <span className="flex items-center gap-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" />
                {demoMode ? "Modo demo" : "Self-hosted"}
              </span>
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              Instalación pensada para tu propio equipo, VPS o servidor doméstico.
            </p>

            <form action={signOutAction} className="mt-5">
              <SubmitButton
                variant="outline"
                className="w-full"
                pendingLabel="Saliendo..."
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </SubmitButton>
            </form>
          </Card>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-white/30 bg-[color:rgba(251,247,241,0.78)] px-4 py-3 backdrop-blur lg:hidden">
          <div className="mb-3 flex items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[color:var(--color-brand)] text-xs font-bold uppercase tracking-[0.18em] text-[color:var(--color-brand-foreground)]">
                FIA
              </div>
              <div>
                <p className="font-display text-xl text-foreground">FacturaIA</p>
                <p className="text-xs text-muted-foreground">Panel de control</p>
              </div>
            </Link>
            <Badge
              variant="success"
            >
              Uso privado
            </Badge>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {navigation.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition",
                    active
                      ? "bg-[color:var(--color-brand)] text-[color:var(--color-brand-foreground)]"
                      : "bg-white/70 text-muted-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
