import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const items = [
  {
    question: "¿Puedo cambiar de plan más adelante?",
    answer:
      "Sí. El cambio se hace desde Stripe y FacturaIA sincroniza la suscripción con Supabase cuando llega el webhook.",
  },
  {
    question: "¿Qué pasa si supero el límite del Básico?",
    answer:
      "Se bloquea la emisión al alcanzar las 20 facturas del mes o las 5 mejoras IA del día, y la interfaz te propone subir a Pro.",
  },
  {
    question: "¿Mensual y anual tienen las mismas funciones?",
    answer:
      "Sí. La diferencia es económica: el anual reduce coste total y mantiene exactamente el mismo alcance funcional.",
  },
  {
    question: "¿La gestión del cobro queda dentro de FacturaIA?",
    answer:
      "La suscripción se gestiona en Stripe. FacturaIA consume ese estado para mostrar plan, renovación y gating de funciones.",
  },
];

export function PricingFaq() {
  return (
    <Card className="overflow-hidden bg-[linear-gradient(155deg,rgba(255,255,255,0.95),rgba(244,238,228,0.92))]">
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="secondary">FAQ</Badge>
          <span className="text-sm text-muted-foreground">
            Respuestas cortas para decidir sin fricción
          </span>
        </div>
        <div>
          <CardTitle>Lo que suele preguntar un autónomo antes de pagar</CardTitle>
          <CardDescription className="mt-2 max-w-3xl">
            Sin tecnicismos innecesarios. Aquí está lo importante sobre cambio de plan, límites y operativa.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-2">
        {items.map((item) => (
          <div
            key={item.question}
            className="rounded-[26px] border border-white/60 bg-white/80 p-5"
          >
            <p className="text-lg font-semibold text-foreground">{item.question}</p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {item.answer}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
