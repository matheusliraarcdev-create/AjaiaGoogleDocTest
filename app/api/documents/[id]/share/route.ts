import { getDb } from "@/lib/db";
import { removeShare, setShare } from "@/lib/documents";
import { currentUser, jsonError, readJson, revalidateDocumentList } from "@/lib/http";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const user = await currentUser();
  if (!user) return jsonError("Sign in to share this document.", 401);
  const { id } = await context.params;
  const body = await readJson(request);
  const email = typeof body?.email === "string" ? body.email : "";
  const permission = typeof body?.permission === "string" ? body.permission : "";

  try {
    const shared = await setShare(await getDb(), id, user.id, email, permission);
    if (!shared.ok) return jsonError(shared.error, shared.status);
    revalidateDocumentList();
    return Response.json({ document: shared.value });
  } catch (error) {
    console.error(error);
    return jsonError("Could not update sharing.", 500);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const user = await currentUser();
  if (!user) return jsonError("Sign in to share this document.", 401);
  const { id } = await context.params;
  const userId = new URL(request.url).searchParams.get("userId") ?? "";
  if (!userId) return jsonError("Choose who should lose access.", 400);

  try {
    const removed = await removeShare(await getDb(), id, user.id, userId);
    if (!removed.ok) return jsonError(removed.error, removed.status);
    revalidateDocumentList();
    return Response.json({ document: removed.value });
  } catch (error) {
    console.error(error);
    return jsonError("Could not update sharing.", 500);
  }
}
