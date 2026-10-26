"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { AccessBadge } from "@/components/AccessBadge";
import { AppHeader } from "@/components/AppHeader";
import { LocalTime } from "@/components/LocalTime";
import { ShareDrawer } from "@/components/ShareDrawer";
import { readError } from "@/lib/read-error";
import type { DocumentRecord, User } from "@/lib/types";
import { useRouter } from "next/navigation";

const RichTextEditor = dynamic(() => import("@/components/RichTextEditor"), {
  ssr: false,
  loading: () => <div className="paper paper-loading">Opening the editor…</div>,
});

export function EditorShell({
  user,
  initialDocument,
  directory,
}: {
  user: User;
  initialDocument: DocumentRecord;
  directory: User[];
}) {
  const router = useRouter();
  const canEdit = initialDocument.access !== "view";
  const isOwner = initialDocument.access === "owner";
  const [title, setTitle] = useState(initialDocument.title);
  const [shares, setShares] = useState(initialDocument.shares);
  const [updatedAt, setUpdatedAt] = useState(initialDocument.updatedAt);
  const [status, setStatus] = useState<"saved" | "unsaved" | "saving" | "error">("saved");
  const [error, setError] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const savedHtml = useRef(initialDocument.contentHtml);
  const savedTitle = useRef(initialDocument.title);
  const latestTitle = useRef(initialDocument.title);
  const pendingHtml = useRef<string | null>(null);
  const requestId = useRef(0);
  const timer = useRef<number | null>(null);
  const titleTimer = useRef<number | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const saveContent = useCallback(
    async (html: string) => {
      const id = ++requestId.current;
      setStatus("saving");
      setError("");
      try {
        const response = await fetch(`/api/documents/${initialDocument.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentHtml: html }),
        });
        if (id !== requestId.current) return;
        if (!response.ok) {
          setStatus("error");
          setError(await readError(response));
          return;
        }
        const data = (await response.json()) as { document: DocumentRecord };
        savedHtml.current = html;
        setUpdatedAt(data.document.updatedAt);
        if (pendingHtml.current && pendingHtml.current !== html) {
          setStatus("unsaved");
          return;
        }
        setStatus("saved");
      } catch {
        if (id !== requestId.current) return;
        setStatus("error");
        setError("Could not reach Folio. Your latest edit is still in this tab.");
      }
    },
    [initialDocument.id],
  );

  function queueSave(html: string) {
    if (!canEdit || html === savedHtml.current) return;
    pendingHtml.current = html;
    setStatus("unsaved");
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const next = pendingHtml.current;
      if (next && next !== savedHtml.current) void saveContent(next);
    }, 700);
  }

  useEffect(() => {
    if (initialDocument.title === "Untitled document") titleRef.current?.select();
  }, [initialDocument.title]);

  useEffect(() => {
    const page = window.document;
    function flush() {
      const html = pendingHtml.current;
      if (!canEdit || !html || html === savedHtml.current) return;
      if (timer.current) window.clearTimeout(timer.current);
      void fetch(`/api/documents/${initialDocument.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentHtml: html }),
        keepalive: true,
      });
    }
    function onHide() {
      if (page.visibilityState === "hidden") flush();
    }
    page.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);
    return () => {
      page.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [canEdit, initialDocument.id]);

  async function persistTitle(raw: string) {
    const next = raw.trim().replace(/\s+/g, " ");
    if (!next) {
      latestTitle.current = savedTitle.current;
      setTitle(savedTitle.current);
      setError("Give the document a title.");
      return;
    }
    if (next === savedTitle.current) {
      setTitle(next);
      return;
    }
    setStatus("saving");
    setError("");
    try {
      const response = await fetch(`/api/documents/${initialDocument.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: next }),
      });
      if (!response.ok) {
        setStatus("error");
        setError(await readError(response));
        return;
      }
      const data = (await response.json()) as { document: DocumentRecord };
      savedTitle.current = data.document.title;
      latestTitle.current = data.document.title;
      setTitle(data.document.title);
      setUpdatedAt(data.document.updatedAt);
      setStatus(pendingHtml.current && pendingHtml.current !== savedHtml.current ? "unsaved" : "saved");
    } catch {
      setStatus("error");
      setError("Could not rename the document.");
    }
  }

  function onTitleChange(value: string) {
    latestTitle.current = value;
    setTitle(value);
    if (titleTimer.current) window.clearTimeout(titleTimer.current);
    titleTimer.current = window.setTimeout(() => void persistTitle(latestTitle.current), 400);
  }

  async function deleteDocument() {
    if (!window.confirm("Delete this document for everyone who has access?")) return;
    setDeleting(true);
    setError("");
    try {
      const response = await fetch(`/api/documents/${initialDocument.id}`, { method: "DELETE" });
      if (!response.ok) {
        setError(await readError(response));
        setDeleting(false);
        return;
      }
      router.push("/documents");
      router.refresh();
    } catch {
      setError("Could not delete the document.");
      setDeleting(false);
    }
  }

  const statusLabel =
    status === "saving" ? "Saving…" : status === "unsaved" ? "Unsaved changes" : status === "error" ? "Not saved" : "Saved";

  return (
    <div className="app-frame">
      <AppHeader user={user}>
        {canEdit ? (
          <input
            ref={titleRef}
            className="title-input"
            aria-label="Document title"
            value={title}
            maxLength={140}
            onChange={(event) => onTitleChange(event.target.value)}
            onBlur={() => {
              if (titleTimer.current) window.clearTimeout(titleTimer.current);
              void persistTitle(latestTitle.current);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
          />
        ) : (
          <p className="title-read">{initialDocument.title}</p>
        )}
      </AppHeader>
      <main className="editor-layout">
        <div className="access-line">
          <AccessBadge access={initialDocument.access} />
          <span>{isOwner ? "Owned by you" : `From ${initialDocument.ownerName}`}</span>
          <span aria-hidden="true">·</span>
          <span>
            Updated <LocalTime iso={updatedAt} />
          </span>
          <span className="save-state" aria-live="polite">
            {canEdit ? statusLabel : "Read only"}
          </span>
          <button type="button" className="button button-secondary" onClick={() => setShareOpen(true)}>
            Share
          </button>
          {isOwner ? (
            <button type="button" className="button button-danger" onClick={() => void deleteDocument()} disabled={deleting}>
              {deleting ? "Deleting" : "Delete"}
            </button>
          ) : null}
          {status === "error" ? (
            <button
              type="button"
              className="button button-ghost"
              onClick={() => {
                const html = pendingHtml.current;
                if (html) void saveContent(html);
              }}
            >
              Retry
            </button>
          ) : null}
        </div>
        {error ? (
          <p className="error-text" role="alert">
            {error}
          </p>
        ) : null}
        {canEdit ? null : (
          <p className="banner">You can view this document. Ask {initialDocument.ownerName} for edit access to change it.</p>
        )}
        <RichTextEditor
          initialHtml={initialDocument.contentHtml}
          editable={canEdit}
          autofocus={canEdit && initialDocument.title !== "Untitled document"}
          onChange={queueSave}
        />
        <p className="helper editor-note">
          {canEdit
            ? "Formatting is saved with the document and restored when you reopen it."
            : "This copy is read-only."}
        </p>
      </main>
      {shareOpen ? (
        <ShareDrawer
          documentId={initialDocument.id}
          ownerName={initialDocument.ownerName}
          ownerEmail={initialDocument.ownerEmail}
          canManage={isOwner}
          shares={shares}
          directory={directory}
          onClose={() => setShareOpen(false)}
          onUpdated={(next) => {
            setShares(next.shares);
            setUpdatedAt(next.updatedAt);
          }}
        />
      ) : null}
    </div>
  );
}
