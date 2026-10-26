import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import type { Access, ActionResult, DocumentRecord, DocumentSummary, Permission, ShareRecord } from "@/lib/types";
import { isDocumentId, isPermission, normalizeContent, normalizeEmail, normalizeTitle } from "@/lib/validators";

type SummaryRow = {
  id: string;
  title: string;
  owner_id: string;
  owner_name: string;
  updated_at: string;
  access: string;
};

type DocumentRow = SummaryRow & {
  content_html: string;
  owner_email: string;
  created_at: string;
};

type ShareRow = {
  user_id: string;
  name: string;
  email: string;
  permission: string;
};

function asAccess(value: string): Access | null {
  if (value === "owner" || value === "view" || value === "edit") return value;
  return null;
}

function readShares(db: DatabaseSync, documentId: string): ShareRecord[] {
  const rows = db
    .prepare(
      `SELECT s.user_id, s.permission, u.name, u.email
       FROM shares s
       JOIN users u ON u.id = s.user_id
       WHERE s.document_id = ?
       ORDER BY u.name`,
    )
    .all(documentId) as unknown as ShareRow[];

  return rows
    .filter((row) => isPermission(row.permission))
    .map((row) => ({
      userId: row.user_id,
      name: row.name,
      email: row.email,
      permission: row.permission as Permission,
    }));
}

function toRecord(db: DatabaseSync, row: DocumentRow): DocumentRecord | null {
  const access = asAccess(row.access);
  if (!access) return null;
  return {
    id: row.id,
    title: row.title,
    contentHtml: row.content_html,
    ownerId: row.owner_id,
    ownerName: row.owner_name,
    ownerEmail: row.owner_email,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    access,
    shares: readShares(db, row.id),
  };
}

export function listDocuments(db: DatabaseSync, userId: string): DocumentSummary[] {
  const rows = db
    .prepare(
      `SELECT d.id, d.title, d.owner_id, d.updated_at, u.name AS owner_name,
              CASE WHEN d.owner_id = ? THEN 'owner' ELSE s.permission END AS access
       FROM documents d
       JOIN users u ON u.id = d.owner_id
       LEFT JOIN shares s ON s.document_id = d.id AND s.user_id = ?
       WHERE d.owner_id = ? OR s.user_id IS NOT NULL
       ORDER BY d.updated_at DESC`,
    )
    .all(userId, userId, userId) as unknown as SummaryRow[];

  return rows.flatMap((row) => {
    const access = asAccess(row.access);
    if (!access) return [];
    return [
      {
        id: row.id,
        title: row.title,
        ownerId: row.owner_id,
        ownerName: row.owner_name,
        updatedAt: row.updated_at,
        access,
      },
    ];
  });
}

export function getDocument(db: DatabaseSync, documentId: string, userId: string): DocumentRecord | null {
  if (!isDocumentId(documentId)) return null;
  const row = db
    .prepare(
      `SELECT d.id, d.title, d.content_html, d.owner_id, d.created_at, d.updated_at,
              u.name AS owner_name, u.email AS owner_email,
              CASE
                WHEN d.owner_id = ? THEN 'owner'
                ELSE (SELECT permission FROM shares WHERE document_id = d.id AND user_id = ?)
              END AS access
       FROM documents d
       JOIN users u ON u.id = d.owner_id
       WHERE d.id = ?`,
    )
    .get(userId, userId, documentId) as DocumentRow | undefined;

  if (!row || !row.access) return null;
  return toRecord(db, row);
}

export function createDocument(
  db: DatabaseSync,
  ownerId: string,
  title: string,
  contentHtml: string,
): ActionResult<DocumentRecord> {
  const normalizedTitle = normalizeTitle(title);
  if (!normalizedTitle.ok) return { ok: false, status: 400, error: normalizedTitle.error };
  const normalizedContent = normalizeContent(contentHtml);
  if (!normalizedContent.ok) return { ok: false, status: 400, error: normalizedContent.error };

  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO documents (id, title, content_html, owner_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, normalizedTitle.title, normalizedContent.html, ownerId, now, now);

  const document = getDocument(db, id, ownerId);
  if (!document) return { ok: false, status: 500, error: "The document was created but could not be opened." };
  return { ok: true, value: document };
}

