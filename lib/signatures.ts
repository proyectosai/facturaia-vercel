import "server-only";

import { randomUUID } from "node:crypto";
import { cache } from "react";
import { headers } from "next/headers";

import {
  demoCommercialDocuments,
  demoDocumentSignatureRequests,
  getDemoCommercialDocumentById,
  getDemoDocumentSignatureRequestByToken,
  isDemoMode,
  isLocalFileMode,
} from "@/lib/demo";
import {
  expireLocalDocumentSignatureRequest,
  getLocalPublicSignatureRequestByToken,
  listLocalCommercialDocumentsForUser,
  listLocalDocumentSignatureRequestsForUser,
  markLocalSignatureRequestViewed,
} from "@/lib/local-core";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  CommercialDocumentRecord,
  CommercialDocumentType,
  DocumentSignatureRequestKind,
  DocumentSignatureRequestRecord,
  DocumentSignatureStatus,
} from "@/lib/types";
import {
  formatCommercialDocumentNumber,
  normaliseCommercialDocument,
} from "@/lib/commercial-documents";
import {
  buildSignatureDocumentSnapshot,
  extractSignatureSnapshot,
  hasSignatureSnapshotMismatch,
} from "@/lib/signature-snapshot";
import { getBaseUrl } from "@/lib/utils";

export {
  buildSignatureDocumentSnapshot,
  extractSignatureSnapshot,
  hasSignatureSnapshotMismatch,
};

type SignatureFilters = {
  status?: "all" | DocumentSignatureStatus;
  type?: "all" | CommercialDocumentType;
};

export type SignatureListItem = DocumentSignatureRequestRecord & {
  document: CommercialDocumentRecord | null;
  publicUrl: string;
};

export const documentSignatureStatusLabels: Record<DocumentSignatureStatus, string> = {
  pending: "Pendiente",
  signed: "Firmado",
  rejected: "Rechazado",
  revoked: "Revocado",
  expired: "Caducado",
};

export const documentSignatureKindLabels: Record<DocumentSignatureRequestKind, string> = {
  quote_acceptance: "Aceptación de presupuesto",
  delivery_note_signature: "Firma de albarán",
};

function getRequestKind(documentType: CommercialDocumentType): DocumentSignatureRequestKind {
  return documentType === "quote" ? "quote_acceptance" : "delivery_note_signature";
}

function getDefaultExpiry(document: CommercialDocumentRecord) {
  if (document.document_type === "quote") {
    if (document.valid_until) {
      return new Date(`${document.valid_until}T23:59:59.000Z`).toISOString();
    }

    const base = new Date(`${document.issue_date}T00:00:00.000Z`);
    base.setUTCDate(base.getUTCDate() + 30);
    return base.toISOString();
  }

  const base = new Date();
  base.setUTCDate(base.getUTCDate() + 14);
  return base.toISOString();
}

export function buildSignatureRequestUrl(token: string) {
  return `${getBaseUrl()}/firma/${token}`;
}

async function getRuntimeBaseUrl() {
  const fallback = getBaseUrl().replace(/\/+$/, "");

  try {
    const headerStore = await headers();
    const host =
      headerStore.get("x-forwarded-host") ??
      headerStore.get("host") ??
      null;

    if (!host) {
      return fallback;
    }

    const protocol =
      headerStore.get("x-forwarded-proto") ??
      (host.startsWith("localhost") || host.startsWith("127.0.0.1")
        ? "http"
        : "https");

    return `${protocol}://${host}`;
  } catch {
    return fallback;
  }
}

export function isSignatureExpired(request: Pick<DocumentSignatureRequestRecord, "status" | "expires_at">) {
  return (
    request.status === "pending" &&
    Boolean(request.expires_at) &&
    new Date(request.expires_at as string).getTime() < Date.now()
  );
}

