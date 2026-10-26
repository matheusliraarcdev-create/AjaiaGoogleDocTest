import { marked } from "marked";
import { MAX_UPLOAD_BYTES } from "@/lib/constants";
import { sanitizeDocumentHtml } from "@/lib/sanitize";
import { normalizeTitle } from "@/lib/validators";

const SUPPORTED = "Import a .txt, .md, or .docx file.";

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function textToHtml(text: string): string {
  const normalized = text.replaceAll("\r\n", "\n").replaceAll("\r", "\n").trim();
  if (!normalized) return "";
  return normalized
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll("\n", "<br />")}</p>`)
    .join("");
}

export function markdownToHtml(markdown: string): string {
  const parsed = marked.parse(markdown, { async: false, gfm: true });
  return typeof parsed === "string" ? parsed : "";
}

export function titleFromFilename(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? "Imported document";
  const stripped = base.replace(/\.(txt|md|markdown|docx)$/i, "").replace(/[_-]+/g, " ").trim();
  const normalized = normalizeTitle(stripped || "Imported document");
  return normalized.ok ? normalized.title : "Imported document";
}

export async function importFile(
  filename: string,
  data: Buffer,
): Promise<{ ok: true; title: string; html: string } | { ok: false; error: string }> {
  if (data.length === 0) return { ok: false, error: "This file is empty." };
  if (data.length > MAX_UPLOAD_BYTES) return { ok: false, error: "Files must be 2 MB or smaller." };

  const extension = filename.toLowerCase().split(".").pop();
  let rawHtml = "";
  try {
    if (extension === "txt") rawHtml = textToHtml(data.toString("utf8"));
    else if (extension === "md" || extension === "markdown") rawHtml = markdownToHtml(data.toString("utf8"));
    else if (extension === "docx") rawHtml = await docxToHtml(data);
    else return { ok: false, error: SUPPORTED };
  } catch {
    return { ok: false, error: "This file could not be read. Check that it is a valid .txt, .md, or .docx file." };
  }

  const html = sanitizeDocumentHtml(rawHtml);
  if (html === "<p></p>") return { ok: false, error: "This file has no text to import." };
  return { ok: true, title: titleFromFilename(filename), html };
}

async function docxToHtml(data: Buffer): Promise<string> {
  const loaded = await import("mammoth");
  const mammoth = loaded.default ?? loaded;
  const result = await mammoth.convertToHtml({ buffer: data });
  return result.value;
}
