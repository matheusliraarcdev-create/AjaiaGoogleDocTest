import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { deleteSession, getUserBySession } from "@/lib/auth";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/constants";
import { getDb } from "@/lib/db";
import type { User } from "@/lib/types";

export function jsonError(error: string, status: number) {
  return Response.json({ error }, { status });
}

export function sessionCookie(maxAge = SESSION_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    maxAge,
  };
}

export async function currentUser(): Promise<User | null> {
  const jar = await cookies();
  const sessionId = jar.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;
  return await getUserBySession(await getDb(), sessionId);
}

export async function clearSessionCookie() {
  const jar = await cookies();
  const sessionId = jar.get(SESSION_COOKIE)?.value;
  if (sessionId) await deleteSession(await getDb(), sessionId);
  jar.set(SESSION_COOKIE, "", sessionCookie(0));
}

export function revalidateDocumentList() {
  revalidatePath("/documents");
}

export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return null;
    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}