export function getSignatureSummary(requests: DocumentSignatureRequestRecord[]) {
  return {
    total: requests.length,
    pending: requests.filter((request) => request.status === "pending").length,
    signed: requests.filter((request) => request.status === "signed").length,
    rejected: requests.filter((request) => request.status === "rejected").length,
    activeLinks: requests.filter((request) => request.status === "pending" && !isSignatureExpired(request))
      .length,
  };
}

export function buildSignatureRequestTitle(item: SignatureListItem) {
  const document = item.document;

  if (!document) {
    return "Documento no disponible";
  }

  return `${document.document_type === "quote" ? "Presupuesto" : "Albarán"} ${formatCommercialDocumentNumber(
    document.document_type,
    document.document_number,
  )}`;
}

async function syncExpiredRequest(
  request: DocumentSignatureRequestRecord,
) {
  if (isDemoMode()) {
    if (isSignatureExpired(request)) {
      return {
        ...request,
        status: "expired" as const,
      };
    }

    return request;
  }

  if (isLocalFileMode()) {
    if (isSignatureExpired(request)) {
      return (
        (await expireLocalDocumentSignatureRequest(request.id)) ?? {
          ...request,
          status: "expired",
        }
      );
    }

    return request;
  }

  if (!isSignatureExpired(request)) {
    return request;
  }

  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("document_signature_requests")
    .update({
      status: "expired",
    })
    .eq("id", request.id)
    .eq("status", "pending")
    .select("*")
    .single();

  return (data as DocumentSignatureRequestRecord | null) ?? {
    ...request,
    status: "expired",
  };
}

export async function getDocumentSignatureRequestsForUser(
  userId: string,
  { status = "all", type = "all" }: SignatureFilters = {},
) {
  if (isDemoMode()) {
    return Promise.all(
      demoDocumentSignatureRequests
        .filter((request) => request.user_id === userId)
        .filter((request) => (status === "all" ? true : request.status === status))
        .filter((request) => (type === "all" ? true : request.document_type === type))
        .sort(
          (left, right) =>
            new Date(right.requested_at).getTime() - new Date(left.requested_at).getTime(),
        )
        .map((request) => syncExpiredRequest(request)),
    );
  }

  if (isLocalFileMode()) {
    return Promise.all(
      (await listLocalDocumentSignatureRequestsForUser(userId))
        .filter((request) => (status === "all" ? true : request.status === status))
        .filter((request) => (type === "all" ? true : request.document_type === type))
        .map((request) => syncExpiredRequest(request)),
    );
  }

  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from("document_signature_requests")
    .select("*")
    .eq("user_id", userId)
    .order("requested_at", { ascending: false });

  if (status !== "all") {
    query = query.eq("status", status);
  }

  if (type !== "all") {
    query = query.eq("document_type", type);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error("No se ha podido cargar el módulo de firma documental.");
  }

  const requests = (data as DocumentSignatureRequestRecord[] | null) ?? [];
  return Promise.all(requests.map((request) => syncExpiredRequest(request)));
}

const getDocumentMapForUser = cache(async (userId: string) => {
  if (isDemoMode()) {
    return new Map(
      demoCommercialDocuments
        .filter((document) => document.user_id === userId)
        .map((document) => [document.id, normaliseCommercialDocument(document)]),
    );
  }

  if (isLocalFileMode()) {
    return new Map(
      (await listLocalCommercialDocumentsForUser(userId)).map((document) => [
        document.id,
        normaliseCommercialDocument(document),
      ]),
    );
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("commercial_documents")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    throw new Error("No se han podido cargar los documentos para el módulo de firma.");
  }

  return new Map(
    ((data as CommercialDocumentRecord[] | null) ?? []).map((document) => [
      document.id,
      normaliseCommercialDocument(document),
    ]),
  );
});

export async function getSignatureListItemsForUser(
  userId: string,
  filters: SignatureFilters = {},
) {
  const [requests, documentMap] = await Promise.all([
    getDocumentSignatureRequestsForUser(userId, filters),
    getDocumentMapForUser(userId),
  ]);
  const baseUrl = await getRuntimeBaseUrl();

  return requests.map((request) => ({
    ...request,
    document: documentMap.get(request.document_id) ?? null,
    publicUrl: `${baseUrl}/firma/${request.public_token}`,
  }));
}

