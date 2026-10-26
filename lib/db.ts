import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { DEMO_PASSWORD, SEEDED_DOCUMENT_ID, SEEDED_DOCUMENT_TITLE, SEED_USERS } from "@/lib/constants";
import { hashPassword } from "@/lib/passwords";
import { SEEDED_DOCUMENT_HTML } from "@/lib/seed-content";

const globalForDb = globalThis as unknown as { folioDb?: DatabaseSync };

export function databasePath(): string {
  return process.env.DATABASE_PATH || path.join(process.cwd(), "data", "folio.db");
}

export function createDatabase(filename: string): DatabaseSync {
  if (filename !== ":memory:") {
    fs.mkdirSync(path.dirname(filename), { recursive: true });
  }

  const db = new DatabaseSync(filename);
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("PRAGMA busy_timeout = 3000");
  if (filename !== ":memory:") db.exec("PRAGMA journal_mode = WAL");
  migrate(db);
  seed(db);
  return db;
}

export function getDb(): DatabaseSync {
  if (!globalForDb.folioDb) {
    globalForDb.folioDb = createDatabase(databasePath());
  }
  return globalForDb.folioDb;
}

function migrate(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content_html TEXT NOT NULL,
      owner_id TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS shares (
      document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      permission TEXT NOT NULL CHECK (permission IN ('view', 'edit')),
      created_at TEXT NOT NULL,
      PRIMARY KEY (document_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_documents_owner ON documents(owner_id);
    CREATE INDEX IF NOT EXISTS idx_shares_user ON shares(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  `);
}

function seed(db: DatabaseSync) {
  const existing = db.prepare("SELECT value FROM meta WHERE key = 'seed_version'").get() as
    | { value: string }
    | undefined;
  if (existing) return;

  const now = new Date().toISOString();
  db.exec("BEGIN");
  try {
    const insertUser = db.prepare(
      "INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)",
    );
    for (const user of SEED_USERS) {
      insertUser.run(user.id, user.name, user.email, hashPassword(DEMO_PASSWORD));
    }

    db.prepare(
      `INSERT INTO documents (id, title, content_html, owner_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(
      SEEDED_DOCUMENT_ID,
      SEEDED_DOCUMENT_TITLE,
      SEEDED_DOCUMENT_HTML,
      SEED_USERS[0].id,
      now,
      now,
    );

    db.prepare(
      `INSERT INTO shares (document_id, user_id, permission, created_at) VALUES (?, ?, 'edit', ?)`,
    ).run(SEEDED_DOCUMENT_ID, SEED_USERS[1].id, now);

    db.prepare("INSERT INTO meta (key, value) VALUES ('seed_version', '1')").run();
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
