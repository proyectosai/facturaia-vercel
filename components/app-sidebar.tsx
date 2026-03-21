"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArchiveRestore,
  Blocks,
  ContactRound,
  CircleDollarSign,
  ClipboardList,
  FileCode2,
  FilePlus2,
  FileSignature,
  FileText,
  Files,
  Home,
  Landmark,
  Lightbulb,
  LogOut,
  Mail,
  MessageSquareText,
  ReceiptText,
  Search,
  ScrollText,
  Settings2,
  ShieldCheck,
  Sparkles,
  Scale,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import { signOutAction } from "@/lib/actions/auth";
import type { Profile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SubmitButton } from "@/components/submit-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type NavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

type NavigationSection = {
  title: string;
  hint: string;
  items: NavigationItem[];
};

const navigationSections: NavigationSection[] = [
  {
    title: "Núcleo",
    hint: "Usar ya",
    items: [
      { href: "/dashboard", label: "Inicio", icon: Home },
      { href: "/primeros-pasos", label: "Primeros pasos", icon: ClipboardList },
      { href: "/new-invoice", label: "Nueva factura", icon: FilePlus2 },
      { href: "/invoices", label: "Mis facturas", icon: Files },
      { href: "/cobros", label: "Cobros", icon: CircleDollarSign },
      { href: "/mail", label: "Correo", icon: Mail },
      { href: "/backups", label: "Backups", icon: ArchiveRestore },
      { href: "/profile", label: "Mi perfil", icon: Settings2 },
    ],
  },
  {
    title: "Por fases",
    hint: "Piloto o activación gradual",
    items: [
      { href: "/presupuestos", label: "Presupuestos", icon: ReceiptText },
      { href: "/firmas", label: "Firmas", icon: FileSignature },
      { href: "/clientes", label: "Clientes", icon: ContactRound },
      { href: "/gastos", label: "Gastos", icon: Wallet },
      { href: "/banca", label: "Banca", icon: Landmark },
      { href: "/messages", label: "Mensajes", icon: MessageSquareText },
      { href: "/documents-ai", label: "Documentos", icon: FileText },
      { href: "/estudio-ia", label: "Estudio IA", icon: Search },
      { href: "/facturae", label: "Facturae", icon: FileCode2 },
      { href: "/renta", label: "IRPF / Renta", icon: Scale },
    ],
  },
  {
    title: "Control",
    hint: "Sistema y soporte",
    items: [
      { href: "/modules", label: "Módulos", icon: Blocks },
      { href: "/instalacion", label: "Instalación", icon: ShieldCheck },
      { href: "/auditoria", label: "Auditoría", icon: ScrollText },
      { href: "/feedback", label: "Feedback", icon: Lightbulb },
      { href: "/system", label: "Sistema", icon: Wrench },
    ],
  },
];

const mobileNavigation = [
  { href: "/dashboard", label: "Inicio", icon: Home },
  { href: "/new-invoice", label: "Factura", icon: FilePlus2 },
  { href: "/invoices", label: "Historial", icon: Files },
  { href: "/cobros", label: "Cobros", icon: CircleDollarSign },
  { href: "/modules", label: "Módulos", icon: Blocks },
  { href: "/profile", label: "Perfil", icon: Settings2 },
];

const allNavigationItems = navigationSections.flatMap((section) => section.items);

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
  const activeHiddenMobileItem =
    allNavigationItems.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`)) ?? null;
  const visibleMobileItems = mobileNavigation.some(
    (item) => item.href === activeHiddenMobileItem?.href,
  )
    ? mobileNavigation
    : activeHiddenMobileItem
      ? [...mobileNavigation, activeHiddenMobileItem]
      : mobileNavigation;
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

          <nav className="space-y-5">
            {navigationSections.map((section) => (
              <div key={section.title} className="space-y-1.5">
                <div className="px-3 pb-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/70">
                    {section.title}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{section.hint}</p>
                </div>
                {section.items.map((item) => {
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
              </div>
            ))}
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

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 overflow-hidden border-b border-white/30 bg-[color:rgba(251,247,241,0.78)] px-4 py-3 backdrop-blur lg:hidden">
          <div className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-3">
            <Link href="/" className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[color:var(--color-brand)] text-xs font-bold uppercase tracking-[0.18em] text-[color:var(--color-brand-foreground)]">
                FIA
              </div>
              <div className="min-w-0">
                <p className="font-display text-xl text-foreground">FacturaIA</p>
                <p className="text-xs text-muted-foreground">Núcleo primero</p>
              </div>
            </Link>
            <Badge
              variant="success"
              className="shrink-0"
            >
              Uso privado
            </Badge>
          </div>

          <div className="flex w-full min-w-0 gap-2 overflow-x-auto pb-1">
            {visibleMobileItems.map((item) => {
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
