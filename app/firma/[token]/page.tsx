import { notFound } from "next/navigation";
import { FileSignature, ShieldCheck } from "lucide-react";

import { respondToDocumentSignatureAction } from "@/lib/actions/signatures";
import {
  documentSignatureKindLabels,
  documentSignatureStatusLabels,
  getPublicSignatureRequestByToken,
  isSignatureExpired,
} from "@/lib/signatures";
import { RouteToast } from "@/components/route-toast";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDateLong, toNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

function getSingleSearchParam(
  value: string | string[] | undefined,
  fallback = "",
) {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }

  return value ?? fallback;
}

function getStatusTone(status: string) {
  if (status === "signed") {
    return "success";
  }

  if (status === "pending") {
    return "secondary";
  }

  return "secondary";
}

export default async function PublicSignaturePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{
    accepted?: string | string[];
    rejected?: string | string[];
    error?: string | string[];
  }>;
}) {
  const { token } = await params;
  const resolved = await getPublicSignatureRequestByToken(token);

  if (!resolved || !resolved.document) {
    notFound();
  }

  const request = resolved.request;
  const document = resolved.document;
  const paramsQuery = await searchParams;
  const accepted = getSingleSearchParam(paramsQuery.accepted);
  const rejected = getSingleSearchParam(paramsQuery.rejected);
  const error = getSingleSearchParam(paramsQuery.error);
  const isClosed = request.status !== "pending" || isSignatureExpired(request);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(233,244,240,0.92),rgba(255,255,255,0.98)_38%,rgba(244,233,215,0.76)_100%)] px-4 py-10 sm:px-6 lg:px-10">
      <RouteToast
        type="success"
        message={accepted ? "Documento aceptado correctamente." : null}
      />
      <RouteToast
        type="success"
        message={rejected ? "Respuesta registrada correctamente." : null}
      />
      <RouteToast type="error" message={error || null} />

      <div className="mx-auto max-w-5xl space-y-8">
        <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr] xl:items-end">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge>Firma documental</Badge>
              <Badge variant={getStatusTone(request.status)}>
                {documentSignatureStatusLabels[request.status]}
              </Badge>
            </div>
            <div className="space-y-3">
              <p className="section-kicker">{documentSignatureKindLabels[request.request_kind]}</p>
              <h1 className="font-display text-5xl leading-none tracking-tight text-foreground">
                {document.document_type === "quote"
                  ? "Revisa y acepta este presupuesto."
                  : "Revisa y firma este albarán."}
              </h1>
              <p className="text-lg leading-8 text-muted-foreground">
                Este enlace forma parte de una instalación privada de FacturaIA. La
                respuesta quedará registrada como evidencia básica para el emisor.
              </p>
            </div>
          </div>

          <Card className="overflow-hidden bg-[linear-gradient(150deg,rgba(255,255,255,0.95),rgba(232,246,242,0.9))]">
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[24px] bg-white/82 p-4">
                <p className="text-sm text-muted-foreground">Documento</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {document.document_type === "quote" ? "Presupuesto" : "Albarán"}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {formatDateLong(document.issue_date)}
                </p>
              </div>
              <div className="rounded-[24px] bg-white/82 p-4">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {formatCurrency(toNumber(document.grand_total))}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {document.client_name}
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <Card className="border-white/60 bg-white/92">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <FileSignature className="h-5 w-5 text-[color:var(--color-brand)]" />
                Resumen del documento
              </CardTitle>
              <CardDescription>
                {resolved.publicUrl}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[24px] bg-[color:rgba(251,247,241,0.72)] p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    Emisor
                  </p>
                  <p className="mt-2 text-sm font-medium text-foreground">
                    {document.issuer_name}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {document.issuer_nif}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {document.issuer_address}
                  </p>
                </div>
                <div className="rounded-[24px] bg-[color:rgba(251,247,241,0.72)] p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    Cliente
                  </p>
                  <p className="mt-2 text-sm font-medium text-foreground">
                    {document.client_name}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {document.client_nif}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {document.client_email}
                  </p>
                </div>
              </div>

              <div className="rounded-[28px] bg-[color:rgba(241,246,243,0.82)] p-5">
                <p className="text-sm font-medium text-foreground">
                  {request.request_note ||
                    "Revisa el contenido y responde desde este mismo enlace."}
                </p>
                {request.expires_at ? (
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Este enlace caduca el {formatDateLong(request.expires_at)}.
                  </p>
                ) : null}
              </div>

              <div className="space-y-3">
                {document.line_items.map((line, index) => (
                  <div
                    key={`${line.description}-${index}`}
                    className="rounded-[24px] border border-white/60 bg-white/88 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{line.description}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {line.quantity} × {formatCurrency(toNumber(line.unitPrice))} · IVA {line.vatRate}%
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-foreground">
                        {formatCurrency(toNumber(line.lineTotal))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/60 bg-white/92">
            <CardHeader>
              <CardTitle>Respuesta</CardTitle>
              <CardDescription>
                {isClosed
                  ? "La solicitud ya no admite una nueva respuesta."
                  : "Rellena tus datos y confirma si aceptas o rechazas el documento."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {isClosed ? (
                <div className="space-y-4">
                  <div className="rounded-[28px] bg-[color:var(--color-panel)] p-5">
                    <p className="text-sm font-medium text-foreground">
                      Estado actual: {documentSignatureStatusLabels[request.status]}
                    </p>
                    {request.responded_at ? (
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        Respuesta registrada el {formatDateLong(request.responded_at)}.
                      </p>
                    ) : null}
                    {request.signer_name ? (
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        Respondió: {request.signer_name}
                        {request.signer_email ? ` · ${request.signer_email}` : ""}
                      </p>
                    ) : null}
                    {request.signer_message ? (
                      <p className="mt-3 text-sm leading-7 text-muted-foreground">
                        {request.signer_message}
                      </p>
                    ) : null}
                  </div>

                  <div className="rounded-[28px] bg-[color:rgba(251,247,241,0.72)] p-5">
                    <p className="text-sm font-medium text-foreground">
                      Evidencia básica almacenada
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Se guarda la fecha de respuesta y metadatos técnicos básicos del navegador para
                      dejar constancia operativa dentro del entorno privado.
                    </p>
                  </div>
                </div>
              ) : (
                <form action={respondToDocumentSignatureAction} className="space-y-5">
                  <input type="hidden" name="token" value={token} />

                  <div className="space-y-2">
                    <Label htmlFor="signerName">Nombre o razón social</Label>
                    <Input id="signerName" name="signerName" required />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="signerEmail">Email</Label>
                      <Input id="signerEmail" name="signerEmail" type="email" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signerNif">NIF</Label>
                      <Input id="signerNif" name="signerNif" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signerMessage">Comentario</Label>
                    <Textarea
                      id="signerMessage"
                      name="signerMessage"
                      rows={5}
                      placeholder="Puedes añadir una observación o matiz antes de enviar la respuesta."
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <SubmitButton
                      name="decision"
                      value="accept"
                      pendingLabel="Registrando aceptación..."
                    >
                      {document.document_type === "quote" ? "Aceptar presupuesto" : "Firmar albarán"}
                    </SubmitButton>
                    <SubmitButton
                      name="decision"
                      value="reject"
                      variant="outline"
                      pendingLabel="Registrando respuesta..."
                    >
                      Rechazar / No conformidad
                    </SubmitButton>
                  </div>
                </form>
              )}

              <div className="rounded-[28px] bg-[color:rgba(241,246,243,0.82)] p-5">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-1 h-5 w-5 text-[color:var(--color-success)]" />
                  <p className="text-sm leading-7 text-muted-foreground">
                    Esta pantalla registra una evidencia básica de aceptación o rechazo.
                    No sustituye una firma electrónica cualificada ni asesoría legal.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
