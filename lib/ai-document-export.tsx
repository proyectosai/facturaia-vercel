/* eslint-disable jsx-a11y/alt-text */

import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import {
  BorderStyle,
  Document as DocxDocument,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { z } from "zod";

import { getBaseUrl } from "@/lib/utils";

const logoUrlSchema = z
  .string()
  .trim()
  .max(500)
  .refine((value) => {
    if (!value) {
      return true;
    }

    if (value.startsWith("/")) {
      return true;
    }

    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }, "La URL del logo no es válida.");

export const documentExportSchema = z.object({
  title: z.string().trim().min(3).max(180),
  body: z.string().trim().min(30).max(30000),
  issuerName: z.string().trim().max(180).optional(),
  clientName: z.string().trim().max(180).optional(),
  logoUrl: logoUrlSchema.optional().or(z.literal("")),
  additionalText: z.string().trim().max(4000).optional(),
});

type DocumentExportPayload = z.infer<typeof documentExportSchema>;

type DocumentBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "bullet_list"; items: string[] }
  | { type: "table"; rows: string[][] }
  | { type: "separator" };

type DocxChild = Paragraph | Table;
type DocxImageType = "png" | "jpg" | "gif" | "bmp";
type LoadedImageAsset = {
  buffer: Buffer;
  type: DocxImageType;
};

const pdfStyles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingHorizontal: 34,
    paddingBottom: 30,
    backgroundColor: "#fffdf9",
    color: "#173038",
    fontFamily: "Helvetica",
    fontSize: 11,
    lineHeight: 1.45,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 18,
    marginBottom: 24,
  },
  brandWrap: {
    flex: 1,
    flexDirection: "row",
    gap: 14,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 16,
    objectFit: "cover",
  },
  logoFallback: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1f6661",
  },
  logoFallbackText: {
    color: "#f8f5ef",
    fontWeight: "bold",
    fontSize: 13,
  },
  eyebrow: {
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 1.1,
    color: "#627277",
  },
  title: {
    marginTop: 5,
    fontSize: 20,
    fontWeight: "bold",
    color: "#132d34",
    lineHeight: 1.05,
  },
  metaPanel: {
    width: 180,
    backgroundColor: "#f3ece1",
    borderRadius: 18,
    padding: 14,
    gap: 6,
  },
  metaLabel: {
    fontSize: 8.5,
    color: "#66767a",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  metaValue: {
    fontSize: 10.5,
    color: "#173038",
  },
  divider: {
    height: 1,
    backgroundColor: "#e6ddcf",
    marginVertical: 14,
  },
  paragraph: {
    marginBottom: 10,
  },
  heading2: {
    marginTop: 12,
    marginBottom: 8,
    fontSize: 16,
    fontWeight: "bold",
    color: "#132d34",
  },
  heading3: {
    marginTop: 10,
    marginBottom: 6,
    fontSize: 13,
    fontWeight: "bold",
    color: "#20444b",
  },
  bulletRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 5,
  },
  bulletDot: {
    width: 5,
    height: 5,
    marginTop: 5,
    borderRadius: 999,
    backgroundColor: "#1f6661",
  },
  bulletText: {
    flex: 1,
  },
  table: {
    marginVertical: 10,
    borderWidth: 1,
    borderColor: "#e3d9cb",
    borderRadius: 12,
    overflow: "hidden",
  },
  tableRow: {
    flexDirection: "row",
  },
  tableHeader: {
    backgroundColor: "#183b43",
  },
  tableCell: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRightWidth: 1,
    borderRightColor: "#e3d9cb",
    fontSize: 10,
  },
  tableCellLast: {
    borderRightWidth: 0,
  },
  tableHeaderText: {
    color: "#fffdf8",
    fontWeight: "bold",
  },
  tableBodyRow: {
    borderTopWidth: 1,
    borderTopColor: "#e9e0d5",
    backgroundColor: "#fffdf9",
  },
  noteBox: {
    marginTop: 18,
    borderRadius: 16,
    backgroundColor: "#eef5f2",
    padding: 14,
  },
  noteTitle: {
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#5f6f73",
    marginBottom: 6,
  },
  noteParagraph: {
    marginBottom: 6,
  },
  footer: {
    position: "absolute",
    left: 34,
    right: 34,
    bottom: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8.5,
    color: "#728387",
  },
});

