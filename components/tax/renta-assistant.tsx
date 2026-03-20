"use client";

import { useMemo, useState } from "react";
import {
  Bot,
  FileSearch,
  Landmark,
  LoaderCircle,
  Send,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";

import {
  TAX_ASSISTANT_CHECKLIST_GROUPS,
  TAX_ASSISTANT_OFFICIAL_LINKS,
  TAX_ASSISTANT_QUICK_PROMPTS,
} from "@/lib/tax-assistant";
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
import { Textarea } from "@/components/ui/textarea";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

export function RentaAssistant({
  defaultTaxYear,
  modelLabel,
  hasLocalAi,
}: {
  defaultTaxYear: string;
  modelLabel: string;
  hasLocalAi: boolean;
}) {
  const [clientName, setClientName] = useState("");
  const [taxYear, setTaxYear] = useState(defaultTaxYear);
  const [clientSummary, setClientSummary] = useState("");
  const [providedDocuments, setProvidedDocuments] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Soy un asistente de apoyo para expedientes de IRPF / Renta en Espana. Puedo ayudarte a ordenar documentacion, detectar huecos, preparar checklist y resumir riesgos. No cierro la declaracion por ti: el contraste final debe hacerse siempre en AEAT, Renta WEB y con revision profesional.",
    },
  ]);

  const canSubmit = message.trim().length >= 12 && !loading;
  const contextSummary = useMemo(
    () =>
      [
        clientName.trim() ? `Cliente: ${clientName.trim()}` : null,
        taxYear.trim() ? `Ejercicio: ${taxYear.trim()}` : null,
        clientSummary.trim() ? "Resumen del caso cargado." : null,
        providedDocuments.trim() ? "Documentacion cargada." : null,
      ]
        .filter(Boolean)
        .join(" · "),
    [clientName, taxYear, clientSummary, providedDocuments],
  );

  async function sendPrompt(promptText?: string) {
    const finalMessage = (promptText ?? message).trim();

    if (finalMessage.length < 12) {
      toast.error("Describe mejor la duda o el caso fiscal.");
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: finalMessage,
    };

    setMessages((current) => [...current, userMessage]);
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/ai/renta-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: finalMessage,
          clientName: clientName.trim() || undefined,
          taxYear: taxYear.trim() || undefined,
          clientSummary: clientSummary.trim() || undefined,
          providedDocuments: providedDocuments.trim() || undefined,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        replyText?: string;
        provider?: string;
        model?: string;
      };

      if (!response.ok || !payload.replyText) {
        throw new Error(
          payload.error ??
            "El asistente fiscal no ha podido responder a esta consulta.",
        );
      }

      const replyText = payload.replyText;

      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: replyText,
        },
      ]);

      toast.success(
        payload.provider && payload.model
          ? `Respuesta generada con ${payload.provider} · ${payload.model}`
          : "Respuesta generada",
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se ha podido consultar el asistente fiscal.";
      setMessages((current) => current.slice(0, -1));
      setMessage(finalMessage);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap gap-2">
              <Badge>Expediente guiado</Badge>
              <Badge variant={hasLocalAi ? "success" : "secondary"}>
                {hasLocalAi ? modelLabel : "Modo guiado sin IA"}
              </Badge>
            </div>
            <CardTitle>Contexto del expediente</CardTitle>
            <CardDescription>
              Cuanto mejor describas el caso, más útil será la respuesta. Si no
              tienes la IA local levantada, el módulo cae a plantillas internas prudentes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="clientName">Cliente</Label>
              <Input
                id="clientName"
                value={clientName}
                onChange={(event) => setClientName(event.target.value)}
                placeholder="Nombre y apellidos o referencia interna"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="taxYear">Ejercicio fiscal</Label>
              <Input
                id="taxYear"
                value={taxYear}
                onChange={(event) => setTaxYear(event.target.value)}
                placeholder="2025"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientSummary">Resumen del caso</Label>
              <Textarea
                id="clientSummary"
                value={clientSummary}
                onChange={(event) => setClientSummary(event.target.value)}
                rows={6}
                placeholder="Actividad, situación familiar, alquileres, ganancias patrimoniales, cambios relevantes del ejercicio..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="providedDocuments">Documentación aportada</Label>
              <Textarea
                id="providedDocuments"
                value={providedDocuments}
                onChange={(event) => setProvidedDocuments(event.target.value)}
                rows={5}
                placeholder="Datos fiscales AEAT, certificados, modelos, escrituras, extractos, alquileres, justificantes..."
              />
            </div>

            <div className="rounded-[24px] bg-[color:var(--color-panel)] p-4 text-sm leading-7 text-muted-foreground">
              <p className="font-semibold text-foreground">Contexto activo</p>
              <p className="mt-2">{contextSummary || "Sin contexto adicional todavía."}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden bg-[linear-gradient(150deg,rgba(255,255,255,0.95),rgba(240,246,238,0.9))]">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Uso profesional asistido</Badge>
              <Badge variant="secondary">No sustituye AEAT</Badge>
            </div>
            <CardTitle className="font-display text-4xl leading-none text-foreground">
              Ayuda a preparar expedientes de renta sin vender humo.
            </CardTitle>
            <CardDescription className="max-w-2xl text-base leading-7">
              Este módulo está pensado para un asesor o autónomo fiscal que
              necesita ordenar información, detectar huecos y preparar el trabajo
              antes de revisar la declaración final en Renta WEB.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-[24px] bg-white/85 p-4">
              <Bot className="h-5 w-5 text-[color:var(--color-brand)]" />
              <p className="mt-3 font-semibold text-foreground">Asistencia de expediente</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Resume casos, pide datos pendientes y propone el siguiente paso.
              </p>
            </div>
            <div className="rounded-[24px] bg-white/85 p-4">
              <FileSearch className="h-5 w-5 text-[color:var(--color-brand)]" />
              <p className="mt-3 font-semibold text-foreground">Checklist y riesgos</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Identifica soportes faltantes y puntos delicados antes de presentar.
              </p>
            </div>
            <div className="rounded-[24px] bg-white/85 p-4">
              <ShieldAlert className="h-5 w-5 text-[color:var(--color-brand)]" />
              <p className="mt-3 font-semibold text-foreground">Límites claros</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                No confirma declaraciones ni sustituye la revisión profesional o la AEAT.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Tabs defaultValue="chat" className="space-y-4">
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="chat">Chat de trabajo</TabsTrigger>
          <TabsTrigger value="checklist">Checklist</TabsTrigger>
          <TabsTrigger value="sources">Fuentes oficiales</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Prompts rápidos</CardTitle>
              <CardDescription>
                Úsalos como punto de partida y luego concreta el expediente.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              {TAX_ASSISTANT_QUICK_PROMPTS.map((prompt) => (
                <Button
                  key={prompt}
                  variant="outline"
                  onClick={() => void sendPrompt(prompt)}
                  disabled={loading}
                >
                  {prompt}
                </Button>
              ))}
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Card>
              <CardHeader>
                <CardTitle>Conversación</CardTitle>
                <CardDescription>
                  Trabaja cada respuesta como borrador técnico, no como validación final.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="max-h-[32rem] space-y-4 overflow-y-auto rounded-[28px] bg-[color:var(--color-panel)] p-4">
                  {messages.map((item) => (
                    <div
                      key={item.id}
                      className={`rounded-[24px] p-4 text-sm leading-7 ${
                        item.role === "assistant"
                          ? "bg-white/90 text-foreground"
                          : "bg-[color:var(--color-brand)] text-[color:var(--color-brand-foreground)]"
                      }`}
                    >
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] opacity-70">
                        {item.role === "assistant" ? "Asistente" : "Tu consulta"}
                      </p>
                      <p className="whitespace-pre-wrap">{item.content}</p>
                    </div>
                  ))}

                  {loading ? (
                    <div className="flex items-center gap-3 rounded-[24px] bg-white/90 p-4 text-sm text-muted-foreground">
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Preparando respuesta del expediente...
                    </div>
                  ) : null}
                </div>

                <div className="space-y-3">
                  <Label htmlFor="taxMessage">Consulta</Label>
                  <Textarea
                    id="taxMessage"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    rows={6}
                    placeholder="Ejemplo: ordéname una checklist para revisar la renta de un autónomo con alquileres, rendimientos del trabajo y venta de acciones..."
                  />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                      {message.trim().length}/4000 caracteres
                    </p>
                    <Button
                      onClick={() => void sendPrompt()}
                      disabled={!canSubmit}
                    >
                      {loading ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      Consultar asistente
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Cómo usarlo bien</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm leading-7 text-muted-foreground">
                  <p>1. Resume el perfil del cliente y el ejercicio.</p>
                  <p>2. Lista la documentación que ya tienes.</p>
                  <p>3. Pide checklist, riesgos o datos pendientes.</p>
                  <p>4. Contrasta siempre en AEAT y Renta WEB antes de cerrar la declaración.</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Qué no hace</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm leading-7 text-muted-foreground">
                  <p>No confirma que una renta esté bien presentada.</p>
                  <p>No sustituye la revisión del manual práctico ni la comprobación en AEAT.</p>
                  <p>No debe usarse como única fuente para resolver incidencias fiscales delicadas.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="checklist" className="grid gap-4 xl:grid-cols-3">
          {TAX_ASSISTANT_CHECKLIST_GROUPS.map((group) => (
            <Card key={group.title}>
              <CardHeader>
                <CardTitle className="text-2xl">{group.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {group.items.map((item) => (
                  <div
                    key={item}
                    className="rounded-[22px] bg-[color:var(--color-panel)] p-4 text-sm leading-7 text-muted-foreground"
                  >
                    {item}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="sources" className="grid gap-4 xl:grid-cols-2">
          {TAX_ASSISTANT_OFFICIAL_LINKS.map((link) => (
            <Card key={link.href}>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-[color:var(--color-brand-soft)] p-3 text-[color:var(--color-brand)]">
                    <Landmark className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{link.title}</p>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">
                      {link.description}
                    </p>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex text-sm font-semibold text-[color:var(--color-brand)]"
                    >
                      Abrir fuente oficial
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
