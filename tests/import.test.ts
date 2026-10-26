import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { importFile } from "@/lib/import-file";
import { sanitizeDocumentHtml } from "@/lib/sanitize";

describe("file import", () => {
  it("turns a text file into paragraphs and escapes HTML", async () => {
    const file = readFileSync(path.join(process.cwd(), "samples", "plain-notes.txt"));
    const result = await importFile("plain-notes.txt", file);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.title).toBe("plain notes");
    expect(result.html).toContain("<p>Standup notes</p>");
    expect(result.html).toContain("Ada is writing the kickoff document.");
    expect(result.html).not.toContain("<script>");
  });

  it("keeps markdown headings, emphasis, and lists", async () => {
    const file = readFileSync(path.join(process.cwd(), "samples", "weekly-update.md"));
    const result = await importFile("weekly-update.md", file);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.title).toBe("weekly update");
    expect(result.html).toContain("<h1>Weekly update</h1>");
    expect(result.html).toContain("<h2>Done</h2>");
    expect(result.html).toContain("<strong>view</strong>");
    expect(result.html).toContain("<ul>");
    expect(result.html).toContain("<ol>");
    expect(result.html).toContain("<em>Notes are easier to review");
  });

  it("turns a Word document into editable HTML", async () => {
    const file = readFileSync(path.join(process.cwd(), "samples", "word-notes.docx"));
    const result = await importFile("word-notes.docx", file);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.title).toBe("word notes");
    expect(result.html).toContain("Imported from Word");
    expect(result.html).toContain("editable Folio document");
  });
  it("rejects unsupported types, empty files, and oversized uploads", async () => {
    const pdf = await importFile("notes.pdf", Buffer.from("hello"));
    const empty = await importFile("notes.txt", Buffer.alloc(0));
    const huge = await importFile("notes.txt", Buffer.alloc(2 * 1024 * 1024 + 1, 65));
    const broken = await importFile("notes.docx", Buffer.from("this is not a word file"));

    expect(pdf).toEqual({ ok: false, error: "Import a .txt, .md, or .docx file." });
    expect(empty).toEqual({ ok: false, error: "This file is empty." });
    expect(huge).toEqual({ ok: false, error: "Files must be 2 MB or smaller." });
    expect(broken.ok).toBe(false);
  });

  it("strips scripts and event handlers before a document is stored", () => {
    const clean = sanitizeDocumentHtml(
      `<script>alert(1)</script><p onclick="steal()">Hi <strong>there</strong></p>`,
    );
    expect(clean).toBe("<p>Hi <strong>there</strong></p>");
    expect(clean).not.toContain("script");
    expect(clean).not.toContain("onclick");
  });
});
