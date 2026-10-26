import { getDb } from "@/lib/db";
import { createDocument } from "@/lib/documents";
import { currentUser, jsonError, revalidateDocumentList } from "@/lib/http";
import { importFile } from "@/lib/import-file";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return jsonError("Sign in to import a file.", 401);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError("Choose a .txt, .md, or .docx file.", 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) return jsonError("Choose a .txt, .md, or .docx file.", 400);

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const imported = await importFile(file.name, buffer);
    if (!imported.ok) return jsonError(imported.error, 400);
    const created = await createDocument(await getDb(), user.id, imported.title, imported.html);
    if (!created.ok) return jsonError(created.error, created.status);
    revalidateDocumentList();
    return Response.json({ document: created.value }, { status: 201 });
  } catch (error) {
    console.error(error);
    return jsonError("Could not import that file.", 500);
  }
}
