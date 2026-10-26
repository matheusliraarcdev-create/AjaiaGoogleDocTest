import { currentUser, jsonError } from "@/lib/http";

export const runtime = "nodejs";

export async function GET() {
  const user = await currentUser();
  if (!user) return jsonError("Sign in to continue.", 401);
  return Response.json({ user });
}
