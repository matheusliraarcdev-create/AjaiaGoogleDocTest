import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { SESSION_MAX_AGE_SECONDS } from "@/lib/constants";
import { verifyPassword } from "@/lib/passwords";
import type { User } from "@/lib/types";
import { normalizeEmail } from "@/lib/validators";

type UserRow = {
  id: string;
  name: string;
  email: string;
  password_hash?: string;
};

export function authenticate(db: DatabaseSync, email: string, password: string): User | null {
  const normalized = normalizeEmail(email);
  if (!normalized || !password) return null;
  const row = db.prepare("SELECT id, name, email, password_hash FROM users WHERE email = ?").get(normalized) as
    | (UserRow & { password_hash: string })
    | undefined;
  if (!row || !verifyPassword(password, row.password_hash)) return null;
  return { id: row.id, name: row.name, email: row.email };
}

export function createSession(db: DatabaseSync, userId: string): string {
  const id = randomUUID();
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + SESSION_MAX_AGE_SECONDS * 1000);
  db.prepare("INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)").run(
    id,
    userId,
    createdAt.toISOString(),
    expiresAt.toISOString(),
  );
  return id;
}

export function deleteSession(db: DatabaseSync, sessionId: string) {
  db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
}

export function getUserBySession(db: DatabaseSync, sessionId: string): User | null {
  const row = db
    .prepare(
      `SELECT u.id, u.name, u.email, s.expires_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = ?`,
    )
    .get(sessionId) as (UserRow & { expires_at: string }) | undefined;
  if (!row) return null;
  if (Date.parse(row.expires_at) <= Date.now()) {
    deleteSession(db, sessionId);
    return null;
  }
  return { id: row.id, name: row.name, email: row.email };
}

export function listUsers(db: DatabaseSync): User[] {
  const rows = db.prepare("SELECT id, name, email FROM users ORDER BY name").all() as unknown as User[];
  return rows.map((row) => ({ id: row.id, name: row.name, email: row.email }));
}
