import "server-only";

import path from "node:path";
import { promises as fs } from "node:fs";
import { randomUUID } from "node:crypto";

import type {
  StudyDocumentBackupRecord,
  StudyDocumentCitation,
  StudyDocumentRecord,
  StudyDocumentSourceKind,
} from "@/lib/types";
import { callLocalChatModel } from "@/lib/ai";
import { hasLocalAiEnv } from "@/lib/env";
import {
  decryptEncryptedEnvelope,
  encryptTextForScope,
  isLocalDataEncryptionRequested,
  tryParseEncryptedEnvelope,
} from "@/lib/local-encryption";
import { getLocalDataDir } from "@/lib/local-db";
import {
  assertAllowedUpload,
  sanitizeFileName,
  uploadRules,
} from "@/lib/security";

type StudyIndex = {
  version: 1;
  documents: StudyDocumentRecord[];
};

type StudyChunkCandidate = StudyDocumentCitation & {
  rawText: string;
};

export type StudyAnswer = {
  answerText: string;
  provider: string;
  model: string;
  usedLocalAi: boolean;
  citations: StudyDocumentCitation[];
};

const STUDY_INDEX_VERSION = 1;
const MAX_STUDY_DOCUMENTS_PER_USER = 40;
const MAX_STUDY_TEXT_LENGTH = 120_000;
const MIN_STUDY_TEXT_LENGTH = 40;
const CHUNK_SIZE = 900;
const CHUNK_OVERLAP = 180;
const MAX_CITATIONS = 5;

let documentStudyMutationQueue: Promise<unknown> = Promise.resolve();

function nowIso() {
  return new Date().toISOString();
}

function getDocumentStudyRootDir() {
  return path.join(getLocalDataDir(), "document-study");
}

function getUserDocumentStudyDir(userId: string) {
  return path.join(getDocumentStudyRootDir(), userId);
}

function getStudyIndexPath(userId: string) {
  return path.join(getUserDocumentStudyDir(userId), "index.json");
}

function getStudyTextsDir(userId: string) {
  return path.join(getUserDocumentStudyDir(userId), "texts");
}

function getStudyTextPath(userId: string, documentId: string) {
  return path.join(getStudyTextsDir(userId), `${documentId}.txt`);
}

function getDefaultStudyIndex(): StudyIndex {
  return {
    version: STUDY_INDEX_VERSION,
    documents: [],
  };
}

function runDocumentStudyMutation<T>(task: () => Promise<T>) {
  const pending = documentStudyMutationQueue.then(task, task);
  documentStudyMutationQueue = pending.then(() => undefined, () => undefined);
  return pending;
}

async function ensureUserStudyDir(userId: string) {
  await fs.mkdir(getStudyTextsDir(userId), { recursive: true });
}

