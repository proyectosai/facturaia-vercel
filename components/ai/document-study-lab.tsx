"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import {
  FileText,
  LoaderCircle,
  NotebookPen,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import type {
  StudyDocumentCitation,
  StudyDocumentRecord,
} from "@/lib/types";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type StudyAnswerPayload = {
  answerText: string;
  provider: string;
  model: string;
  citations: StudyDocumentCitation[];
};

function formatSourceKind(value: StudyDocumentRecord["source_kind"]) {
  return {
    note: "Nota manual",
    plain_text: "TXT",
    markdown: "Markdown",
    pdf: "PDF",
  }[value];
}

function formatStudyLength(value: number) {
  return new Intl.NumberFormat("es-ES").format(value);
}

export function DocumentStudyLab({
  initialDocuments,
  model,
  localAiConfigured,
  initialAiUsed,
  aiLimit,
  demoMode,
}: {
  initialDocuments: StudyDocumentRecord[];
  model: string;
  localAiConfigured: boolean;
  initialAiUsed: number;
  aiLimit: number | null;
  demoMode: boolean;
}) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [activeTab, setActiveTab] = useState<"note" | "file">("note");
  const [title, setTitle] = useState("");
  const [noteText, setNoteText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [question, setQuestion] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isQuerying, setIsQuerying] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [answer, setAnswer] = useState<StudyAnswerPayload | null>(null);

  async function refreshDocumentsFromResponse(response: Response) {
    const payload = (await response.json().catch(() => null)) as
      | {
          error?: string;
          documents?: StudyDocumentRecord[];
          document?: StudyDocumentRecord;
          deletedId?: string;
        }
      | null;

    if (!response.ok) {
      throw new Error(
        payload?.error ?? "No se ha podido completar la operación de estudio documental.",
      );
    }

    if (payload?.documents) {
      setDocuments(payload.documents);
    }

    return payload;
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (demoMode) {
      toast.error("La demo pública no guarda documentos. Usa una instalación local real.");
      return;
    }

    if (activeTab === "note" && noteText.trim().length < 40) {
      toast.error("La nota necesita más contexto para que luego se pueda consultar.");
      return;
    }

    if (activeTab === "file" && !selectedFile) {
      toast.error("Selecciona antes un archivo TXT, MD o PDF.");
      return;
    }

    setIsSaving(true);

    try {
      const formData = new FormData();

      if (title.trim()) {
        formData.append("title", title.trim());
      }

      if (activeTab === "note") {
        formData.append("text", noteText.trim());
      } else if (selectedFile) {
        formData.append("file", selectedFile);
      }

      const response = await fetch("/api/ai/study/documents", {
        method: "POST",
        body: formData,
      });
      const payload = await refreshDocumentsFromResponse(response);

      setTitle("");
      setNoteText("");
      setSelectedFile(null);
      setAnswer(null);

      toast.success(
        payload?.document
          ? `Documento guardado: ${payload.document.title}`
          : "Documento guardado correctamente.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se ha podido guardar el documento.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(documentId: string) {
    if (demoMode) {
      toast.error("La demo pública no elimina documentos.");
      return;
    }

    setDeletingId(documentId);

    try {
      const response = await fetch("/api/ai/study/documents", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ documentId }),
      });

      await refreshDocumentsFromResponse(response);

      if (answer?.citations.some((citation) => citation.document_id === documentId)) {
        setAnswer(null);
      }

      toast.success("Documento eliminado del estudio local.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se ha podido eliminar el documento.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  async function handleQuery() {
    if (demoMode) {
      toast.error("La demo pública no ejecuta consultas reales sobre documentos.");
      return;
    }

    if (question.trim().length < 10) {
      toast.error("Describe mejor la consulta documental que quieres resolver.");
      return;
    }

    setIsQuerying(true);

    try {
      const response = await fetch("/api/ai/study/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: question.trim(),
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | StudyAnswerPayload
        | null;

      if (!response.ok || !payload || !("answerText" in payload)) {
        throw new Error(
          payload && "error" in payload && payload.error
            ? payload.error
            : "No se ha podido resolver la consulta documental.",
        );
      }

      setAnswer(payload);
      toast.success("Consulta documental completada.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se ha podido resolver la consulta documental.",
      );
    } finally {
      setIsQuerying(false);
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setSelectedFile(event.target.files?.[0] ?? null);
  }

  const aiUsageLabel =
    aiLimit === null
      ? `${initialAiUsed} consultas IA registradas hoy`
      : `${initialAiUsed} / ${aiLimit} consultas hoy`;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.12fr_0.88fr]">
        <Card className="overflow-hidden bg-[linear-gradient(160deg,rgba(255,255,255,0.98),rgba(233,244,240,0.9))]">
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="success">Implementado</Badge>
              <Badge variant="secondary">Local-first</Badge>
            </div>
            <div className="space-y-3">
              <CardTitle className="font-display text-4xl text-foreground">
                Estudia documentación real con fragmentos citables.
              </CardTitle>
              <CardDescription className="text-base leading-7">
                Esta primera entrega no pretende ser una memoria multi-anual ni un
                RAG completo. Guarda notas, TXT, Markdown y PDF extraído en tu
                instalación, recupera fragmentos relevantes y consulta a LM Studio
                con citas visibles.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-[24px] bg-white/82 p-4">
              <p className="text-sm text-muted-foreground">Documentos</p>
              <p className="mt-2 font-display text-3xl text-foreground">
                {documents.length}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Persistidos para este usuario.
              </p>
            </div>
            <div className="rounded-[24px] bg-white/82 p-4">
              <p className="text-sm text-muted-foreground">Modelo actual</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{model}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {localAiConfigured ? "LM Studio detectado" : "Fallback local sin LLM"}
              </p>
            </div>
            <div className="rounded-[24px] bg-white/82 p-4">
              <p className="text-sm text-muted-foreground">Uso IA hoy</p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {aiUsageLabel}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Solo cuenta cuando se usa LM Studio de verdad.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[color:var(--color-brand)]" />
              Cómo leer este módulo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-7 text-muted-foreground">
            <p>
              Guarda texto extraído y metadatos locales para que las respuestas se
              apoyen en contenido persistido, no en memoria opaca del modelo.
            </p>
            <p>
              Hoy devuelve citas útiles por fragmentos. La capa de embeddings,
              memoria multi-año y RAG más profundo sigue siendo una fase posterior.
            </p>
            <p>
              Si activas cifrado local, el índice y los textos del módulo también
              quedan cifrados con la misma passphrase del núcleo privado.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.98fr_1.02fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-[color:var(--color-brand)]" />
              Ingesta documental
            </CardTitle>
            <CardDescription>
              Puedes cargar una nota de trabajo o subir un TXT, Markdown o PDF.
              En esta fase se conserva el texto extraído y su trazabilidad básica.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSave}>
              <Tabs
                value={activeTab}
                onValueChange={(value) => setActiveTab(value as "note" | "file")}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="note">Nota manual</TabsTrigger>
                  <TabsTrigger value="file">Archivo</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="space-y-2">
                <Label htmlFor="study-title">Título</Label>
                <Input
                  id="study-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Ej.: Manual fiscal 2025, dossier cliente, notas reunión..."
                />
              </div>

              {activeTab === "note" ? (
                <div className="space-y-2">
                  <Label htmlFor="study-note">Texto o nota de trabajo</Label>
                  <Textarea
                    id="study-note"
                    value={noteText}
                    onChange={(event) => setNoteText(event.target.value)}
                    placeholder="Pega aquí una nota larga, criterios de revisión, extractos de AEAT o el texto base de un expediente..."
                    rows={10}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="study-file">Archivo</Label>
                  <Input
                    id="study-file"
                    type="file"
                    accept=".txt,.md,.markdown,application/pdf,text/plain,text/markdown"
                    onChange={handleFileChange}
                  />
                  <p className="text-sm text-muted-foreground">
                    {selectedFile
                      ? `Seleccionado: ${selectedFile.name}`
                      : "Acepta TXT, MD y PDF. Los PDF se convierten a texto para poder citarlos."}
                  </p>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isSaving}>
                {isSaving ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : activeTab === "note" ? (
                  <NotebookPen className="h-4 w-4" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {activeTab === "note" ? "Guardar nota local" : "Importar archivo"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-[color:var(--color-brand)]" />
              Consulta con citas
            </CardTitle>
            <CardDescription>
              Pregunta algo operativo sobre la documentación ya cargada. Si LM
              Studio está disponible, redactará la respuesta; si no, verás los
              fragmentos recuperados para revisar manualmente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="study-question">Consulta</Label>
              <Textarea
                id="study-question"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Ej.: ¿Qué documentación habla del reparto de dividendos de 2025? ¿Dónde se menciona la fecha de aceptación del presupuesto? ¿Qué riesgos fiscales aparecen en estas notas?"
                rows={8}
              />
            </div>

            <Button
              type="button"
              className="w-full"
              disabled={isQuerying || documents.length === 0}
              onClick={handleQuery}
            >
              {isQuerying ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Resolver consulta documental
            </Button>

            {answer ? (
              <div className="space-y-4 rounded-[28px] bg-[color:var(--color-panel)] p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="success">{answer.provider}</Badge>
                  <Badge variant="secondary">{answer.model}</Badge>
                </div>
                <div className="whitespace-pre-wrap text-sm leading-7 text-foreground">
                  {answer.answerText}
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-semibold text-foreground">Citas recuperadas</p>
                  {answer.citations.map((citation) => (
                    <div
                      key={`${citation.document_id}-${citation.chunk_index}`}
                      className="rounded-[22px] border border-white/60 bg-white/85 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge>{citation.label}</Badge>
                        <Badge variant="secondary">
                          {formatSourceKind(citation.source_kind)}
                        </Badge>
                        <p className="text-sm font-semibold text-foreground">
                          {citation.document_title}
                        </p>
                      </div>
                      <p className="mt-3 text-sm leading-7 text-muted-foreground">
                        {citation.excerpt}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-[28px] border border-dashed border-white/60 bg-[color:rgba(255,255,255,0.72)] p-5 text-sm leading-7 text-muted-foreground">
                La respuesta aparecerá aquí con referencias a los fragmentos usados.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="section-kicker">Biblioteca local</p>
            <h2 className="font-display text-4xl text-foreground">
              Documentos cargados para este usuario
            </h2>
          </div>
          <Badge variant="secondary">{documents.length} documentos</Badge>
        </div>

        {documents.length === 0 ? (
          <Card>
            <CardContent className="text-sm leading-7 text-muted-foreground">
              Todavía no hay documentación en estudio. Empieza por una nota larga o
              un PDF/TXT relevante para el despacho.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {documents.map((document) => (
              <Card key={document.id}>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge>{formatSourceKind(document.source_kind)}</Badge>
                        <Badge variant="secondary">
                          {formatStudyLength(document.text_length)} caracteres
                        </Badge>
                        <Badge variant="secondary">
                          {document.chunk_count} fragmentos
                        </Badge>
                      </div>
                      <div>
                        <p className="text-xl font-semibold text-foreground">
                          {document.title}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {document.original_file_name ?? "Documento interno sin archivo adjunto"}
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={deletingId === document.id}
                      onClick={() => handleDelete(document.id)}
                    >
                      {deletingId === document.id ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      Eliminar
                    </Button>
                  </div>

                  <p className="text-sm leading-7 text-muted-foreground">
                    {document.preview_text}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    <span>{new Date(document.updated_at).toLocaleString("es-ES")}</span>
                    <span className="inline-flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5" />
                      Estudio local
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
