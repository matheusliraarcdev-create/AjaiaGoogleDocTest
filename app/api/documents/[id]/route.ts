import { getDb } from "@/lib/db";
import { deleteDocument, getDocument, updateDocument } from "@/lib/documents";
import { currentUser, jsonError, readJson, revalidateDocumentList } from "@/lib/http";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const user = await currentUser();
  if (!user) return jsonError("Sign in to continue.", 401);
  const { id } = await context.params;
  const document = getDocument(getDb(), id, user.id);
  if (!document) return jsonError("Document not found.", 404);
  return Response.json({ document });
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await currentUser();
  if (!user) return jsonError("Sign in to edit this document.", 401);
  const { id } = await context.params;
  const body = await readJson(request);
  if (!body) return jsonError("The document update was empty.", 400);

  const patch: { title?: string; contentHtml?: string } = {};
  if ("title" in body) {
    if (typeof body.title !== "string") return jsonError("The title needs to be text.", 400);
    patch.title = body.title;
  }
  if ("contentHtml" in body) {
    if (typeof body.contentHtml !== "string") return jsonError("The document content needs to be text.", 400);
    patch.contentHtml = body.contentHtml;
  }
  if (patch.title === undefined && patch.contentHtml === undefined) {
    return jsonError("Nothing in this document changed.", 400);
  }

  try {
    const updated = updateDocument(getDb(), id, user.id, patch);
    if (!updated.ok) return jsonError(updated.error, updated.status);
    revalidateDocumentList();
    return Response.json({ document: updated.value });
  } catch (error) {
    console.error(error);
    return jsonError("Could not save the document.", 500);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await currentUser();
  if (!user) return jsonError("Sign in to delete this document.", 401);
  const { id } = await context.params;
  try {
    const removed = deleteDocument(getDb(), id, user.id);
    if (!removed.ok) return jsonError(removed.error, removed.status);
    revalidateDocumentList();
    return Response.json(removed.value);
  } catch (error) {
    console.error(error);
    return jsonError("Could not delete the document.", 500);
  }
}
