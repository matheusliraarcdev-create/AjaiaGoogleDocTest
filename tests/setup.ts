import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

export default function setup() {
  const directory = mkdtempSync(path.join(os.tmpdir(), "folio-tests-"));
  process.env.FOLIO_TEST_DATABASE_DIR = directory;
  // Native SQLite handles on Windows may remain locked until workers exit.
  // Vitest runs this teardown after all workers have stopped.
  return () => {
    delete process.env.FOLIO_TEST_DATABASE_DIR;
    rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  };
}
