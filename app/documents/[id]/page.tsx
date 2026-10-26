import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { EditorShell } from "@/components/EditorShell";
import { listUsers } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getDocument } from "@/lib/documents";
import { currentUser } from "@/lib/http";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const user = await currentUser();
  const { id } = await params;
  if (!user) return { title: "Document" };
  const document = await getDocument(await getDb(), id, user.id);
  return { title: document?.title ?? "Document unavailable" };
}

export default async function DocumentPage({ params }: PageProps) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const document = await getDocument(await getDb(), id, user.id);
  if (!document) notFound();
  const directory = (await listUsers(await getDb())).filter((person) => person.id !== document.ownerId);
  return <EditorShell user={user} initialDocument={document} directory={directory} />;
}
