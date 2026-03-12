import type { ChatAttachment } from "./types";

const MAX_EXTRACTED_CHARS = 30000;
const EXTRACTION_TIMEOUT_MS = 20000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);

    promise
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timer);
        reject(error);
      });
  });
}

function trimExtractedText(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, MAX_EXTRACTED_CHARS);
}

async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  if ("GlobalWorkerOptions" in pdfjs) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/legacy/build/pdf.worker.mjs",
      import.meta.url
    ).toString();
  }
  const data = new Uint8Array(await file.arrayBuffer());
  const document = await pdfjs.getDocument({ data }).promise;

  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const text = textContent.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    if (text.trim()) {
      pages.push(text);
    }
  }

  return trimExtractedText(pages.join("\n\n"));
}

async function extractDocxText(file: File): Promise<string> {
  const mammoth = await import("mammoth/mammoth.browser");
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return trimExtractedText(result.value);
}

async function extractPlainText(file: File): Promise<string> {
  return trimExtractedText(await file.text());
}

export async function extractAttachment(file: File): Promise<ChatAttachment> {
  const base: ChatAttachment = {
    name: file.name,
    type: file.type || "application/octet-stream",
    extractionStatus: "pending",
    extractedText: null,
    extractionError: null,
  };

  try {
    const name = file.name.toLowerCase();
    const type = file.type.toLowerCase();

    let extractedText = "";
    if (type === "application/pdf" || name.endsWith(".pdf")) {
      extractedText = await withTimeout(
        extractPdfText(file),
        EXTRACTION_TIMEOUT_MS,
        "PDF extraction timed out."
      );
    } else if (
      type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      name.endsWith(".docx")
    ) {
      extractedText = await withTimeout(
        extractDocxText(file),
        EXTRACTION_TIMEOUT_MS,
        "DOCX extraction timed out."
      );
    } else if (
      type.startsWith("text/") ||
      name.endsWith(".txt") ||
      name.endsWith(".md") ||
      name.endsWith(".json") ||
      name.endsWith(".csv") ||
      name.endsWith(".xml")
    ) {
      extractedText = await withTimeout(
        extractPlainText(file),
        EXTRACTION_TIMEOUT_MS,
        "Text extraction timed out."
      );
    } else {
      return {
        ...base,
        extractionStatus: "unsupported",
        extractionError: "Unsupported file type for text extraction.",
      };
    }

    if (!extractedText) {
      return {
        ...base,
        extractionStatus: "failed",
        extractionError: "No readable text was extracted from the file.",
      };
    }

    return {
      ...base,
      extractionStatus: "ready",
      extractedText,
    };
  } catch (error) {
    return {
      ...base,
      extractionStatus: "failed",
      extractionError: error instanceof Error ? error.message : "Document extraction failed.",
    };
  }
}
