import Link from "next/link";
import { FileSignature, Link2, ShieldCheck } from "lucide-react";

import { requireUser } from "@/lib/auth";
import { revokeDocumentSignatureRequestAction } from "@/lib/actions/signatures";
import {
  buildSignatureRequestTitle,
  documentSignatureKindLabels,
  documentSignatureStatusLabels,
  getSignatureListItemsForUser,
  getSignatureSummary,
  type SignatureListItem,
} from "@/lib/signatures";
import { isDemoMode } from "@/lib/demo";
import type { DocumentSignatureStatus } from "@/lib/types";
import { formatDateLong } from "@/lib/utils";
import { CopyLinkButton } from "@/components/copy-link-button";
import { RouteToast } from "@/components/route-toast";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function getSingleSearchParam(
  value: string | string[] | undefined,
  fallback = "",
) {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }

  return value ?? fallback;
}

function buildSignaturesHref({
  status,
  type,
}: {
  status?: string;
  type?: string;
}) {
  const params = new URLSearchParams();

  if (status && status !== "all") {
    params.set("status", status);
  }

  if (type && type !== "all") {
    params.set("type", type);
  }

  const query = params.toString();
  return query ? `/firmas?${query}` : "/firmas";
}

function getStatusTone(status: DocumentSignatureStatus) {
  return {
    pending: "bg-[color:rgba(202,145,34,0.14)] text-[color:#8b5b00]",
    signed: "bg-[color:rgba(47,125,50,0.12)] text-[color:var(--color-success)]",
    rejected: "bg-[color:rgba(180,68,54,0.14)] text-[color:#8f2f2f]",
    revoked: "bg-[color:rgba(86,95,103,0.14)] text-[color:#47515a]",
    expired: "bg-[color:rgba(86,95,103,0.14)] text-[color:#47515a]",
  }[status];
}

