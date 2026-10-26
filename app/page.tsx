import { redirect } from "next/navigation";
import { currentUser } from "@/lib/http";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await currentUser();
  redirect(user ? "/documents" : "/login");
}
