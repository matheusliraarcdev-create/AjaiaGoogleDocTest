import { authenticate, createSession } from "@/lib/auth";
import { SESSION_COOKIE } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { jsonError, readJson, sessionCookie } from "@/lib/http";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await readJson(request);
  const email = typeof body?.email === "string" ? body.email : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!email || !password) return jsonError("Enter an email and password.", 400);

  try {
    const user = authenticate(getDb(), email, password);
    if (!user) return jsonError("Email or password is incorrect.", 401);
    const sessionId = createSession(getDb(), user.id);
    const jar = await cookies();
    jar.set(SESSION_COOKIE, sessionId, sessionCookie());
    return Response.json({ user });
  } catch (error) {
    console.error(error);
    return jsonError("Could not sign in. Try again.", 500);
  }
}
