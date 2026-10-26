# Folio

A small shared document editor for internal drafts. Create a document, format it, import a `.txt`, `.md`, or `.docx` file, and share it with view or edit access.

## Run it locally

Requirements: Node.js 22.13 or newer (tested on Node.js 24) and npm. Database access uses `@libsql/client` asynchronously.

```bash
npm install
npm test
npm run dev
```

Open http://localhost:3000.

Without Turso configuration, development creates or reuses `data/folio.db`. The first initialization seeds three teammates plus one shared document. Existing data and the `seed_version` marker are preserved.

## Reviewer accounts

Every account uses the password `folio-demo`. The sign-in screen also has a one-click button for each person.

| Name | Email | What you should see |
| --- | --- | --- |
| Ada Okonkwo | ada@ajaia.test | Owns "Product kickoff notes" |
| Lin Zhao | lin@ajaia.test | Can edit that same document, under Shared with you |
| Noah Patel | noah@ajaia.test | No shared documents until someone grants access |

## Try the product

1. Sign in as Ada and open **Product kickoff notes**. The headings, lists, and emphasis are stored HTML and come back after a refresh.
2. Choose **Share**, give Noah view access, and sign out.
3. Sign in as Noah. The document is under **Shared with you**, marked **Can view**, and the editor is read-only.
4. Sign in as Lin. The same document is editable, and Lin cannot change who has access.
5. Import `samples/weekly-update.md` or `samples/word-notes.docx`. Supported files are `.txt`, `.md`, and `.docx`, up to 2 MB. The file becomes a new document.

## Tests and production

```bash
npm test
npm run build
npm start
```

`npm start` listens on port 3000. Set `PORT` to change it. Production requires `TURSO_DATABASE_URL` (a remote `libsql://` or `https://` URL) and `TURSO_AUTH_TOKEN` in the server environment. Integration-prefixed variables must be mapped to these canonical names for production. Missing credentials or a local URL fail explicitly; `DATABASE_PATH` is only a development fallback. Set `COOKIE_SECURE=true` over HTTPS.

Initialization caches a promise per server process, creates missing tables/indexes, and seeds only when the marker is absent. Both schema setup and seeding use write transactions. Failed initialization closes the client and permits a retry. No tables are dropped and no existing rows are replaced.

Before switching an existing SQLite deployment to Turso, back up the database with a SQLite-aware backup (including committed WAL data), and import it into an empty Turso database using your approved migration process. Preserve all tables, including `meta`, users/password hashes, sessions, documents, and shares. Verify row counts and representative documents before switching traffic. Setting the environment variables does not copy local data. This repository does not automatically transfer or reset databases.

## Docker

```bash
docker build -t folio .
docker run --rm -p 3000:3000 --env-file .env.production.local folio
```

Supply the Turso variables and `COOKIE_SECURE` through the runtime environment file or your deployment secret store. Environment files are excluded from the Docker image.

## What is intentionally out of scope

Folio does not do realtime co-editing, comments, suggestion mode, version history, or PDF export. Two people can edit the same document, and the last save wins. That is described in [ARCHITECTURE.md](ARCHITECTURE.md).

A public deployment URL and the walkthrough video still need to be added by the candidate. See [SUBMISSION.md](SUBMISSION.md) and [WALKTHROUGH.md](WALKTHROUGH.md).
