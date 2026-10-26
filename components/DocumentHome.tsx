"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AccessBadge } from "@/components/AccessBadge";
import { AppHeader } from "@/components/AppHeader";
import { LocalTime } from "@/components/LocalTime";
import { readError } from "@/lib/read-error";
import type { DocumentSummary, User } from "@/lib/types";

export function DocumentHome({ user, documents }: { user: User; documents: DocumentSummary[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState<"create" | "import" | null>(null);
  const owned = documents.filter((doc) => doc.access === "owner");
  const shared = documents.filter((doc) => doc.access !== "owner");

  async function createDocument() {
    setPending("create");
    setError("");
    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled document" }),
      });
      const data = (await response.json().catch(() => null)) as { document?: { id: string }; error?: string } | null;
      if (!response.ok || !data?.document) {
        setError(data?.error || "Could not create the document.");
        return;
      }
      router.push(`/documents/${data.document.id}`);
      router.refresh();
    } catch {
      setError("Could not reach Folio. Check that the server is running.");
    } finally {
      setPending(null);
    }
  }

  async function importDocument(file: File) {
    const extension = file.name.toLowerCase().split(".").pop();
    if (!extension || !["txt", "md", "docx"].includes(extension)) {
      setError("Import a .txt, .md, or .docx file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Files must be 2 MB or smaller.");
      return;
    }

    setPending("import");
    setError("");
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch("/api/import", { method: "POST", body });
      const data = (await response.json().catch(() => null)) as { document?: { id: string } } | null;
      if (!response.ok || !data?.document) {
        setError(await readError(response));
        return;
      }
      router.push(`/documents/${data.document.id}`);
      router.refresh();
    } catch {
      setError("Could not reach Folio. Check that the server is running.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="app-frame">
      <AppHeader user={user} />
      <main className="page">
        <div className="page-header">
          <div>
            <p className="eyebrow">Documents</p>
            <h1>Drafts for {user.name.split(" ")[0]}</h1>
            <p className="lede">Create a document, import a file, or open something a teammate shared.</p>
          </div>
          <div className="home-actions">
            <button type="button" className="button button-primary" onClick={createDocument} disabled={pending !== null}>
              {pending === "create" ? "Creating" : "New document"}
            </button>
            <label className={`button button-secondary ${pending ? "is-disabled" : ""}`}>
              {pending === "import" ? "Importing" : "Import file"}
              <input
                type="file"
                accept=".txt,.md,.docx,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                hidden
                disabled={pending !== null}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void importDocument(file);
                }}
              />
            </label>
          </div>
        </div>
        <p className="file-note">Supported import files: .txt, .md, and .docx, up to 2 MB. The file becomes a new editable document.</p>
        {error ? (
          <p className="error-text" role="alert">
            {error}
          </p>
        ) : null}

        <DocumentSection title="Your documents" count={owned.length} empty="You have not created a document yet." documents={owned} />
        <DocumentSection
          title="Shared with you"
          count={shared.length}
          empty="Nothing has been shared with you yet."
          documents={shared}
        />
      </main>
    </div>
  );
}

function DocumentSection({
  title,
  count,
  empty,
  documents,
}: {
  title: string;
  count: number;
  empty: string;
  documents: DocumentSummary[];
}) {
  return (
    <section className="section-block">
      <div className="section-title">
        <h2>{title}</h2>
        <span>{count}</span>
      </div>
      {documents.length === 0 ? (
        <p className="empty">{empty}</p>
      ) : (
        <div className="doc-list">
          {documents.map((doc) => (
            <Link key={doc.id} href={`/documents/${doc.id}`} className={`doc-row access-${doc.access}`}>
              <span className="doc-title">{doc.title}</span>
              <span className="doc-meta">
                {doc.access === "owner" ? "You own this" : `From ${doc.ownerName}`}
                <span aria-hidden="true"> · </span>
                Updated <LocalTime iso={doc.updatedAt} />
              </span>
              <AccessBadge access={doc.access} />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
