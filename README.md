# Folio

A small shared document editor for internal drafts. Create a document, format it, import a `.txt`, `.md`, or `.docx` file, and share it with view or edit access.

## Run it locally

Requirements: Node.js 22.13 or newer (tested on Node.js 24) and npm. Folio uses the built-in `node:sqlite` module, so an older Node.js will not start.

```bash
npm install
npm test
npm run dev
```

Open http://localhost:3000.

The first launch creates `data/folio.db` and seeds three teammates plus one shared document. Delete that file and restart to reset the demo.

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

`npm start` listens on port 3000. Set `PORT` to change it. Set `DATABASE_PATH` to move the SQLite file. Set `COOKIE_SECURE=true` when the app is served over HTTPS.

## Docker

```bash
docker build -t folio .
docker run --rm -p 3000:3000 -v folio-data:/data folio
```

The container stores the database at `/data/folio.db`.

## What is intentionally out of scope

Folio does not do realtime co-editing, comments, suggestion mode, version history, or PDF export. Two people can edit the same document, and the last save wins. That is described in [ARCHITECTURE.md](ARCHITECTURE.md).

A public deployment URL and the walkthrough video still need to be added by the candidate. See [SUBMISSION.md](SUBMISSION.md) and [WALKTHROUGH.md](WALKTHROUGH.md).
