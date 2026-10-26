import { mkdtempSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Client } from "@libsql/client";
import { createLocalDatabase, getDb } from "@/lib/db";
import { createSession, deleteSession, getUserBySession } from "@/lib/auth";
import { SEEDED_DOCUMENT_ID, SEED_USERS } from "@/lib/constants";

const cache = globalThis as typeof globalThis & { folioDbPromise?: Promise<Client> };
const clients: Client[] = [];

afterEach(() => {
  clients.forEach((client) => client.close());
  clients.length = 0;
  delete cache.folioDbPromise;
  vi.unstubAllEnvs();
});

function filename() {
  const directory = mkdtempSync(path.join(process.env.FOLIO_TEST_DATABASE_DIR!, "db-"));
  return path.join(directory, "test.db");
}

async function open(file = ":memory:") {
  const db = await createLocalDatabase(file);
  clients.push(db);
  return db;
}

describe("database initialization", () => {
  it("shares one initialization promise and retries after configuration failure", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TURSO_DATABASE_URL", "");
    vi.stubEnv("TURSO_AUTH_TOKEN", "");
    const failed = getDb();
    expect(getDb()).toBe(failed);
    await expect(failed).rejects.toThrow("TURSO_DATABASE_URL is missing");
    expect(cache.folioDbPromise).toBeUndefined();

    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("tursodb_TURSO_DATABASE_URL", "");
    vi.stubEnv("DATABASE_PATH", filename());
    const ready = getDb();
    expect(getDb()).toBe(ready);
    const db = await ready;
    clients.push(db);
    expect(await getDb()).toBe(db);
    expect((await db.execute("SELECT * FROM users")).rows).toHaveLength(3);
  });

  it("rejects local production URLs and missing remote credentials without connecting", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TURSO_DATABASE_URL", "file:production.db");
    await expect(getDb()).rejects.toThrow("must use a remote");
    vi.stubEnv("TURSO_DATABASE_URL", "libsql://example.invalid");
    vi.stubEnv("TURSO_AUTH_TOKEN", "");
    await expect(getDb()).rejects.toThrow("TURSO_AUTH_TOKEN is missing");
  });

  it("preserves edited data, credentials, removed shares and the seed marker on reopen", async () => {
    const file = filename();
    const db = await open(file);
    await db.batch([
      { sql: "UPDATE documents SET title = 'Preserved title' WHERE id = ?", args: [SEEDED_DOCUMENT_ID] },
      { sql: "UPDATE users SET password_hash = 'preserved hash' WHERE id = ?", args: [SEED_USERS[0].id] },
      { sql: "DELETE FROM shares WHERE document_id = ?", args: [SEEDED_DOCUMENT_ID] },
    ], "write");
    const snapshot = await db.batch([
      "SELECT * FROM users ORDER BY id", "SELECT * FROM documents ORDER BY id",
      "SELECT * FROM shares", "SELECT * FROM meta",
    ], "read");
    db.close();
    const reopened = await open(file);
    const actual = await reopened.batch([
      "SELECT * FROM users ORDER BY id", "SELECT * FROM documents ORDER BY id",
      "SELECT * FROM shares", "SELECT * FROM meta",
    ], "read");
    expect(actual.map((result) => result.rows)).toEqual(snapshot.map((result) => result.rows));
  });

  it("enforces foreign keys and cascades document shares", async () => {
    const db = await open();
    await expect(createSession(db, "missing-user")).rejects.toThrow();
    await db.execute({ sql: "DELETE FROM documents WHERE id = ?", args: [SEEDED_DOCUMENT_ID] });
    expect((await db.execute("SELECT * FROM shares")).rows).toHaveLength(0);
  });
});

describe("sessions", () => {
  it("persists sessions, deletes them on logout, and removes expired sessions", async () => {
    const db = await open();
    const id = await createSession(db, SEED_USERS[0].id);
    expect(await getUserBySession(db, id)).toMatchObject({ id: SEED_USERS[0].id });
    await deleteSession(db, id);
    expect(await getUserBySession(db, id)).toBeNull();
    const expired = await createSession(db, SEED_USERS[0].id);
    await db.execute({ sql: "UPDATE sessions SET expires_at = ? WHERE id = ?", args: ["2000-01-01T00:00:00.000Z", expired] });
    expect(await getUserBySession(db, expired)).toBeNull();
    expect((await db.execute("SELECT * FROM sessions")).rows).toHaveLength(0);
  });
});
