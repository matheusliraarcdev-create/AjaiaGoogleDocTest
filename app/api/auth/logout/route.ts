import { clearSessionCookie } from "@/lib/http";

export const runtime = "nodejs";

export async function POST() {
  try {
    await clearSessionCookie();
    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Could not sign out. Try again." }, { status: 500 });
  }
}
