import fs from "node:fs";
import path from "node:path";
import { createClient, type Client } from "@libsql/client";
import { DEMO_PASSWORD, SEEDED_DOCUMENT_ID, SEEDED_DOCUMENT_TITLE, SEED_USERS } from "@/lib/constants";
import { hashPassword } from "@/lib/passwords";
import { SEEDED_DOCUMENT_HTML } from "@/lib/seed-content";

export type DbClient = Client;

const globalForDb = globalThis as unknown as { folioDbPromise?: Promise<Client> };

function connect(): Client {
  const production = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
  const url = process.env.TURSO_DATABASE_URL || (!production ? process.env.tursodb_TURSO_DATABASE_URL : undefined);
  const authToken = process.env.TURSO_AUTH_TOKEN || (!production ? process.env.tursodb_TURSO_AUTH_TOKEN : undefined);

  if (production && !url) {
    throw new Error("TURSO_DATABASE_URL is missing from server environment variables.");
  }
  if (url) {
    if (production && !/^(libsql|https):\/\//i.test(url)) {
      throw new Error("Production TURSO_DATABASE_URL must use a remote libsql:// or https:// URL.");
    }
    if (!authToken) throw new Error("TURSO_AUTH_TOKEN is missing from server environment variables.");
    return createClient({ url, authToken });
  }

  // Retain convenient local development without requiring a remote database.
  const filename = process.env.DATABASE_PATH || path.join(".", "data", "folio.db");
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  return createClient({ url: `file:${filename.replace(/\\/g, "/")}` });
}

async function migrate(db: Client): Promise<void> {
  // Atomic, idempotent DDL; never attempt file PRAGMAs (WAL, busy_timeout) on Turso.
  await db.batch(
    [
      `CREATE TABLE IF NOT EXISTS users (
         id TEXT PRIMARY KEY,
         name TEXT NOT NULL,
         email TEXT NOT NULL UNIQUE,
         password_hash TEXT NOT NULL
       )`,
      `CREATE TABLE IF NOT EXISTS sessions (
         id TEXT PRIMARY KEY,
         user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
         created_at TEXT NOT NULL,
         expires_at TEXT NOT NULL
       )`,
      `CREATE TABLE IF NOT EXISTS documents (
         id TEXT PRIMARY KEY,
         title TEXT NOT NULL,
         content_html TEXT NOT NULL,
         owner_id TEXT NOT NULL REFERENCES users(id),
         created_at TEXT NOT NULL,
         updated_at TEXT NOT NULL
       )`,
      `CREATE TABLE IF NOT EXISTS shares (
         document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
         user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
         permission TEXT NOT NULL CHECK (permission IN ('view', 'edit')),
         created_at TEXT NOT NULL,
         PRIMARY KEY (document_id, user_id)
       )`,
      `CREATE TABLE IF NOT EXISTS meta (
         key TEXT PRIMARY KEY,
         value TEXT NOT NULL
       )`,
      "CREATE INDEX IF NOT EXISTS idx_documents_owner ON documents(owner_id)",
      "CREATE INDEX IF NOT EXISTS idx_shares_user ON shares(user_id)",
      "CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)",
    ],
    "write",
  );
}

async function seed(db: Client): Promise<void> {
  const tx = await db.transaction("write");
  try {
    const existing = await tx.execute("SELECT value FROM meta WHERE key = 'seed_version'");
    if (existing.rows.length > 0) {
      await tx.commit();
      return;
    }

    const now = new Date().toISOString();
    const statements = [
      ...SEED_USERS.map((user) => ({
        sql: "INSERT OR IGNORE INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)",
        args: [user.id, user.name, user.email, hashPassword(DEMO_PASSWORD)],
      })),
      {
        sql: `INSERT OR IGNORE INTO documents
                (id, title, content_html, owner_id, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [SEEDED_DOCUMENT_ID, SEEDED_DOCUMENT_TITLE, SEEDED_DOCUMENT_HTML, SEED_USERS[0].id, now, now],
      },
      {
        sql: `INSERT OR IGNORE INTO shares (document_id, user_id, permission, created_at)
              VALUES (?, ?, 'edit', ?)`,
        args: [SEEDED_DOCUMENT_ID, SEED_USERS[1].id, now],
      },
      { sql: "INSERT OR IGNORE INTO meta (key, value) VALUES ('seed_version', '1')", args: [] },
    ];

    // Check the marker under the same write lock to serialize cold starts.
    // Existing documents, hashes and permissions are never overwritten by the seed.
    await tx.batch(statements);
    await tx.commit();
  } finally {
    tx.close();
  }
}

async function initializeClient(db: Client): Promise<Client> {
  try {
    await migrate(db);
    await seed(db);
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}

// Useful for asynchronous Vitest integration tests. Never use for Vercel storage.
export async function createLocalDatabase(filename: string): Promise<Client> {
  if (filename !== ":memory:") fs.mkdirSync(path.dirname(filename), { recursive: true });
  return initializeClient(createClient({ url: filename === ":memory:" ? "file::memory:" : `file:${filename.replace(/\\/g, "/")}` }));
}

async function initializeDatabase(): Promise<Client> {
  return initializeClient(connect());
}

export function getDb(): Promise<Client> {
  if (!globalForDb.folioDbPromise) {
    globalForDb.folioDbPromise = initializeDatabase().catch(
      (error) => {
        globalForDb.folioDbPromise = undefined;
        throw error;
      }
    );
  }

  return globalForDb.folioDbPromise;
}
