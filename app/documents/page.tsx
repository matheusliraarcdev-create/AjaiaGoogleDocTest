import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DocumentHome } from "@/components/DocumentHome";
import { getDb } from "@/lib/db";
import { listDocuments } from "@/lib/documents";
import { currentUser } from "@/lib/http";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Documents" };

export default async function DocumentsPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  const documents = listDocuments(getDb(), user.id);
  return <DocumentHome user={user} documents={documents} />;
}