export async function getLatestSignatureRequestMapForUser(
  userId: string,
  documentIds: string[],
) {
  const list = await getSignatureListItemsForUser(userId);
  const map = new Map<string, SignatureListItem>();

  list
    .filter((item) => documentIds.includes(item.document_id))
    .forEach((item) => {
      if (!map.has(item.document_id)) {
        map.set(item.document_id, item);
      }
    });

  return map;
}

export async function getSignatureRequestForUser(
  userId: string,
  requestId: string,
) {
  const requests = await getSignatureListItemsForUser(userId);
  return requests.find((request) => request.id === requestId) ?? null;
}

export async function getPublicSignatureRequestByToken(token: string) {
  const baseUrl = await getRuntimeBaseUrl();

  if (isDemoMode()) {
    const request = getDemoDocumentSignatureRequestByToken(token);

    if (!request) {
      return null;
    }

    const synced = await syncExpiredRequest(request);
    const document = getDemoCommercialDocumentById(synced.document_id);

    return {
      request: synced,
      document: document ? normaliseCommercialDocument(document) : null,
      publicUrl: `${baseUrl}/firma/${synced.public_token}`,
    };
  }

  if (isLocalFileMode()) {
    const request = await getLocalPublicSignatureRequestByToken(token);

    if (!request) {
      return null;
    }

    const synced = await syncExpiredRequest(request);
    const requestWithView =
      synced.status === "pending" && !synced.viewed_at
        ? ((await markLocalSignatureRequestViewed(token)) ?? {
            ...synced,
            viewed_at: new Date().toISOString(),
          })
        : synced;
    const documentMap = await getDocumentMapForUser(requestWithView.user_id);

    return {
      request: requestWithView,
      document: documentMap.get(requestWithView.document_id) ?? null,
      publicUrl: `${baseUrl}/firma/${requestWithView.public_token}`,
    };
  }

  const admin = createAdminSupabaseClient();
  const { data: requestData, error: requestError } = await admin
    .from("document_signature_requests")
    .select("*")
    .eq("public_token", token)
    .maybeSingle();

  if (requestError) {
    throw new Error("No se ha podido cargar la solicitud de firma.");
  }

  if (!requestData) {
    return null;
  }

  const synced = await syncExpiredRequest(requestData as DocumentSignatureRequestRecord);
  let requestWithView = synced;

  if (synced.status === "pending" && !synced.viewed_at) {
    const now = new Date().toISOString();
    const { data: viewedData } = await admin
      .from("document_signature_requests")
      .update({
        viewed_at: now,
      })
      .eq("id", synced.id)
      .eq("status", "pending")
      .select("*")
      .single();

    requestWithView =
      (viewedData as DocumentSignatureRequestRecord | null) ?? {
        ...synced,
        viewed_at: now,
      };
  }

  const { data: documentData, error: documentError } = await admin
    .from("commercial_documents")
    .select("*")
    .eq("id", requestWithView.document_id)
    .maybeSingle();

  if (documentError) {
    throw new Error("No se ha podido cargar el documento asociado a la firma.");
  }

  return {
    request: requestWithView,
    document: documentData
      ? normaliseCommercialDocument(documentData as CommercialDocumentRecord)
      : null,
    publicUrl: `${baseUrl}/firma/${requestWithView.public_token}`,
  };
}

export function buildSignatureRequestInsertPayload(document: CommercialDocumentRecord, note: string | null) {
  const snapshot = buildSignatureDocumentSnapshot(document);

  return {
    document_id: document.id,
    document_type: document.document_type,
    request_kind: getRequestKind(document.document_type),
    status: "pending" as const,
    public_token: randomUUID(),
    request_note: note,
    requested_at: new Date().toISOString(),
    expires_at: getDefaultExpiry(document),
    evidence: {
      documentSnapshot: snapshot,
      createdAt: new Date().toISOString(),
    },
  };
}