export function updateDocument(
  db: DatabaseSync,
  documentId: string,
  userId: string,
  patch: { title?: string; contentHtml?: string },
): ActionResult<DocumentRecord> {
  const current = getDocument(db, documentId, userId);
  if (!current) return { ok: false, status: 404, error: "Document not found." };
  if (current.access === "view") {
    return { ok: false, status: 403, error: "You have view access, so this document is read-only." };
  }

  let title = current.title;
  let contentHtml = current.contentHtml;
  if (patch.title !== undefined) {
    const normalized = normalizeTitle(patch.title);
    if (!normalized.ok) return { ok: false, status: 400, error: normalized.error };
    title = normalized.title;
  }
  if (patch.contentHtml !== undefined) {
    const normalized = normalizeContent(patch.contentHtml);
    if (!normalized.ok) return { ok: false, status: 400, error: normalized.error };
    contentHtml = normalized.html;
  }

  const updatedAt = new Date().toISOString();
  if (patch.title !== undefined && patch.contentHtml !== undefined) {
    db.prepare("UPDATE documents SET title = ?, content_html = ?, updated_at = ? WHERE id = ?").run(
      title,
      contentHtml,
      updatedAt,
      documentId,
    );
  } else if (patch.title !== undefined) {
    db.prepare("UPDATE documents SET title = ?, updated_at = ? WHERE id = ?").run(title, updatedAt, documentId);
  } else {
    db.prepare("UPDATE documents SET content_html = ?, updated_at = ? WHERE id = ?").run(
      contentHtml,
      updatedAt,
      documentId,
    );
  }

  const document = getDocument(db, documentId, userId);
  if (!document) return { ok: false, status: 500, error: "The document was saved but could not be reloaded." };
  return { ok: true, value: document };
}

export function deleteDocument(db: DatabaseSync, documentId: string, userId: string): ActionResult<{ id: string }> {
  const current = getDocument(db, documentId, userId);
  if (!current) return { ok: false, status: 404, error: "Document not found." };
  if (current.access !== "owner") {
    return { ok: false, status: 403, error: "Only the owner can delete this document." };
  }
  db.prepare("DELETE FROM documents WHERE id = ?").run(documentId);
  return { ok: true, value: { id: documentId } };
}

export function setShare(
  db: DatabaseSync,
  documentId: string,
  actorId: string,
  email: string,
  permission: string,
): ActionResult<DocumentRecord> {
  const current = getDocument(db, documentId, actorId);
  if (!current) return { ok: false, status: 404, error: "Document not found." };
  if (current.access !== "owner") {
    return { ok: false, status: 403, error: "Only the owner can change sharing." };
  }
  if (!isPermission(permission)) return { ok: false, status: 400, error: "Choose view or edit access." };

  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return { ok: false, status: 400, error: "Enter a teammate's email." };
  const user = db.prepare("SELECT id FROM users WHERE email = ?").get(normalizedEmail) as { id: string } | undefined;
  if (!user) {
    return { ok: false, status: 400, error: "No Folio account uses that email. Choose one of the seeded teammates." };
  }
  if (user.id === current.ownerId) return { ok: false, status: 400, error: "The owner already has access." };

  db.prepare(
    `INSERT INTO shares (document_id, user_id, permission, created_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(document_id, user_id) DO UPDATE SET permission = excluded.permission`,
  ).run(documentId, user.id, permission, new Date().toISOString());

  const document = getDocument(db, documentId, actorId);
  if (!document) return { ok: false, status: 500, error: "Sharing was saved but could not be reloaded." };
  return { ok: true, value: document };
}

export function removeShare(
  db: DatabaseSync,
  documentId: string,
  actorId: string,
  targetUserId: string,
): ActionResult<DocumentRecord> {
  const current = getDocument(db, documentId, actorId);
  if (!current) return { ok: false, status: 404, error: "Document not found." };
  if (current.access !== "owner") {
    return { ok: false, status: 403, error: "Only the owner can change sharing." };
  }
  const share = db
    .prepare("SELECT user_id FROM shares WHERE document_id = ? AND user_id = ?")
    .get(documentId, targetUserId) as { user_id: string } | undefined;
  if (!share) return { ok: false, status: 404, error: "That person does not have access." };

  db.prepare("DELETE FROM shares WHERE document_id = ? AND user_id = ?").run(documentId, targetUserId);
  const document = getDocument(db, documentId, actorId);
  if (!document) return { ok: false, status: 500, error: "Access was removed but the document could not be reloaded." };
  return { ok: true, value: document };
}