function normalizeDocumentText(value: string) {
  return value
    .replace(/^```[a-z]*\n?/gim, "")
    .replace(/\n?```$/gim, "")
    .replace(/^[•·]\s+/gm, "- ")
    .replace(/[‐‑‒–—―]/g, "-")
    .replace(/[“”«»]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\u2026/g, "...")
    .replace(/[\u00A0\u202F]/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanInlineMarkdown(value: string) {
  return normalizeDocumentText(value)
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .trim();
}

function parseTableRow(line: string) {
  return line
    .split("|")
    .map((cell) => cleanInlineMarkdown(cell.trim()))
    .filter(Boolean);
}

function isSeparatorRow(line: string) {
  const compact = line.replace(/\s+/g, "");
  return /^\|?[-:|]+\|?$/.test(compact);
}

function parseDocumentBlocks(body: string): DocumentBlock[] {
  const lines = normalizeDocumentText(body).split("\n");
  const blocks: DocumentBlock[] = [];
  let paragraphBuffer: string[] = [];
  let bulletBuffer: string[] = [];
  let tableBuffer: string[] = [];

  function flushParagraph() {
    if (!paragraphBuffer.length) {
      return;
    }

    blocks.push({
      type: "paragraph",
      text: cleanInlineMarkdown(paragraphBuffer.join(" ").trim()),
    });
    paragraphBuffer = [];
  }

  function flushBullets() {
    if (!bulletBuffer.length) {
      return;
    }

    blocks.push({
      type: "bullet_list",
      items: bulletBuffer.map((item) => cleanInlineMarkdown(item)),
    });
    bulletBuffer = [];
  }

  function flushTable() {
    if (!tableBuffer.length) {
      return;
    }

    const rows = tableBuffer
      .filter((line) => !isSeparatorRow(line))
      .map(parseTableRow)
      .filter((row) => row.length > 0);

    if (rows.length) {
      blocks.push({ type: "table", rows });
    }

    tableBuffer = [];
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushBullets();
      flushTable();
      continue;
    }

    if (/^-{3,}$/.test(line)) {
      flushParagraph();
      flushBullets();
      flushTable();
      blocks.push({ type: "separator" });
      continue;
    }

    if (line.startsWith("|")) {
      flushParagraph();
      flushBullets();
      tableBuffer.push(line);
      continue;
    }

    flushTable();

    if (/^\*\*[^*]+:\*\*\s*/.test(line)) {
      flushParagraph();
      flushBullets();
      blocks.push({
        type: "paragraph",
        text: cleanInlineMarkdown(line),
      });
      continue;
    }

    if (line.startsWith("### ")) {
      flushParagraph();
      flushBullets();
      blocks.push({
        type: "heading",
        level: 3,
        text: cleanInlineMarkdown(line.replace(/^###\s+/, "")),
      });
      continue;
    }

    if (line.startsWith("## ")) {
      flushParagraph();
      flushBullets();
      blocks.push({
        type: "heading",
        level: 2,
        text: cleanInlineMarkdown(line.replace(/^##\s+/, "")),
      });
      continue;
    }

    if (line.startsWith("- ")) {
      flushParagraph();
      bulletBuffer.push(line.replace(/^-+\s+/, ""));
      continue;
    }

    flushBullets();
    paragraphBuffer.push(line);
  }

  flushParagraph();
  flushBullets();
  flushTable();

  return blocks;
}

function buildFileSlug(value: string) {
  return normalizeDocumentText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function buildMetaRows(payload: DocumentExportPayload) {
  return [
    {
      label: "Emisor",
      value: payload.issuerName?.trim() || "[COMPLETAR]",
    },
    {
      label: "Cliente",
      value: payload.clientName?.trim() || "[COMPLETAR]",
    },
    {
      label: "Fecha",
      value: new Intl.DateTimeFormat("es-ES", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(new Date()),
    },
  ];
}

function resolveDocumentAssetUrl(value?: string) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("/")) {
    return `${getBaseUrl().replace(/\/+$/, "")}${trimmed}`;
  }

  try {
    return new URL(trimmed).toString();
  } catch {
    return null;
  }
}

function resolveDocxImageType(
  resolvedUrl: string,
  contentType?: string | null,
): DocxImageType | null {
  const normalizedContentType = contentType?.toLowerCase() ?? "";

  if (normalizedContentType.includes("svg")) {
    return null;
  }

  if (normalizedContentType.includes("gif")) {
    return "gif";
  }

  if (normalizedContentType.includes("bmp")) {
    return "bmp";
  }

  if (normalizedContentType.includes("jpeg") || normalizedContentType.includes("jpg")) {
    return "jpg";
  }

  if (normalizedContentType.includes("png")) {
    return "png";
  }

  const extension = resolvedUrl.split("?")[0]?.split(".").pop()?.toLowerCase();

  if (extension === "svg") {
    return null;
  }

  if (extension === "gif") {
    return "gif";
  }

  if (extension === "bmp") {
    return "bmp";
  }

  if (extension === "jpg" || extension === "jpeg") {
    return "jpg";
  }

  return "png";
}

async function loadRemoteImageAsset(url?: string) {
  const resolvedUrl = resolveDocumentAssetUrl(url);

  if (!resolvedUrl) {
    return null;
  }

  try {
    const response = await fetch(resolvedUrl);

    if (!response.ok) {
      return null;
    }

    const imageType = resolveDocxImageType(
      resolvedUrl,
      response.headers.get("content-type"),
    );

    if (!imageType) {
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    return {
      buffer: Buffer.from(arrayBuffer),
      type: imageType,
    } satisfies LoadedImageAsset;
  } catch {
    return null;
  }
}

function getAdditionalParagraphs(value?: string) {
  if (!value?.trim()) {
    return [];
  }

  return normalizeDocumentText(value)
    .split("\n\n")
    .map((paragraph) => cleanInlineMarkdown(paragraph))
    .filter(Boolean);
}

function renderPdfBlock(block: DocumentBlock, index: number) {
  if (block.type === "separator") {
    return <View key={`separator-${index}`} style={pdfStyles.divider} />;
  }

  if (block.type === "heading") {
    return (
      <Text
        key={`heading-${index}`}
        style={block.level === 2 ? pdfStyles.heading2 : pdfStyles.heading3}
      >
        {block.text}
      </Text>
    );
  }

  if (block.type === "bullet_list") {
    return (
      <View key={`bullets-${index}`} style={{ marginBottom: 8 }}>
        {block.items.map((item, itemIndex) => (
          <View key={`bullet-${index}-${itemIndex}`} style={pdfStyles.bulletRow}>
            <View style={pdfStyles.bulletDot} />
            <Text style={pdfStyles.bulletText}>{item}</Text>
          </View>
        ))}
      </View>
    );
  }

  if (block.type === "table") {
    const header = block.rows[0] ?? [];
    const rows = block.rows.slice(1);

    return (
      <View key={`table-${index}`} style={pdfStyles.table}>
        <View style={[pdfStyles.tableRow, pdfStyles.tableHeader]}>
          {header.map((cell, cellIndex) => (
            <View
              key={`table-header-${index}-${cellIndex}`}
              style={
                cellIndex === header.length - 1
                  ? [pdfStyles.tableCell, pdfStyles.tableCellLast]
                  : pdfStyles.tableCell
              }
            >
              <Text style={pdfStyles.tableHeaderText}>{cell}</Text>
            </View>
          ))}
        </View>

        {rows.map((row, rowIndex) => (
          <View
            key={`table-row-${index}-${rowIndex}`}
            style={[pdfStyles.tableRow, pdfStyles.tableBodyRow]}
          >
            {header.map((_, cellIndex) => (
              <View
                key={`table-cell-${index}-${rowIndex}-${cellIndex}`}
                style={
                  cellIndex === header.length - 1
                    ? [pdfStyles.tableCell, pdfStyles.tableCellLast]
                    : pdfStyles.tableCell
                }
              >
                <Text>{row[cellIndex] ?? ""}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  }

  return (
    <View key={`paragraph-${index}`} style={pdfStyles.paragraph}>
      <Text>{block.text}</Text>
    </View>
  );
}

function BusinessDocumentPdf({
  payload,
}: {
  payload: DocumentExportPayload;
}) {
  const blocks = parseDocumentBlocks(payload.body);
  const metaRows = buildMetaRows(payload);
  const additionalParagraphs = getAdditionalParagraphs(payload.additionalText);
  const baseUrl = getBaseUrl();
  const logoUrl = resolveDocumentAssetUrl(payload.logoUrl);

  return (
    <Document title={payload.title}>
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.header}>
          <View style={pdfStyles.brandWrap}>
            {logoUrl ? (
              <Image src={logoUrl} style={pdfStyles.logo} />
            ) : (
              <View style={pdfStyles.logoFallback}>
                <Text style={pdfStyles.logoFallbackText}>FIA</Text>
              </View>
            )}

            <View>
              <Text style={pdfStyles.eyebrow}>Documento comercial</Text>
              <Text style={pdfStyles.title}>{cleanInlineMarkdown(payload.title)}</Text>
              {payload.issuerName?.trim() ? (
                <Text style={{ marginTop: 6 }}>{cleanInlineMarkdown(payload.issuerName)}</Text>
              ) : null}
            </View>
          </View>

          <View style={pdfStyles.metaPanel}>
            {metaRows.map((item) => (
              <View key={item.label}>
                <Text style={pdfStyles.metaLabel}>{item.label}</Text>
                <Text style={pdfStyles.metaValue}>{cleanInlineMarkdown(item.value)}</Text>
              </View>
            ))}
          </View>
        </View>

        {blocks.map(renderPdfBlock)}

        {additionalParagraphs.length ? (
          <View style={pdfStyles.noteBox}>
            <Text style={pdfStyles.noteTitle}>Texto adicional</Text>
            {additionalParagraphs.map((paragraph, index) => (
              <Text
                key={`additional-${index}`}
                style={index === additionalParagraphs.length - 1 ? undefined : pdfStyles.noteParagraph}
              >
                {paragraph}
              </Text>
            ))}
          </View>
        ) : null}

        <View style={pdfStyles.footer} fixed>
          <Text>Generado desde FacturaIA</Text>
          <Text>{baseUrl.replace(/^https?:\/\//, "")}</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function renderAiDocumentPdfBuffer(payload: DocumentExportPayload) {
  return renderToBuffer(<BusinessDocumentPdf payload={payload} />);
}

function createDocxChildrenFromBlock(block: DocumentBlock): DocxChild[] {
  if (block.type === "separator") {
    return [
      new Paragraph({
        border: {
          bottom: {
            color: "D9D0C3",
            size: 6,
            style: BorderStyle.SINGLE,
          },
        },
        spacing: { after: 220 },
      }),
    ];
  }

  if (block.type === "heading") {
    return [
      new Paragraph({
        text: block.text,
        heading:
          block.level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
        spacing: { before: 220, after: 120 },
      }),
    ];
  }

  if (block.type === "bullet_list") {
    return block.items.map(
      (item) =>
        new Paragraph({
          text: item,
          bullet: {
            level: 0,
          },
          spacing: { after: 80 },
        }),
    );
  }

  if (block.type === "table") {
    const header = block.rows[0] ?? [];
    const rows = block.rows.slice(1);

    return [
      new Table({
        width: {
          size: 100,
          type: WidthType.PERCENTAGE,
        },
        rows: [
          new TableRow({
            tableHeader: true,
            children: header.map(
              (cell) =>
                new TableCell({
                  shading: { fill: "183B43" },
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: cell,
                          bold: true,
                          color: "FFFFFF",
                        }),
                      ],
                    }),
                  ],
                }),
            ),
          }),
          ...rows.map(
            (row) =>
              new TableRow({
                children: header.map(
                  (_, cellIndex) =>
                    new TableCell({
                      children: [
                        new Paragraph({
                          text: row[cellIndex] ?? "",
                        }),
                      ],
                    }),
                ),
              }),
          ),
        ],
      }),
    ];
  }

  return [
    new Paragraph({
      text: block.text,
      spacing: { after: 140 },
    }),
  ];
}

export async function renderAiDocumentDocxBuffer(payload: DocumentExportPayload) {
  const blocks = parseDocumentBlocks(payload.body);
  const metaRows = buildMetaRows(payload);
  const additionalParagraphs = getAdditionalParagraphs(payload.additionalText);
  const logoAsset = await loadRemoteImageAsset(payload.logoUrl?.trim());
  const children: DocxChild[] = [];

  if (logoAsset) {
    children.push(
      new Paragraph({
        children: [
          new ImageRun({
            data: logoAsset.buffer,
            type: logoAsset.type,
            transformation: {
              width: 96,
              height: 96,
            },
          }),
        ],
        spacing: { after: 180 },
      }),
    );
  }

  children.push(
    new Paragraph({
      text: cleanInlineMarkdown(payload.title),
      heading: HeadingLevel.TITLE,
      spacing: { after: 220 },
    }),
  );

  metaRows.forEach((item) => {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${item.label}: `,
            bold: true,
          }),
          new TextRun(cleanInlineMarkdown(item.value)),
        ],
        spacing: { after: 80 },
      }),
    );
  });

  children.push(
    new Paragraph({
      spacing: { after: 160 },
    }),
  );

  blocks.forEach((block) => {
    children.push(...createDocxChildrenFromBlock(block));
  });

  if (additionalParagraphs.length) {
    children.push(
      new Paragraph({
        text: "Texto adicional",
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 220, after: 120 },
      }),
    );

    additionalParagraphs.forEach((paragraph) => {
      children.push(
        new Paragraph({
          text: paragraph,
          spacing: { after: 100 },
        }),
      );
    });
  }

  const doc = new DocxDocument({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  return Packer.toBuffer(doc);
}

export function getAiDocumentFileName(
  title: string,
  extension: "pdf" | "docx",
) {
  const slug = buildFileSlug(title) || "documento";
  return `${slug}.${extension}`;
}