function stripDiacritics(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeSearchText(value: string) {
  return stripDiacritics(value)
    .toLowerCase()
    .replace(/[^a-z0-9áéíóúüñ\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeStoredText(rawText: string) {
  return rawText
    .replace(/\0/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildPreviewText(value: string) {
  return value.replace(/\s+/g, " ").slice(0, 220).trim();
}

function buildDocumentTitleFromFileName(fileName: string) {
  const cleaned = sanitizeFileName(fileName)
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[-_.]+/g, " ")
    .trim();

  return cleaned || "Documento de estudio";
}

function getSourceKindFromFile(file: File): StudyDocumentSourceKind {
  const extension = path.extname(file.name).toLowerCase();

  if (extension === ".md" || extension === ".markdown") {
    return "markdown";
  }

  if (extension === ".pdf" || file.type === "application/pdf") {
    return "pdf";
  }

  return "plain_text";
}

async function readMaybeEncryptedTextFile(filePath: string) {
  const raw = await fs.readFile(filePath, "utf8");
  const encryptedEnvelope = tryParseEncryptedEnvelope(raw);

  if (!encryptedEnvelope) {
    return raw;
  }

  return decryptEncryptedEnvelope(encryptedEnvelope, "local-documents");
}

async function writeMaybeEncryptedTextFile(filePath: string, content: string) {
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  const payload = isLocalDataEncryptionRequested()
    ? JSON.stringify(encryptTextForScope(content, "local-documents"), null, 2)
    : content;

  await fs.writeFile(tempPath, payload, "utf8");
  await fs.rename(tempPath, filePath);
}

async function readStudyIndex(userId: string): Promise<StudyIndex> {
  try {
    const raw = await fs.readFile(getStudyIndexPath(userId), "utf8");
    const encryptedEnvelope = tryParseEncryptedEnvelope(raw);
    const payload = encryptedEnvelope
      ? decryptEncryptedEnvelope(encryptedEnvelope, "local-documents")
      : raw;
    const parsed = JSON.parse(payload) as Partial<StudyIndex> | null;

    return {
      version: STUDY_INDEX_VERSION,
      documents: Array.isArray(parsed?.documents)
        ? (parsed?.documents as StudyDocumentRecord[])
        : [],
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
      return getDefaultStudyIndex();
    }

    throw error;
  }
}

async function writeStudyIndex(userId: string, index: StudyIndex) {
  const filePath = getStudyIndexPath(userId);
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  const serialized = JSON.stringify(index, null, 2);
  const payload = isLocalDataEncryptionRequested()
    ? JSON.stringify(encryptTextForScope(serialized, "local-documents"), null, 2)
    : serialized;

  await ensureUserStudyDir(userId);
  await fs.writeFile(tempPath, payload, "utf8");
  await fs.rename(tempPath, filePath);
}

function chunkStudyText(text: string) {
  const chunks: string[] = [];
  const normalized = normalizeStoredText(text);

  if (!normalized) {
    return chunks;
  }

  let cursor = 0;

  while (cursor < normalized.length) {
    const next = normalized.slice(cursor, cursor + CHUNK_SIZE).trim();

    if (next) {
      chunks.push(next);
    }

    if (cursor + CHUNK_SIZE >= normalized.length) {
      break;
    }

    cursor += CHUNK_SIZE - CHUNK_OVERLAP;
  }

  return chunks;
}

function tokenizeSearchQuery(value: string) {
  return [...new Set(
    normalizeSearchText(value)
      .split(" ")
      .map((token) => token.trim())
      .filter((token) => token.length >= 3),
  )];
}

function scoreChunk(question: string, candidateText: string, documentTitle: string) {
  const normalizedQuestion = normalizeSearchText(question);
  const normalizedCandidate = normalizeSearchText(candidateText);
  const normalizedTitle = normalizeSearchText(documentTitle);
  const tokens = tokenizeSearchQuery(question);

  let score = 0;

  if (normalizedQuestion && normalizedCandidate.includes(normalizedQuestion)) {
    score += 10;
  }

  for (const token of tokens) {
    if (normalizedCandidate.includes(token)) {
      score += 3;
    }

    if (normalizedTitle.includes(token)) {
      score += 2;
    }
  }

  return score;
}

function buildStudyFallbackAnswer(
  question: string,
  citations: StudyDocumentCitation[],
) {
  return [
    `LM Studio no esta disponible ahora mismo para responder a la consulta: "${question.trim()}".`,
    "Fragmentos recuperados para revisar manualmente:",
    ...citations.map(
      (citation) =>
        `[${citation.label}] ${citation.document_title}: ${citation.excerpt}`,
    ),
    "Siguiente paso recomendado: revisa esos fragmentos y vuelve a lanzar la consulta cuando LM Studio este accesible.",
  ].join("\n\n");
}

async function extractStudyTextFromFile(file: File) {
  assertAllowedUpload(file, uploadRules.studySource);

  const sourceKind = getSourceKindFromFile(file);

  if (sourceKind === "pdf") {
    try {
      const { PDFParse } = await import("pdf-parse");
      const buffer = Buffer.from(await file.arrayBuffer());
      const parser = new PDFParse({ data: buffer });
      const parsed = await parser.getText();
      await parser.destroy();

      return {
        sourceKind,
        mimeType: file.type || "application/pdf",
        text: normalizeStoredText(parsed.text),
      };
    } catch (error) {
      console.error("FacturaIA no ha podido extraer texto del PDF de estudio:", error);
      throw new Error(
        "No se ha podido leer el PDF en este entorno. Prueba con un TXT/MD o pega el texto manualmente.",
      );
    }
  }

  return {
    sourceKind,
    mimeType: file.type || "text/plain",
    text: normalizeStoredText(await file.text()),
  };
}

async function saveStudyDocumentText(
  userId: string,
  documentId: string,
  text: string,
) {
  await ensureUserStudyDir(userId);
  await writeMaybeEncryptedTextFile(getStudyTextPath(userId, documentId), text);
}

async function readStudyDocumentText(userId: string, documentId: string) {
  return normalizeStoredText(
    await readMaybeEncryptedTextFile(getStudyTextPath(userId, documentId)),
  );
}

function validateStudyTextLength(text: string) {
  if (text.length < MIN_STUDY_TEXT_LENGTH) {
    throw new Error(
      "El documento tiene demasiado poco texto útil. Añade más contenido o pega una nota más completa.",
    );
  }

  if (text.length > MAX_STUDY_TEXT_LENGTH) {
    throw new Error(
      `El documento supera el límite de ${MAX_STUDY_TEXT_LENGTH.toLocaleString("es-ES")} caracteres extraídos.`,
    );
  }
}

async function saveStudyDocument({
  userId,
  title,
  sourceKind,
  originalFileName,
  mimeType,
  text,
}: {
  userId: string;
  title: string;
  sourceKind: StudyDocumentSourceKind;
  originalFileName: string | null;
  mimeType: string | null;
  text: string;
}) {
  const normalizedText = normalizeStoredText(text);
  validateStudyTextLength(normalizedText);

  return runDocumentStudyMutation(async () => {
    const index = await readStudyIndex(userId);

    if (index.documents.length >= MAX_STUDY_DOCUMENTS_PER_USER) {
      throw new Error(
        `Has alcanzado el límite de ${MAX_STUDY_DOCUMENTS_PER_USER} documentos en estudio local. Elimina alguno antes de seguir.`,
      );
    }

    const timestamp = nowIso();
    const documentId = randomUUID();
    const chunkCount = chunkStudyText(normalizedText).length;
    const document: StudyDocumentRecord = {
      id: documentId,
      user_id: userId,
      title: title.trim() || "Documento de estudio",
      source_kind: sourceKind,
      original_file_name: originalFileName,
      mime_type: mimeType,
      text_length: normalizedText.length,
      chunk_count: chunkCount,
      preview_text: buildPreviewText(normalizedText),
      created_at: timestamp,
      updated_at: timestamp,
    };

    index.documents.push(document);
    await saveStudyDocumentText(userId, documentId, normalizedText);
    await writeStudyIndex(userId, index);

    return document;
  });
}

export async function listStudyDocumentsForUser(userId: string) {
  const index = await readStudyIndex(userId);

  return [...index.documents].sort((left, right) =>
    right.updated_at.localeCompare(left.updated_at),
  );
}

export async function createStudyNoteForUser({
  userId,
  title,
  text,
}: {
  userId: string;
  title?: string;
  text: string;
}) {
  const cleanedText = normalizeStoredText(text);
  const resolvedTitle =
    title?.trim() || buildPreviewText(cleanedText).slice(0, 72) || "Nota de estudio";

  return saveStudyDocument({
    userId,
    title: resolvedTitle,
    sourceKind: "note",
    originalFileName: null,
    mimeType: "text/plain",
    text: cleanedText,
  });
}

export async function createStudyDocumentFromFile({
  userId,
  title,
  file,
}: {
  userId: string;
  title?: string;
  file: File;
}) {
  const extracted = await extractStudyTextFromFile(file);

  return saveStudyDocument({
    userId,
    title: title?.trim() || buildDocumentTitleFromFileName(file.name),
    sourceKind: extracted.sourceKind,
    originalFileName: sanitizeFileName(file.name),
    mimeType: extracted.mimeType,
    text: extracted.text,
  });
}

export async function deleteStudyDocumentForUser(userId: string, documentId: string) {
  return runDocumentStudyMutation(async () => {
    const index = await readStudyIndex(userId);
    const existing = index.documents.find((document) => document.id === documentId);

    if (!existing) {
      return null;
    }

    index.documents = index.documents.filter((document) => document.id !== documentId);
    await writeStudyIndex(userId, index);
    await fs.rm(getStudyTextPath(userId, documentId), { force: true });

    return existing;
  });
}

export async function exportStudyDocumentsForUser(
  userId: string,
): Promise<StudyDocumentBackupRecord[]> {
  const documents = await listStudyDocumentsForUser(userId);

  return Promise.all(
    documents.map(async (document) => ({
      ...document,
      extracted_text: await readStudyDocumentText(userId, document.id),
    })),
  );
}

export async function replaceStudyDocumentsForUser(
  userId: string,
  documents: StudyDocumentBackupRecord[],
) {
  return runDocumentStudyMutation(async () => {
    const userDir = getUserDocumentStudyDir(userId);
    await fs.rm(userDir, { recursive: true, force: true });
    await ensureUserStudyDir(userId);

    const index: StudyIndex = {
      version: STUDY_INDEX_VERSION,
      documents: [],
    };

    for (const document of documents) {
      const text = normalizeStoredText(document.extracted_text);
      validateStudyTextLength(text);

      const normalizedDocument: StudyDocumentRecord = {
        id: document.id,
        user_id: userId,
        title: document.title,
        source_kind: document.source_kind,
        original_file_name: document.original_file_name,
        mime_type: document.mime_type,
        text_length: text.length,
        chunk_count: chunkStudyText(text).length,
        preview_text: buildPreviewText(text),
        created_at: document.created_at,
        updated_at: document.updated_at,
      };

      index.documents.push(normalizedDocument);
      await saveStudyDocumentText(userId, normalizedDocument.id, text);
    }

    await writeStudyIndex(userId, index);
  });
}

export async function answerStudyQuestionForUser({
  userId,
  question,
}: {
  userId: string;
  question: string;
}): Promise<StudyAnswer> {
  const trimmedQuestion = question.trim();

  if (trimmedQuestion.length < 10) {
    throw new Error("Describe mejor lo que quieres preguntar sobre la documentación.");
  }

  const documents = await listStudyDocumentsForUser(userId);

  if (documents.length === 0) {
    throw new Error("Todavía no has cargado ningún documento para estudiar.");
  }

  const chunkCandidates: StudyChunkCandidate[] = [];

  for (const document of documents) {
    const text = await readStudyDocumentText(userId, document.id);
    const chunks = chunkStudyText(text);

    chunks.forEach((chunk, index) => {
      const score = scoreChunk(trimmedQuestion, chunk, document.title);

      if (score <= 0) {
        return;
      }

      chunkCandidates.push({
        label: `S${chunkCandidates.length + 1}`,
        document_id: document.id,
        document_title: document.title,
        source_kind: document.source_kind,
        excerpt: buildPreviewText(chunk).slice(0, 380),
        chunk_index: index,
        score,
        rawText: chunk,
      });
    });
  }

  const topCandidates = [...chunkCandidates]
    .sort((left, right) => right.score - left.score)
    .slice(0, MAX_CITATIONS)
    .map((candidate, index) => ({
      ...candidate,
      label: `S${index + 1}`,
    }));

  if (topCandidates.length === 0) {
    throw new Error(
      "No he encontrado fragmentos relevantes en tu archivo local. Prueba a concretar más la pregunta o a subir documentación más específica.",
    );
  }

  const citations: StudyDocumentCitation[] = topCandidates.map((candidate) => ({
    label: candidate.label,
    document_id: candidate.document_id,
    document_title: candidate.document_title,
    source_kind: candidate.source_kind,
    excerpt: candidate.excerpt,
    chunk_index: candidate.chunk_index,
    score: candidate.score,
  }));

  if (!hasLocalAiEnv()) {
    return {
      answerText: buildStudyFallbackAnswer(trimmedQuestion, citations),
      provider: "FacturaIA",
      model: "Recuperacion local sin LLM",
      usedLocalAi: false,
      citations,
    };
  }

  try {
    const completion = await callLocalChatModel({
      systemPrompt:
        "Eres un asistente documental local para un despacho fiscal en Espana. Responde solo con la informacion que puedas sostener con los fragmentos proporcionados. No inventes hechos, importes ni conclusiones. Si falta informacion, dilo con claridad. Usa referencias inline del tipo [S1], [S2]. Escribe en espanol de Espana y prioriza claridad operativa.",
      userPrompt: [
        `Pregunta del profesional:\n${trimmedQuestion}`,
        "Fragmentos recuperados:",
        ...topCandidates.map(
          (candidate) =>
            `[${candidate.label}] ${candidate.document_title}\n${candidate.rawText}`,
        ),
        "Devuelve una respuesta breve y util, con conclusiones apoyadas en los fragmentos. Si hay huecos o contradicciones, senalalos.",
      ].join("\n\n"),
      temperature: 0.15,
      maxTokens: 1200,
    });

    return {
      answerText: completion.text,
      provider: completion.provider,
      model: completion.model,
      usedLocalAi: true,
      citations,
    };
  } catch {
    return {
      answerText: buildStudyFallbackAnswer(trimmedQuestion, citations),
      provider: "FacturaIA",
      model: "Recuperacion local sin LLM",
      usedLocalAi: false,
      citations,
    };
  }
}
