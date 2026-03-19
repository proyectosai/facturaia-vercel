import { ArrowUpRight, BookText, Landmark, ReceiptText, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const LEGAL_SECTIONS = [
  {
    title: "Obligaciones de facturación",
    description:
      "Normativa base que conviene tener a mano cuando preparas facturas para clientes en España.",
    items: [
      {
        title: "Real Decreto 1619/2012, de 30 de noviembre",
        summary:
          "Reglamento de facturación. Es la referencia principal sobre tipos de factura, contenido obligatorio y facturas simplificadas.",
        source: "BOE",
        href: "https://www.boe.es/buscar/act.php?id=BOE-A-2012-14696",
      },
      {
        title: "Ley 37/1992, de 28 de diciembre, del IVA",
        summary:
          "Base legal del IVA en España. Útil para contrastar el tratamiento general de las operaciones y sus tipos impositivos.",
        source: "BOE",
        href: "https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740",
      },
      {
        title: "Real Decreto 439/2007, de 30 de marzo, Reglamento del IRPF",
        summary:
          "Marco reglamentario del IRPF. Te sirve para revisar el contexto normativo de retenciones aplicables en actividades profesionales.",
        source: "BOE",
        href: "https://www.boe.es/buscar/act.php?id=BOE-A-2007-6820",
      },
    ],
  },
  {
    title: "VeriFactu y software de facturación",
    description:
      "Referencias oficiales para entender el marco legal del software de facturación y su adaptación técnica.",
    items: [
      {
        title: "Ley 11/2021, de 9 de julio, de prevención y lucha contra el fraude fiscal",
        summary:
          "Introduce la base legal de las exigencias sobre software de facturación y sistemas que eviten alteraciones irregulares.",
        source: "BOE",
        href: "https://www.boe.es/buscar/act.php?id=BOE-A-2021-11473",
      },
      {
        title: "Real Decreto 1007/2023, de 5 de diciembre",
        summary:
          "Reglamento de requisitos de los sistemas informáticos de facturación. Es la pieza central del marco VeriFactu.",
        source: "BOE",
        href: "https://www.boe.es/buscar/act.php?id=BOE-A-2023-24840",
      },
      {
        title: "Orden HAC/1177/2024, de 17 de octubre",
        summary:
          "Desarrollo técnico y funcional de los requisitos del reglamento: formato, huella, encadenamiento, QR y demás especificaciones.",
        source: "BOE",
        href: "https://www.boe.es/buscar/doc.php?id=BOE-A-2024-22138",
      },
      {
        title: "Nota informativa AEAT sobre ampliación del plazo de adaptación",
        summary:
          "A 19 de marzo de 2026, el último criterio oficial que he verificado fija el 1 de enero de 2027 para contribuyentes del IS y el 1 de julio de 2027 para el resto de obligados.",
        source: "AEAT",
        href: "https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu/nota-informativa-ampliacion-plazo-adaptacion-facturacion.html",
      },
    ],
  },
  {
    title: "Factura electrónica y crecimiento empresarial",
    description:
      "Normativa oficial vinculada a la implantación progresiva de la factura electrónica entre empresarios y profesionales.",
    items: [
      {
        title: "Ley 18/2022, de 28 de septiembre, de creación y crecimiento de empresas",
        summary:
          "Conocida como Ley Crea y Crece. Es la referencia legal clave para la futura factura electrónica obligatoria B2B en España.",
        source: "BOE",
        href: "https://www.boe.es/buscar/act.php?id=BOE-A-2022-15818",
      },
    ],
  },
] as const;

export function InvoiceLegalReference() {
  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.94),rgba(244,233,215,0.84))]">
        <CardContent className="p-6 sm:p-8">
          <div className="max-w-4xl space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge>Legislación oficial</Badge>
              <Badge variant="secondary">BOE + AEAT</Badge>
            </div>
            <h2 className="font-display text-4xl leading-none tracking-tight text-foreground">
              Referencias legales oficiales para facturar en España.
            </h2>
            <p className="text-base leading-7 text-muted-foreground">
              Este bloque reúne enlaces directos a normativa y criterios oficiales. No sustituye asesoramiento profesional, pero sí evita trabajar a ciegas.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/60 bg-[color:rgba(19,45,52,0.94)] text-white">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-white/10 p-3 text-white/90">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <p className="text-xs uppercase tracking-[0.18em] text-white/70">
                Fechas verificadas
              </p>
            </div>
            <p className="max-w-3xl text-sm leading-6 text-white/82">
              Según la nota informativa oficial de la AEAT que he verificado, a fecha de <strong>19 de marzo de 2026</strong> la adaptación de los sistemas informáticos de facturación queda situada en <strong>1 de enero de 2027</strong> para contribuyentes del Impuesto sobre Sociedades y en <strong>1 de julio de 2027</strong> para el resto de obligados.
            </p>
          </div>
          <a
            href="https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu/nota-informativa-ampliacion-plazo-adaptacion-facturacion.html"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[color:var(--color-brand)] transition hover:bg-white/90"
          >
            Ver nota oficial
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </CardContent>
      </Card>

      <div className="grid gap-5">
        {LEGAL_SECTIONS.map((section, sectionIndex) => {
          const SectionIcon =
            sectionIndex === 0
              ? ReceiptText
              : sectionIndex === 1
                ? BookText
                : Landmark;

          return (
            <Card key={section.title} className="border-white/60 bg-white/84">
              <CardHeader className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-[color:var(--color-brand-soft)] p-3 text-[color:var(--color-brand)]">
                    <SectionIcon className="h-5 w-5" />
                  </div>
                  <CardTitle>{section.title}</CardTitle>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  {section.description}
                </p>
              </CardHeader>
              <CardContent className="grid gap-4 xl:grid-cols-2">
                {section.items.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-[26px] border border-white/70 bg-[linear-gradient(145deg,rgba(255,255,255,0.95),rgba(233,244,240,0.55))] p-5"
                  >
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">{item.source}</Badge>
                    </div>
                    <p className="mt-3 text-lg font-semibold text-foreground">
                      {item.title}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      {item.summary}
                    </p>
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--color-brand)] transition hover:opacity-80"
                    >
                      Abrir fuente oficial
                      <ArrowUpRight className="h-4 w-4" />
                    </a>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
