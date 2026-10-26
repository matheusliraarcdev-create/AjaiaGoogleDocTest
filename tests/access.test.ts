import { afterAll, describe, expect, it } from "vitest";
import { authenticate } from "@/lib/auth";
import { DEMO_PASSWORD, SEEDED_DOCUMENT_TITLE } from "@/lib/constants";
import { createLocalDatabase } from "@/lib/db";
import {
  createDocument,
  deleteDocument,
  getDocument,
  listDocuments,
  removeShare,
  setShare,
  updateDocument,
} from "@/lib/documents";

const db = await createLocalDatabase(":memory:");

async function user(email: string) {
  const found = await authenticate(db, email, DEMO_PASSWORD);
  if (!found) throw new Error(`Missing seeded user ${email}`);
  return found;
}

const ada = await user("ada@ajaia.test");
const lin = await user("lin@ajaia.test");
const noah = await user("noah@ajaia.test");

describe("document access", () => {
  afterAll(() => db.close());

  it("rejects a wrong password and accepts a seeded teammate", async () => {
    expect(await authenticate(db, "ada@ajaia.test", "nope")).toBeNull();
    expect(ada.name).toBe("Ada Okonkwo");
  });

  it("shows the seeded draft as owned by Ada and shared with Lin, not Noah", async () => {
    const adaKickoff = (await listDocuments(db, ada.id)).find((doc) => doc.title === SEEDED_DOCUMENT_TITLE);
    const linKickoff = (await listDocuments(db, lin.id)).find((doc) => doc.title === SEEDED_DOCUMENT_TITLE);
    const noahKickoff = (await listDocuments(db, noah.id)).find((doc) => doc.title === SEEDED_DOCUMENT_TITLE);

    expect(adaKickoff?.access).toBe("owner");
    expect(linKickoff?.access).toBe("edit");
    expect(noahKickoff).toBeUndefined();
  });

  it("enforces owner, editor, and viewer permissions on one document", async () => {
    const created = await createDocument(
      db,
      ada.id,
      "Launch checklist",
      "<p>Ship the <strong>sharing</strong> demo.</p><script>nope</script>",
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    expect(created.value.contentHtml).toContain("<strong>sharing</strong>");
    expect(created.value.contentHtml).not.toContain("<script>");
    expect(await getDocument(db, created.value.id, noah.id)).toBeNull();

    expect(await setShare(db, created.value.id, lin.id, "noah@ajaia.test", "edit")).toMatchObject({
      ok: false,
      status: 404,
    });

    const editorGrant = await setShare(db, created.value.id, ada.id, "lin@ajaia.test", "edit");
    const viewerGrant = await setShare(db, created.value.id, ada.id, "noah@ajaia.test", "view");
    expect(editorGrant.ok).toBe(true);
    expect(viewerGrant.ok).toBe(true);

    const linWrite = await updateDocument(db, created.value.id, lin.id, {
      contentHtml: "<p>Lin added a line.</p>",
    });
    expect(linWrite.ok).toBe(true);

    expect(await updateDocument(db, created.value.id, noah.id, { contentHtml: "<p>Changed</p>" })).toMatchObject({
      ok: false,
      status: 403,
    });
    expect(await setShare(db, created.value.id, lin.id, "noah@ajaia.test", "edit")).toMatchObject({
      ok: false,
      status: 403,
    });
    expect(await deleteDocument(db, created.value.id, lin.id)).toMatchObject({ ok: false, status: 403 });

    const promoted = await setShare(db, created.value.id, ada.id, "noah@ajaia.test", "edit");
    expect(promoted.ok).toBe(true);
    const noahWrite = await updateDocument(db, created.value.id, noah.id, {
      title: "Launch checklist revised",
      contentHtml: "<h2>Ready</h2><ul><li>Share it</li></ul>",
    });
    expect(noahWrite.ok).toBe(true);
    if (!noahWrite.ok) return;
    expect(noahWrite.value.title).toBe("Launch checklist revised");
    expect(noahWrite.value.contentHtml).toContain("<h2>Ready</h2>");

    const contentOnly = await updateDocument(db, created.value.id, noah.id, {
      contentHtml: "<p>Only the body changed.</p>",
    });
    expect(contentOnly.ok).toBe(true);
    if (!contentOnly.ok) return;
    expect(contentOnly.value.title).toBe("Launch checklist revised");
    const titleOnly = await updateDocument(db, created.value.id, ada.id, { title: "Launch checklist final" });
    expect(titleOnly.ok).toBe(true);
    if (!titleOnly.ok) return;
    expect(titleOnly.value.title).toBe("Launch checklist final");
    expect(titleOnly.value.contentHtml).toContain("Only the body changed.");
    expect(await setShare(db, created.value.id, noah.id, "lin@ajaia.test", "view")).toMatchObject({
      ok: false,
      status: 403,
    });

    const removed = await removeShare(db, created.value.id, ada.id, noah.id);
    expect(removed.ok).toBe(true);
    expect(await getDocument(db, created.value.id, noah.id)).toBeNull();
    expect((await listDocuments(db, noah.id)).some((doc) => doc.id === created.value.id)).toBe(false);
    expect((await listDocuments(db, lin.id)).find((doc) => doc.id === created.value.id)?.access).toBe("edit");

    expect(await deleteDocument(db, created.value.id, ada.id)).toEqual({ ok: true, value: { id: created.value.id } });
    expect(await getDocument(db, created.value.id, ada.id)).toBeNull();
    expect(await getDocument(db, created.value.id, lin.id)).toBeNull();
  });

  it("does not share a document with its owner or an unknown email", async () => {
    const created = await createDocument(db, lin.id, "Lin's private notes", "<p>Only Lin.</p>");
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(await setShare(db, created.value.id, lin.id, "lin@ajaia.test", "edit")).toMatchObject({
      ok: false,
      status: 400,
    });
    expect(await setShare(db, created.value.id, lin.id, "missing@ajaia.test", "view")).toMatchObject({
      ok: false,
      status: 400,
    });
  });
});
