import { listUsers } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { createDocument, listDocuments } from "@/lib/documents";
import { currentUser, jsonError, readJson, revalidateDocumentList } from "@/lib/http";

export const runtime = "nodejs";

export async function GET() {
  const user = await currentUser();
  if (!user) return jsonError("Sign in to continue.", 401);
  return Response.json({ documents: listDocuments(getDb(), user.id), users: listUsers(getDb()) });
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return jsonError("Sign in to create a document.", 401);

  const body = await readJson(request);
  const title = typeof body?.title === "string" ? body.title : "Untitled document";
  const contentHtml = typeof body?.contentHtml === "string" ? body.contentHtml : "<p></p>";

  try {
    const created = createDocument(getDb(), user.id, title, contentHtml);
    if (!created.ok) return jsonError(created.error, created.status);
    revalidateDocumentList();
    return Response.json({ document: created.value }, { status: 201 });
  } catch (error) {
    console.error(error);
    return jsonError("Could not create the document.", 500);
  }
}
