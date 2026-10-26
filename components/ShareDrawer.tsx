"use client";

import { useEffect, useId, useState } from "react";
import { readError } from "@/lib/read-error";
import type { DocumentRecord, Permission, ShareRecord, User } from "@/lib/types";

type ShareDrawerProps = {
  documentId: string;
  ownerName: string;
  ownerEmail: string;
  canManage: boolean;
  shares: ShareRecord[];
  directory: User[];
  onClose: () => void;
  onUpdated: (document: DocumentRecord) => void;
};

export function ShareDrawer({
  documentId,
  ownerName,
  ownerEmail,
  canManage,
  shares,
  directory,
  onClose,
  onUpdated,
}: ShareDrawerProps) {
  const titleId = useId();
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<Permission>("edit");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const available = directory.filter((person) => !shares.some((share) => share.userId === person.id));

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function saveShare(nextEmail: string, nextPermission: Permission) {
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/documents/${documentId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: nextEmail, permission: nextPermission }),
      });
      const data = (await response.json().catch(() => null)) as { document?: DocumentRecord } | null;
      if (!response.ok || !data?.document) {
        setError(await readError(response));
        return;
      }
      onUpdated(data.document);
      setEmail("");
    } catch {
      setError("Could not reach Folio. Check that the server is running.");
    } finally {
      setPending(false);
    }
  }

  async function remove(userId: string) {
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/documents/${documentId}/share?userId=${encodeURIComponent(userId)}`, {
        method: "DELETE",
      });
      const data = (await response.json().catch(() => null)) as { document?: DocumentRecord } | null;
      if (!response.ok || !data?.document) {
        setError(await readError(response));
        return;
      }
      onUpdated(data.document);
    } catch {
      setError("Could not reach Folio. Check that the server is running.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="drawer-header">
          <div>
            <p className="eyebrow">Access</p>
            <h2 id={titleId}>Share</h2>
          </div>
          <button type="button" className="button button-ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <p className="lede">People who can open this document.</p>
        <div className="person-row">
          <div>
            <span className="person-name">{ownerName}</span>
            <span className="person-email">{ownerEmail}</span>
          </div>
          <span className="badge badge-owner">Owner</span>
        </div>
        {shares.map((share) => (
          <div className="person-row" key={share.userId}>
            <div>
              <span className="person-name">{share.name}</span>
              <span className="person-email">{share.email}</span>
            </div>
            {canManage ? (
              <div className="person-actions">
                <select
                  aria-label={`Access for ${share.name}`}
                  value={share.permission}
                  disabled={pending}
                  onChange={(event) => void saveShare(share.email, event.target.value as Permission)}
                >
                  <option value="edit">Can edit</option>
                  <option value="view">Can view</option>
                </select>
                <button type="button" className="button button-ghost" disabled={pending} onClick={() => void remove(share.userId)}>
                  Remove
                </button>
              </div>
            ) : (
              <span className={`badge badge-${share.permission}`}>{share.permission === "edit" ? "Can edit" : "Can view"}</span>
            )}
          </div>
        ))}
        {shares.length === 0 ? <p className="empty">No one else has access yet.</p> : null}

        {canManage ? (
          <form
            className="share-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (email) void saveShare(email, permission);
            }}
          >
            <h3>Give access</h3>
            {available.length === 0 ? (
              <p className="helper">Everyone already has access.</p>
            ) : (
              <>
                <label className="field" htmlFor="share-email">
                  Teammate
                  <select id="share-email" value={email} onChange={(event) => setEmail(event.target.value)} required>
                    <option value="">Choose a person</option>
                    {available.map((person) => (
                      <option key={person.id} value={person.email}>
                        {person.name} ({person.email})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field" htmlFor="share-permission">
                  Access
                  <select
                    id="share-permission"
                    value={permission}
                    onChange={(event) => setPermission(event.target.value as Permission)}
                  >
                    <option value="edit">Can edit</option>
                    <option value="view">Can view</option>
                  </select>
                </label>
                <button type="submit" className="button button-primary" disabled={pending || !email}>
                  {pending ? "Saving" : "Give access"}
                </button>
              </>
            )}
          </form>
        ) : (
          <p className="helper">You can see who has access. Only {ownerName} can change it.</p>
        )}
        {error ? (
          <p className="error-text" role="alert">
            {error}
          </p>
        ) : null}
      </aside>
    </div>
  );
}
