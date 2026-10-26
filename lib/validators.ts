import { MAX_CONTENT_LENGTH, MAX_TITLE_LENGTH } from "@/lib/constants";
import { sanitizeDocumentHtml } from "@/lib/sanitize";

export function isDocumentId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export function normalizeEmail(input: string): string | null {
  const email = input.trim().toLowerCase();
  if (email.length > 200) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

export function normalizeTitle(input: string): { ok: true; title: string } | { ok: false; error: string } {
  const title = input.trim().replace(/\s+/g, " ");
  if (!title) return { ok: false, error: "Give the document a title." };
  if (title.length > MAX_TITLE_LENGTH) {
    return { ok: false, error: `Titles must be ${MAX_TITLE_LENGTH} characters or fewer.` };
  }
  return { ok: true, title };
}

export function normalizeContent(input: string): { ok: true; html: string } | { ok: false; error: string } {
  if (input.length > MAX_CONTENT_LENGTH) {
    return { ok: false, error: "This document is too large to save." };
  }
  return { ok: true, html: sanitizeDocumentHtml(input) };
}

export function isPermission(value: string): value is "view" | "edit" {
  return value === "view" || value === "edit";
}