function SignatureCard({
  item,
  demoMode,
}: {
  item: SignatureListItem;
  demoMode: boolean;
}) {
  return (
    <Card className="overflow-hidden border-white/60 bg-white/88">
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Badge>
                {item.document?.document_type === "quote" ? "Presupuesto" : "Albarán"}
              </Badge>
              <div
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${getStatusTone(
                  item.status,
                )}`}
              >
                {documentSignatureStatusLabels[item.status]}
              </div>
            </div>
            <CardTitle className="text-2xl">{buildSignatureRequestTitle(item)}</CardTitle>
            <CardDescription>
              {item.document?.client_name ?? "Documento sin cliente"}
            </CardDescription>
          </div>

          <div className="rounded-[24px] bg-[color:rgba(241,246,243,0.82)] px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Tipo
            </p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {documentSignatureKindLabels[item.request_kind]}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-[24px] bg-[color:rgba(251,247,241,0.72)] p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Solicitado
            </p>
            <p className="mt-2 text-sm font-medium text-foreground">
              {formatDateLong(item.requested_at)}
            </p>
          </div>
          <div className="rounded-[24px] bg-[color:rgba(251,247,241,0.72)] p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Caduca
            </p>
            <p className="mt-2 text-sm font-medium text-foreground">
              {item.expires_at ? formatDateLong(item.expires_at) : "Sin fecha"}
            </p>
          </div>
          <div className="rounded-[24px] bg-[color:rgba(251,247,241,0.72)] p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Respondió
            </p>
            <p className="mt-2 text-sm font-medium text-foreground">
              {item.signer_name ?? "Pendiente"}
            </p>
          </div>
          <div className="rounded-[24px] bg-[color:rgba(251,247,241,0.72)] p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Respuesta
            </p>
            <p className="mt-2 text-sm font-medium text-foreground">
              {item.responded_at ? formatDateLong(item.responded_at) : "Pendiente"}
            </p>
          </div>
        </div>

        {item.request_note ? (
          <div className="rounded-[28px] bg-[color:rgba(241,246,243,0.82)] p-5">
            <p className="text-sm leading-7 text-muted-foreground">{item.request_note}</p>
          </div>
        ) : null}

        {item.signer_message ? (
          <div className="rounded-[28px] bg-[color:rgba(251,247,241,0.72)] p-5">
            <p className="text-sm font-medium text-foreground">Comentario recibido</p>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              {item.signer_message}
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <CopyLinkButton value={item.publicUrl} label="Copiar enlace público" />
          <Button variant="outline" asChild>
            <Link href={item.publicUrl} target="_blank">
              <Link2 className="h-4 w-4" />
              Abrir enlace
            </Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/presupuestos">Ir a documentos</Link>
          </Button>
          {item.status === "pending" ? (
            <form action={demoMode ? undefined : revokeDocumentSignatureRequestAction}>
              <input type="hidden" name="requestId" value={item.id} />
              <SubmitButton
                variant="outline"
                pendingLabel="Revocando..."
                disabled={demoMode}
              >
                Revocar enlace
              </SubmitButton>
            </form>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export default async function FirmasPage({
  searchParams,
}: {
  searchParams: Promise<{
    created?: string | string[];
    updated?: string | string[];
    error?: string | string[];
    status?: string | string[];
    type?: string | string[];
  }>;
}) {
  const user = await requireUser();
  const demoMode = isDemoMode();
  const params = await searchParams;
  const created = getSingleSearchParam(params.created);
  const updated = getSingleSearchParam(params.updated);
  const error = getSingleSearchParam(params.error);
  const status = getSingleSearchParam(params.status, "all");
  const type = getSingleSearchParam(params.type, "all");
  const requests = await getSignatureListItemsForUser(user.id, {
    status:
      status === "pending" ||
      status === "signed" ||
      status === "rejected" ||
      status === "revoked" ||
      status === "expired"
        ? status
        : "all",
    type: type === "quote" || type === "delivery_note" ? type : "all",
  });
  const summary = getSignatureSummary(requests);

  return (
    <div className="space-y-8">
      <RouteToast
        type="success"
        message={created ? "Solicitud de firma creada correctamente." : null}
      />
      <RouteToast
        type="success"
        message={updated ? "Solicitud actualizada correctamente." : null}
      />
      <RouteToast type="error" message={error || null} />

      <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr] xl:items-end">
        <div className="max-w-4xl space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge>Firma documental</Badge>
            <Badge variant="secondary">Primera entrega</Badge>
            {demoMode ? <Badge variant="secondary">Modo demo</Badge> : null}
          </div>
          <div className="space-y-3">
            <p className="section-kicker">Aceptación y conformidad</p>
            <h1 className="font-display text-5xl leading-none tracking-tight text-foreground">
              Solicita aceptación de presupuestos y firma básica de albaranes.
            </h1>
            <p className="text-lg leading-8 text-muted-foreground">
              Este módulo genera enlaces públicos para que el cliente responda desde
              fuera, dejando una evidencia operativa básica dentro de tu instalación privada.
            </p>
          </div>
        </div>

        <Card className="overflow-hidden bg-[linear-gradient(150deg,rgba(255,255,255,0.95),rgba(232,246,242,0.9))]">
          <CardContent className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-[24px] bg-white/82 p-4">
              <p className="text-sm text-muted-foreground">Solicitudes</p>
              <p className="mt-2 font-display text-3xl text-foreground">{summary.total}</p>
            </div>
            <div className="rounded-[24px] bg-white/82 p-4">
              <p className="text-sm text-muted-foreground">Pendientes</p>
              <p className="mt-2 font-display text-3xl text-foreground">{summary.pending}</p>
            </div>
            <div className="rounded-[24px] bg-white/82 p-4">
              <p className="text-sm text-muted-foreground">Firmadas</p>
              <p className="mt-2 font-display text-3xl text-foreground">{summary.signed}</p>
            </div>
            <div className="rounded-[24px] bg-white/82 p-4">
              <p className="text-sm text-muted-foreground">Enlaces activos</p>
              <p className="mt-2 font-display text-3xl text-foreground">
                {summary.activeLinks}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="border-white/60 bg-[color:rgba(251,247,241,0.82)]">
        <CardContent className="space-y-5 py-6">
          <div className="flex flex-wrap gap-2">
            <Link href={buildSignaturesHref({ status: "all", type })}>
              <Button variant={status === "all" ? "default" : "outline"} size="sm">
                Todas
              </Button>
            </Link>
            <Link href={buildSignaturesHref({ status: "pending", type })}>
              <Button variant={status === "pending" ? "default" : "outline"} size="sm">
                Pendientes
              </Button>
            </Link>
            <Link href={buildSignaturesHref({ status: "signed", type })}>
              <Button variant={status === "signed" ? "default" : "outline"} size="sm">
                Firmadas
              </Button>
            </Link>
            <Link href={buildSignaturesHref({ status: "rejected", type })}>
              <Button variant={status === "rejected" ? "default" : "outline"} size="sm">
                Rechazadas
              </Button>
            </Link>
            <Link href={buildSignaturesHref({ status, type: "quote" })}>
              <Button variant={type === "quote" ? "default" : "outline"} size="sm">
                Presupuestos
              </Button>
            </Link>
            <Link href={buildSignaturesHref({ status, type: "delivery_note" })}>
              <Button
                variant={type === "delivery_note" ? "default" : "outline"}
                size="sm"
              >
                Albaranes
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="section-kicker">Solicitudes</p>
            <h2 className="font-display text-3xl text-foreground">Historial del módulo</h2>
          </div>
          <div className="rounded-full bg-[color:rgba(241,246,243,0.82)] px-4 py-2 text-sm text-muted-foreground">
            {requests.length} resultados
          </div>
        </div>

        {requests.length > 0 ? (
          requests.map((item) => (
            <SignatureCard key={item.id} item={item} demoMode={demoMode} />
          ))
        ) : (
          <Card className="border-dashed border-white/60 bg-white/74">
            <CardContent className="flex flex-col items-start gap-3 py-8">
              <FileSignature className="h-10 w-10 text-[color:var(--color-brand)]" />
              <div>
                <p className="font-semibold text-foreground">
                  Todavía no hay solicitudes de firma.
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Crea la primera desde un presupuesto o un albarán en `/presupuestos`.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      <Card className="border-white/60 bg-[color:var(--color-panel)]">
        <CardContent className="flex items-start gap-3 py-6">
          <ShieldCheck className="mt-1 h-5 w-5 text-[color:var(--color-success)]" />
          <p className="text-sm leading-7 text-muted-foreground">
            Esta entrega registra una aceptación o una firma operativa básica con
            nombre, fecha y evidencia técnica mínima. No equivale a firma electrónica
            cualificada ni sustituye revisión legal.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
