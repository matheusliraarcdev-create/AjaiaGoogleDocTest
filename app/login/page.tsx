import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { currentUser } from "@/lib/http";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  const user = await currentUser();
  if (user) redirect("/documents");

  return (
    <main className="login-screen">
      <section className="login-copy">
        <p className="eyebrow">Internal drafts</p>
        <h1>Folio</h1>
        <p className="lede">A shared place to draft, format, and hand a document to a teammate.</p>
        <ul className="feature-list">
          <li>Write with headings, lists, and emphasis.</li>
          <li>Import a .txt, .md, or .docx file as a new document.</li>
          <li>Share it with view or edit access.</li>
        </ul>
      </section>
      <section className="login-panel">
        <p className="eyebrow">Sign in</p>
        <h2>Choose a teammate</h2>
        <p className="lede">These three accounts are seeded so you can try owning and receiving a document.</p>
        <LoginForm />
      </section>
    </main>
  );
}
