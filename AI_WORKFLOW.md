# AI workflow

The app was built in Cursor with Grok. AI was used to turn the assignment into a scoped product, draft the Next.js app, and write the first pass of the access rules, editor, and tests. The choices below were checked in the running app and in Vitest, not accepted from the draft.

## What AI sped up

- The initial shape of the app: SQLite, cookie sessions, TipTap, and one import path instead of a broader office suite.
- The first versions of the document queries, share panel, and editor toolbar.
- A walkthrough script and the setup notes after the behavior was known.

## What was rejected or changed

- Realtime collaboration was rejected. A CRDT or websocket layer would have crowded out sharing, import, and a usable editor.
- Browser-only storage was rejected. A refresh on another account cannot see a document that lives in one browser.
- An attachment locker was rejected. Importing `.txt`, `.md`, and `.docx` into an editable document uses the editor, which is the product.
- A hosted database was rejected for the local build. Reviewers should not need an account or a credit card to run it. SQLite is created on first launch.
- The first save implementation wrote the title and body together. A browser pass showed a rename being overwritten by the body autosave. Saves were split so each request updates only the field it changed.
- Database rows were passed straight into the editor page and the page crashed, because the SQLite driver does not return plain objects. User records are now copied into plain objects before they reach the client.
- A Word sample made with the system zip tool was not a valid `.docx`. It was replaced with a small uncompressed package that Mammoth can read. The import test covers that file.

## How it was verified

- `npm test` covers sign-in, owner/editor/viewer rules, sharing, HTML sanitizing, and import of the sample `.txt`, `.md`, and `.docx` files. Nine tests pass.
- The app was clicked through in a browser: Ada signs in, the seeded document keeps its formatting, Noah can be given view access, Noah sees it under Shared with you and cannot edit, a new document can be created and a typed list survives reload, and the title autosave reaches SQLite.
- The import API was called with the sample Markdown and Word files, and with a `.pdf`, which is rejected.
- A phone-width layout was checked for the document list and the editor. The toolbar wraps and the owned/shared sections stay distinct.
- `npm run build` completes with the production webpack build.
