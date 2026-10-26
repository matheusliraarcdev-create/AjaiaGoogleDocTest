import { randomUUID } from "node:crypto";
import type { DbClient } from "@/lib/db";
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

export async function authenticate(db: DbClient, email: string, password: string): Promise<User | null> {
  const normalized = normalizeEmail(email);
  if (!normalized || !password) return null;

  const result = await db.execute({
    sql: "SELECT id, name, email, password_hash FROM users WHERE email = ?",
    args: [normalized],
  });

  const row = result.rows[0] as unknown as
    | (UserRow & { password_hash: string })
    | undefined;
  if (!row || !verifyPassword(password, row.password_hash)) return null;
  return { id: row.id, name: row.name, email: row.email };
}

export async function createSession(db: DbClient, userId: string): Promise<string> {
  const id = randomUUID();
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + SESSION_MAX_AGE_SECONDS * 1000);
  await db.execute({
    sql: "INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
    args: [id, userId, createdAt.toISOString(), expiresAt.toISOString()],
  });
  return id;
}

export async function deleteSession(db: DbClient, sessionId: string) {
  await db.execute({
    sql: "DELETE FROM sessions WHERE id = ?",
    args: [sessionId],
  });
}

export async function getUserBySession(db: DbClient, sessionId: string): Promise<User | null> {
  const row = (await db.execute({
    sql: `SELECT u.id, u.name, u.email, s.expires_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = ?`,
    args: [sessionId],
  })).rows[0] as unknown as (UserRow & { expires_at: string }) | undefined;
  if (!row) return null;
  if (Date.parse(row.expires_at) <= Date.now()) {
    await deleteSession(db, sessionId);
    return null;
  }
  return { id: row.id, name: row.name, email: row.email };
}

export async function listUsers(db: DbClient): Promise<User[]> {
  const rows = (await db.execute({
    sql: "SELECT id, name, email FROM users ORDER BY name",
    args: [],
  })).rows as unknown as User[];
  return rows.map((row) => ({ id: row.id, name: row.name, email: row.email }));
}
