import {
  CheckCircle2,
  FileCheck2,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CHECKLIST_COLUMNS = [
  {
    title: "Antes de emitir",
    icon: FileCheck2,
    description:
      "Cierra los datos de la operación antes de tocar el PDF. Te ahorra rectificativas y correos innecesarios.",
    items: [
      "Comprueba NIF, razón social y dirección del cliente.",
      "Confirma la fecha de emisión y la numeración interna que vas a manejar.",
      "Verifica si la operación lleva IVA y si corresponde retención IRPF.",
    ],
  },
  {
    title: "Durante la redacción",
    icon: Sparkles,
    description:
      "La factura tiene que ser clara incluso sin contexto adicional. Cuanto menos ambigua sea la línea, menos fricción habrá al cobrar.",
    items: [
      "Usa descripciones concretas: servicio, periodo y alcance.",
      "Agrupa conceptos solo cuando tenga sentido comercial y fiscal.",
      "Revisa que cantidades y precios unitarios reflejen la operación real.",
    ],
  },
  {
    title: "Antes de enviar",
    icon: Send,
    description:
      "Última pasada para que el documento salga bien desde el primer envío.",
    items: [
      "Revisa el total final, el desglose de IVA y la retención si aplica.",
      "Comprueba que el logo, la URL pública y el PDF se ven correctos.",
      "Acompaña la factura con un email claro y un vencimiento visible.",
    ],
  },
];

const GOOD_PRACTICES = [
  "La descripción debe permitir entender la operación sin abrir otros documentos.",
  "Si tienes varias fases, puedes separarlas en líneas distintas para facilitar aprobación y seguimiento.",
  "Si dudas sobre el tratamiento fiscal concreto, valida la operación antes de emitirla.",
];

export function NewInvoiceChecklist() {
  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.94),rgba(233,244,240,0.84))]">
        <CardContent className="p-6 sm:p-8">
          <div className="max-w-4xl space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge>Checklist operativo</Badge>
              <Badge variant="secondary">Antes de emitir</Badge>
            </div>
            <h2 className="font-display text-4xl leading-none tracking-tight text-foreground">
              Un flujo corto para facturar con menos fricción.
            </h2>
            <p className="text-base leading-7 text-muted-foreground">
              Esta guía no sustituye la revisión fiscal, pero sí te ayuda a que la factura salga más limpia, más clara y mejor preparada para enviarla al cliente.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-3">
        {CHECKLIST_COLUMNS.map((column) => {
          const Icon = column.icon;

          return (
            <Card key={column.title} className="border-white/60 bg-white/84">
              <CardHeader className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-[color:var(--color-brand-soft)] p-3 text-[color:var(--color-brand)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle>{column.title}</CardTitle>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  {column.description}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {column.items.map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 rounded-[22px] bg-[color:var(--color-panel)] px-4 py-3"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--color-brand)]" />
                    <p className="text-sm leading-6 text-foreground">{item}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-white/60 bg-[color:rgba(19,45,52,0.94)] text-white">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white/10 p-3 text-white/90">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <CardTitle className="text-white">Buenas prácticas</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {GOOD_PRACTICES.map((item) => (
            <p key={item} className="flex items-start gap-3 text-sm leading-6 text-white/82">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-white/70" />
              {item}
            </p>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
