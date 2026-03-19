import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";

import { Providers } from "@/components/providers";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "FacturaIA",
  description:
    "Aplicación self-hosted de facturación en español con Next.js 15, Supabase, SMTP o Resend, LM Studio y generación de PDF profesional.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${plusJakartaSans.variable} ${fraunces.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
