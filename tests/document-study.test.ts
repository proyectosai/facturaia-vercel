import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import {
  answerStudyQuestionForUser,
  createStudyDocumentFromFile,
  createStudyNoteForUser,
  deleteStudyDocumentForUser,
  listStudyDocumentsForUser,
} from "@/lib/document-study";

const userId = "user-study-local";

let localDataDir = "";

beforeEach(async () => {
  localDataDir = await mkdtemp(path.join(os.tmpdir(), "facturaia-study-local-"));
  process.env.FACTURAIA_DATA_DIR = localDataDir;
  delete process.env.FACTURAIA_ENCRYPT_LOCAL_DATA;
  delete process.env.FACTURAIA_ENCRYPTION_PASSPHRASE;
  delete process.env.LM_STUDIO_BASE_URL;
  delete process.env.LM_STUDIO_MODEL;
  delete process.env.LM_STUDIO_API_KEY;
});

afterEach(async () => {
  await rm(localDataDir, { recursive: true, force: true });
  delete process.env.FACTURAIA_ENCRYPT_LOCAL_DATA;
  delete process.env.FACTURAIA_ENCRYPTION_PASSPHRASE;
});

describe("document study module", () => {
  test(
    "stores notes and answers with citations even without LM Studio",
    { timeout: 15000 },
    async () => {
      await createStudyNoteForUser({
        userId,
        title: "Dividendos 2025",
        text:
          "El acta de socios de marzo de 2025 menciona un reparto de dividendos de 18.000 euros. Tambien indica que el pago previsto se hara en dos tramos y que la retencion debe revisarse antes de contabilizarlo.",
      });

      const documents = await listStudyDocumentsForUser(userId);
      const answer = await answerStudyQuestionForUser({
        userId,
        question: "Que dice la documentacion sobre el reparto de dividendos de 2025?",
      });

      expect(documents).toHaveLength(1);
      expect(documents[0]?.title).toBe("Dividendos 2025");
      expect(answer.usedLocalAi).toBe(false);
      expect(answer.citations).toHaveLength(1);
      expect(answer.citations[0]?.document_title).toBe("Dividendos 2025");
      expect(answer.answerText).toContain("[S1]");
    },
  );

  test("imports plain-text files and allows deleting them later", async () => {
    const file = new File(
      [
        "Manual interno del despacho.\n\nLa reunion de cierre fiscal se programa para el 15 de abril y se pide revisar la deduccion autonómica antes de presentar.",
      ],
      "manual-despacho.md",
      {
        type: "text/markdown",
      },
    );

    const created = await createStudyDocumentFromFile({
      userId,
      file,
    });

    expect(created.source_kind).toBe("markdown");
    expect(created.chunk_count).toBeGreaterThan(0);

    const deleted = await deleteStudyDocumentForUser(userId, created.id);
    const documents = await listStudyDocumentsForUser(userId);

    expect(deleted?.id).toBe(created.id);
    expect(documents).toHaveLength(0);
  });

  test("encrypts stored study files when local encryption is active", async () => {
    process.env.FACTURAIA_ENCRYPT_LOCAL_DATA = "1";
    process.env.FACTURAIA_ENCRYPTION_PASSPHRASE =
      "una-passphrase-larga-y-unica-para-estudio";

    const created = await createStudyNoteForUser({
      userId,
      title: "Documento cifrado",
      text:
        "Este texto contiene una referencia sensible a una regularizacion fiscal pendiente y no debe quedar en claro en disco.",
    });

    const studyTextPath = path.join(
      localDataDir,
      "document-study",
      userId,
      "texts",
      `${created.id}.txt`,
    );
    const rawText = await readFile(studyTextPath, "utf8");

    expect(rawText).toContain('"format": "facturaia-encrypted"');
    expect(rawText).not.toContain("regularizacion fiscal pendiente");
  });
});
