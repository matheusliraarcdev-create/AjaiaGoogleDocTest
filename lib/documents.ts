import { randomUUID } from "node:crypto";
import type { DbClient } from "@/lib/db";
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

async function readShares(db: DbClient, documentId: string): Promise<ShareRecord[]> {
  const rows = (await db.execute({
    sql: `SELECT s.user_id, s.permission, u.name, u.email
       FROM shares s
       JOIN users u ON u.id = s.user_id
       WHERE s.document_id = ?
       ORDER BY u.name`,
    args: [documentId],
  })).rows as unknown as ShareRow[];

  return rows
    .filter((row) => isPermission(row.permission))
    .map((row) => ({
      userId: row.user_id,
      name: row.name,
      email: row.email,
      permission: row.permission as Permission,
    }));
}

async function toRecord(db: DbClient, row: DocumentRow): Promise<DocumentRecord | null> {
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
    shares: await readShares(db, row.id),
  };
}

export async function listDocuments(db: DbClient, userId: string): Promise<DocumentSummary[]> {
  const rows = (await db.execute({
    sql: `SELECT d.id, d.title, d.owner_id, d.updated_at, u.name AS owner_name,
              CASE WHEN d.owner_id = ? THEN 'owner' ELSE s.permission END AS access
       FROM documents d
       JOIN users u ON u.id = d.owner_id
       LEFT JOIN shares s ON s.document_id = d.id AND s.user_id = ?
       WHERE d.owner_id = ? OR s.user_id IS NOT NULL
       ORDER BY d.updated_at DESC`,
    args: [userId, userId, userId],
  })).rows as unknown as SummaryRow[];

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

export async function getDocument(db: DbClient, documentId: string, userId: string): Promise<DocumentRecord | null> {
  if (!isDocumentId(documentId)) return null;
  const row = (await db.execute({
    sql: `SELECT d.id, d.title, d.content_html, d.owner_id, d.created_at, d.updated_at,
              u.name AS owner_name, u.email AS owner_email,
              CASE
                WHEN d.owner_id = ? THEN 'owner'
                ELSE (SELECT permission FROM shares WHERE document_id = d.id AND user_id = ?)
              END AS access
       FROM documents d
       JOIN users u ON u.id = d.owner_id
       WHERE d.id = ?`,
    args: [userId, userId, documentId],
  })).rows[0] as unknown as DocumentRow | undefined;

  if (!row || !row.access) return null;
  return toRecord(db, row);
}

export async function createDocument(
  db: DbClient,
  ownerId: string,
  title: string,
  contentHtml: string,
): Promise<ActionResult<DocumentRecord>> {
  const normalizedTitle = normalizeTitle(title);
  if (!normalizedTitle.ok) return { ok: false, status: 400, error: normalizedTitle.error };
  const normalizedContent = normalizeContent(contentHtml);
  if (!normalizedContent.ok) return { ok: false, status: 400, error: normalizedContent.error };

  const id = randomUUID();
  const now = new Date().toISOString();
  await db.execute({
    sql: `INSERT INTO documents (id, title, content_html, owner_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    args: [id, normalizedTitle.title, normalizedContent.html, ownerId, now, now],
  });

  const document = await getDocument(db, id, ownerId);
  if (!document) return { ok: false, status: 500, error: "The document was created but could not be opened." };
  return { ok: true, value: document };
}

export async function updateDocument(
  db: DbClient,
  documentId: string,
  userId: string,
  patch: { title?: string; contentHtml?: string },
): Promise<ActionResult<DocumentRecord>> {
  const current = await getDocument(db, documentId, userId);
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
    await db.execute({
      sql: "UPDATE documents SET title = ?, content_html = ?, updated_at = ? WHERE id = ?",
      args: [title, contentHtml, updatedAt, documentId],
    });
  } else if (patch.title !== undefined) {
    await db.execute({
      sql: "UPDATE documents SET title = ?, updated_at = ? WHERE id = ?",
      args: [title, updatedAt, documentId],
    });
  } else {
    await db.execute({
      sql: "UPDATE documents SET content_html = ?, updated_at = ? WHERE id = ?",
      args: [contentHtml, updatedAt, documentId],
    });
  }

  const document = await getDocument(db, documentId, userId);
  if (!document) return { ok: false, status: 500, error: "The document was saved but could not be reloaded." };
  return { ok: true, value: document };
}

export async function deleteDocument(db: DbClient, documentId: string, userId: string): Promise<ActionResult<{ id: string }>> {
  const current = await getDocument(db, documentId, userId);
  if (!current) return { ok: false, status: 404, error: "Document not found." };
  if (current.access !== "owner") {
    return { ok: false, status: 403, error: "Only the owner can delete this document." };
  }
  await db.execute({
    sql: "DELETE FROM documents WHERE id = ?",
    args: [documentId],
  });
  return { ok: true, value: { id: documentId } };
}

export async function setShare(
  db: DbClient,
  documentId: string,
  actorId: string,
  email: string,
  permission: string,
): Promise<ActionResult<DocumentRecord>> {
  const current = await getDocument(db, documentId, actorId);
  if (!current) return { ok: false, status: 404, error: "Document not found." };
  if (current.access !== "owner") {
    return { ok: false, status: 403, error: "Only the owner can change sharing." };
  }
  if (!isPermission(permission)) return { ok: false, status: 400, error: "Choose view or edit access." };

  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return { ok: false, status: 400, error: "Enter a teammate's email." };
  const user = (await db.execute({
    sql: "SELECT id FROM users WHERE email = ?",
    args: [normalizedEmail],
  })).rows[0] as unknown as { id: string } | undefined;
  if (!user) {
    return { ok: false, status: 400, error: "No Folio account uses that email. Choose one of the seeded teammates." };
  }
  if (user.id === current.ownerId) return { ok: false, status: 400, error: "The owner already has access." };

  await db.execute({
    sql: `INSERT INTO shares (document_id, user_id, permission, created_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(document_id, user_id) DO UPDATE SET permission = excluded.permission`,
    args: [documentId, user.id, permission, new Date().toISOString()],
  });

  const document = await getDocument(db, documentId, actorId);
  if (!document) return { ok: false, status: 500, error: "Sharing was saved but could not be reloaded." };
  return { ok: true, value: document };
}

export async function removeShare(
  db: DbClient,
  documentId: string,
  actorId: string,
  targetUserId: string,
): Promise<ActionResult<DocumentRecord>> {
  const current = await getDocument(db, documentId, actorId);
  if (!current) return { ok: false, status: 404, error: "Document not found." };
  if (current.access !== "owner") {
    return { ok: false, status: 403, error: "Only the owner can change sharing." };
  }
  const share = (await db.execute({
    sql: "SELECT user_id FROM shares WHERE document_id = ? AND user_id = ?",
    args: [documentId, targetUserId],
  })).rows[0] as unknown as { user_id: string } | undefined;
  if (!share) return { ok: false, status: 404, error: "That person does not have access." };

  await db.execute({
    sql: "DELETE FROM shares WHERE document_id = ? AND user_id = ?",
    args: [documentId, targetUserId],
  });
  const document = await getDocument(db, documentId, actorId);
  if (!document) return { ok: false, status: 500, error: "Access was removed but the document could not be reloaded." };
  return { ok: true, value: document };
}
