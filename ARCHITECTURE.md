# Architecture

Folio is a Next.js application with server-rendered pages and a small JSON API. Documents, users, sessions, and shares live in one SQLite file through Node's built-in `node:sqlite`. There is no separate database service to configure or pay for.

## What was prioritized

The review needs a path that works in a few minutes: sign in as two people, edit formatted text, refresh, import a file, and see the difference between an owned document and a shared one. Those flows are finished. Realtime collaboration, comments, and version history are not, because they would have made the editing and sharing model thinner.

## Request path

The browser talks to route handlers under `app/api`. Those handlers check the session cookie and call `lib/documents.ts`. The same functions are what the automated tests call, so access rules are not only enforced in the UI.

A document is visible only to its owner and to people with a share row. Everyone else gets the same "not found" response, including people who guess an id. Owners can rename, edit, delete, and change sharing. Editors can change the title and body. Viewers can open the document and see who has access, and the editor is not editable.

Sharing defaults to edit because the product is for drafting together. View is available when someone should read without changing the text.

## Editor and storage

The editor is [TipTap](https://tiptap.dev/). It supports bold, italic, underline, headings, and bulleted or numbered lists. The document body is stored as sanitized HTML. On save, tags and attributes outside that set are removed, including scripts. Reopening a document loads that HTML back into the editor, so the formatting survives a refresh.

Title and body are saved as separate updates. An autosave of the body does not write the title column, and a rename does not write the body. That avoids one request wiping the other when both happen close together. Typing pauses for about 700ms before the body is saved. The title saves on blur and shortly after typing.

Uploads are not stored as files. A `.txt`, `.md`, or `.docx` file is parsed in memory, sanitized, and inserted as a new document owned by the current user. The limit is 2 MB. This matches the editing product better than an attachment list that never becomes editable text.

## Auth

Three users are seeded on first launch. Passwords are hashed with scrypt. A successful sign-in creates a random session id in an `httpOnly`, `SameSite=Lax` cookie. The `Secure` flag is off unless `COOKIE_SECURE=true`, so the local HTTP server still keeps the reviewer signed in. This is a demo gate so two accounts can be shown. It is not production SSO.

## Known limits

- Two editors can overwrite each other. The latest save is kept.
- There is no presence indicator, comment thread, or history.
- Import understands `.txt`, `.md`, and `.docx` only. Other Word formats and PDF files are rejected.
- The SQLite file is local to the server. A serverless host with an ephemeral disk will lose documents when the instance is replaced. Use a persistent volume, or run it locally.

## With another 2–4 hours

1. Snapshot the HTML on each save and let the owner restore an earlier copy.
2. Export the current document as Markdown.
3. Show a simple "Lin is also viewing" indicator by polling, without building a full realtime editor.
