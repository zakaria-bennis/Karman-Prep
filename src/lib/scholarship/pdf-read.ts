// ============================================================
// Read an uploaded PDF into plain facts for the automatic check.
//
//   pdf-lib    metadata: producer, creator, dates, encryption,
//              annotations and form fields.
//   pdf-parse  the text, to find the name, date and scores.
//   raw bytes  %%EOF markers (each one after the first is a later
//              save), linearization, scripts, attachments.
//
// Nothing here throws on a bad file: problems become facts
// (loadError, textError) that the check turns into reasons.
// ============================================================

import type { PdfFacts } from "./pdf-check";

const MAX_TEXT = 200_000;

function latin1(bytes: Uint8Array): string {
  let s = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    s += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return s;
}

export function looksLikePdf(bytes: Uint8Array): boolean {
  const head = latin1(bytes.subarray(0, 1024));
  return head.includes("%PDF-");
}

function countOccurrences(hay: string, needle: string): number {
  let n = 0;
  let i = hay.indexOf(needle);
  while (i !== -1) {
    n += 1;
    i = hay.indexOf(needle, i + needle.length);
  }
  return n;
}

async function readText(bytes: Uint8Array): Promise<{ text: string; error: string | null }> {
  try {
    const { PDFParse } = await import("pdf-parse");
    // A copy: pdf.js may transfer (detach) the buffer it is given.
    const parser = new PDFParse({ data: new Uint8Array(bytes) });
    try {
      const result = await parser.getText();
      return { text: result.text.slice(0, MAX_TEXT), error: null };
    } finally {
      await parser.destroy().catch(() => {});
    }
  } catch (err) {
    return { text: "", error: err instanceof Error ? err.message : "Text could not be read" };
  }
}

export async function readPdfFacts(bytes: Uint8Array): Promise<PdfFacts> {
  const raw = latin1(bytes);
  const base: PdfFacts = {
    loadError: null,
    pageCount: 0,
    encrypted: false,
    producer: null,
    creator: null,
    creationDate: null,
    modDate: null,
    eofCount: countOccurrences(raw, "%%EOF"),
    linearized: raw.slice(0, 2048).includes("/Linearized"),
    annotationSubtypes: [],
    formFieldCount: 0,
    hasJavaScript: raw.includes("/JavaScript") || /\/JS\s*[(<]/.test(raw),
    hasEmbeddedFiles: raw.includes("/EmbeddedFile"),
    text: "",
    textError: null,
  };

  if (!looksLikePdf(bytes)) {
    return { ...base, loadError: "Not a PDF file" };
  }

  try {
    const { PDFDocument, PDFArray, PDFDict, PDFName } = await import("pdf-lib");
    const doc = await PDFDocument.load(bytes, {
      ignoreEncryption: true,
      updateMetadata: false,
      throwOnInvalidObject: false,
    });
    base.encrypted = doc.isEncrypted;
    base.pageCount = doc.getPageCount();
    base.producer = doc.getProducer()?.trim() || null;
    base.creator = doc.getCreator()?.trim() || null;
    base.creationDate = doc.getCreationDate()?.toISOString() ?? null;
    base.modDate = doc.getModificationDate()?.toISOString() ?? null;

    const subtypes: string[] = [];
    for (const page of doc.getPages()) {
      const annots = page.node.Annots();
      if (!(annots instanceof PDFArray)) continue;
      for (let i = 0; i < annots.size(); i += 1) {
        const dict = annots.lookupMaybe(i, PDFDict);
        const subtype = dict?.lookupMaybe(PDFName.of("Subtype"), PDFName);
        if (subtype) subtypes.push(subtype.decodeText());
      }
    }
    base.annotationSubtypes = subtypes;

    try {
      base.formFieldCount = doc.getForm().getFields().length;
    } catch {
      base.formFieldCount = 0;
    }
  } catch (err) {
    return { ...base, loadError: err instanceof Error ? err.message : "Could not open the PDF" };
  }

  const { text, error } = await readText(bytes);
  return { ...base, text, textError: error };
}
