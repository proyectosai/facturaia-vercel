import { Check, Minus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const rows = [
  {
    feature: "Facturas al mes",
    basic: "20",
    pro: "Ilimitadas",
    premium: "Ilimitadas",
  },
  {
    feature: "Mejoras IA al día",
    basic: "5",
    pro: "50",
    premium: "Ilimitadas",
  },
  {
    feature: "PDF profesional y QR público",
    basic: true,
    pro: true,
    premium: true,
  },
  {
    feature: "Envío por email",
    basic: true,
    pro: true,
    premium: true,
  },
  {
    feature: "Contratos asistidos por IA",
    basic: false,
    pro: true,
    premium: true,
  },
  {
    feature: "XML VeriFactu básico",
    basic: false,
    pro: true,
    premium: true,
  },
  {
    feature: "Soporte prioritario",
    basic: false,
    pro: false,
    premium: true,
  },
];

function renderValue(value: boolean | string) {
  if (typeof value === "string") {
    return <span className="font-medium text-foreground">{value}</span>;
  }

  return value ? (
    <Check className="h-4 w-4 text-[color:var(--color-success)]" />
  ) : (
    <Minus className="h-4 w-4 text-muted-foreground" />
  );
}

export function PricingComparison() {
  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="secondary">Comparativa</Badge>
          <span className="text-sm text-muted-foreground">
            Diferencias clave entre planes
          </span>
        </div>
        <div>
          <CardTitle>Qué cambia realmente al subir de plan</CardTitle>
          <CardDescription className="mt-2 max-w-3xl">
            Esta tabla resume lo que afecta de verdad al día a día de un autónomo:
            capacidad de emisión, uso de IA y herramientas operativas.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[220px]">Función</TableHead>
                <TableHead>Básico</TableHead>
                <TableHead>Pro</TableHead>
                <TableHead>Premium</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.feature}>
                  <TableCell className="font-medium text-foreground">
                    {row.feature}
                  </TableCell>
                  <TableCell>{renderValue(row.basic)}</TableCell>
                  <TableCell>{renderValue(row.pro)}</TableCell>
                  <TableCell>{renderValue(row.premium)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {[
            {
              title: "Sin permanencia técnica",
              description:
                "Puedes cambiar de plan desde Stripe y la cuenta se sincroniza en Supabase.",
            },
            {
              title: "Pensado para España",
              description:
                "El producto gira alrededor de IVA, IRPF, PDF profesional y flujo compatible con VeriFactu.",
            },
            {
              title: "Escalado claro",
              description:
                "Empieza en Básico, sube a Pro si trabajas a diario y reserva Premium para máxima automatización.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-[24px] bg-[color:var(--color-panel)] p-5"
            >
              <p className="font-semibold text-foreground">{item.title}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
