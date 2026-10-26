import { afterAll, describe, expect, it } from "vitest";
import { authenticate } from "@/lib/auth";
import { DEMO_PASSWORD, SEEDED_DOCUMENT_TITLE } from "@/lib/constants";
import { createDatabase } from "@/lib/db";
import {
  createDocument,
  deleteDocument,
  getDocument,
  listDocuments,
  removeShare,
  setShare,
  updateDocument,
} from "@/lib/documents";

const db = createDatabase(":memory:");

function user(email: string) {
  const found = authenticate(db, email, DEMO_PASSWORD);
  if (!found) throw new Error(`Missing seeded user ${email}`);
  return found;
}

const ada = user("ada@ajaia.test");
const lin = user("lin@ajaia.test");
const noah = user("noah@ajaia.test");

describe("document access", () => {
  afterAll(() => db.close());

  it("rejects a wrong password and accepts a seeded teammate", () => {
    expect(authenticate(db, "ada@ajaia.test", "nope")).toBeNull();
    expect(ada.name).toBe("Ada Okonkwo");
  });

  it("shows the seeded draft as owned by Ada and shared with Lin, not Noah", () => {
    const adaKickoff = listDocuments(db, ada.id).find((doc) => doc.title === SEEDED_DOCUMENT_TITLE);
    const linKickoff = listDocuments(db, lin.id).find((doc) => doc.title === SEEDED_DOCUMENT_TITLE);
    const noahKickoff = listDocuments(db, noah.id).find((doc) => doc.title === SEEDED_DOCUMENT_TITLE);

    expect(adaKickoff?.access).toBe("owner");
    expect(linKickoff?.access).toBe("edit");
    expect(noahKickoff).toBeUndefined();
  });

  it("enforces owner, editor, and viewer permissions on one document", () => {
    const created = createDocument(
      db,
      ada.id,
      "Launch checklist",
      "<p>Ship the <strong>sharing</strong> demo.</p><script>nope</script>",
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    expect(created.value.contentHtml).toContain("<strong>sharing</strong>");
    expect(created.value.contentHtml).not.toContain("<script>");
    expect(getDocument(db, created.value.id, noah.id)).toBeNull();

    expect(setShare(db, created.value.id, lin.id, "noah@ajaia.test", "edit")).toMatchObject({
      ok: false,
      status: 404,
    });

    const editorGrant = setShare(db, created.value.id, ada.id, "lin@ajaia.test", "edit");
    const viewerGrant = setShare(db, created.value.id, ada.id, "noah@ajaia.test", "view");
    expect(editorGrant.ok).toBe(true);
    expect(viewerGrant.ok).toBe(true);

    const linWrite = updateDocument(db, created.value.id, lin.id, {
      contentHtml: "<p>Lin added a line.</p>",
    });
    expect(linWrite.ok).toBe(true);

    expect(updateDocument(db, created.value.id, noah.id, { contentHtml: "<p>Changed</p>" })).toMatchObject({
      ok: false,
      status: 403,
    });
    expect(setShare(db, created.value.id, lin.id, "noah@ajaia.test", "edit")).toMatchObject({
      ok: false,
      status: 403,
    });
    expect(deleteDocument(db, created.value.id, lin.id)).toMatchObject({ ok: false, status: 403 });

    const promoted = setShare(db, created.value.id, ada.id, "noah@ajaia.test", "edit");
    expect(promoted.ok).toBe(true);
    const noahWrite = updateDocument(db, created.value.id, noah.id, {
      title: "Launch checklist revised",
      contentHtml: "<h2>Ready</h2><ul><li>Share it</li></ul>",
    });
    expect(noahWrite.ok).toBe(true);
    if (!noahWrite.ok) return;
    expect(noahWrite.value.title).toBe("Launch checklist revised");
    expect(noahWrite.value.contentHtml).toContain("<h2>Ready</h2>");

    const contentOnly = updateDocument(db, created.value.id, noah.id, {
      contentHtml: "<p>Only the body changed.</p>",
    });
    expect(contentOnly.ok).toBe(true);
    if (!contentOnly.ok) return;
    expect(contentOnly.value.title).toBe("Launch checklist revised");
    const titleOnly = updateDocument(db, created.value.id, ada.id, { title: "Launch checklist final" });
    expect(titleOnly.ok).toBe(true);
    if (!titleOnly.ok) return;
    expect(titleOnly.value.title).toBe("Launch checklist final");
    expect(titleOnly.value.contentHtml).toContain("Only the body changed.");
    expect(setShare(db, created.value.id, noah.id, "lin@ajaia.test", "view")).toMatchObject({
      ok: false,
      status: 403,
    });

    const removed = removeShare(db, created.value.id, ada.id, noah.id);
    expect(removed.ok).toBe(true);
    expect(getDocument(db, created.value.id, noah.id)).toBeNull();
    expect(listDocuments(db, noah.id).some((doc) => doc.id === created.value.id)).toBe(false);
    expect(listDocuments(db, lin.id).find((doc) => doc.id === created.value.id)?.access).toBe("edit");

    expect(deleteDocument(db, created.value.id, ada.id)).toEqual({ ok: true, value: { id: created.value.id } });
    expect(getDocument(db, created.value.id, ada.id)).toBeNull();
    expect(getDocument(db, created.value.id, lin.id)).toBeNull();
  });

  it("does not share a document with its owner or an unknown email", () => {
    const created = createDocument(db, lin.id, "Lin's private notes", "<p>Only Lin.</p>");
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(setShare(db, created.value.id, lin.id, "lin@ajaia.test", "edit")).toMatchObject({
      ok: false,
      status: 400,
    });
    expect(setShare(db, created.value.id, lin.id, "missing@ajaia.test", "view")).toMatchObject({
      ok: false,
      status: 400,
    });
  });
});
