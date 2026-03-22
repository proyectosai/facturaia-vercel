import type { Metadata } from "next";

import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "FacturaIA — Facturación española open source para autónomos",
  description:
    "Herramienta open source de facturación española con IVA/IRPF, PDF profesional, cobros, backups, CRM, firma documental, banca CSV, IA local y más. Self-hosted, privada, sin dependencias externas.",
  openGraph: {
    title: "FacturaIA — Facturación española open source",
    description:
      "20+ módulos: facturas, PDF, cobros, CRM, firma, banca, IA local. Self-hosted y gratuito para autónomos.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
