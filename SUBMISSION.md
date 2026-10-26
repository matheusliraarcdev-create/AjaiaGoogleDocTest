# Submission

## Included

- Source for Folio, a Next.js document editor
- `README.md` with local setup, reviewer accounts, and Docker
- `ARCHITECTURE.md`
- `AI_WORKFLOW.md`
- `WALKTHROUGH.md`, a 3–5 minute recording script
- `VIDEO_URL.txt`, where the public video link goes
- `samples/plain-notes.txt`, `samples/weekly-update.md`, and `samples/word-notes.docx`
- Automated tests in `tests/`
- `Dockerfile`

## Accounts

Password for every account: `folio-demo`

- Ada Okonkwo, ada@ajaia.test, owns the seeded document
- Lin Zhao, lin@ajaia.test, can edit the seeded document
- Noah Patel, noah@ajaia.test, has no shared document until access is granted

## Working

- Create, rename, edit, autosave, and reopen a document
- Bold, italic, underline, headings, and bulleted or numbered lists
- Import `.txt`, `.md`, and `.docx` up to 2 MB into a new document
- Owner, view, and edit access, with owned and shared documents separated in the list
- Data kept in SQLite across refresh
- Validation for empty titles, unknown teammates, unsupported files, and people without access
- Nine automated tests
- Production build via `npm run build`

## Not included yet

- A public deployment URL. This environment has no hosting login. Run it locally with `npm run dev`, or deploy the Docker image to a host with a persistent disk and put the URL here.
- The walkthrough video. Record from `WALKTHROUGH.md` and put the public link in `VIDEO_URL.txt` and in the submission form.

## Live URL

Not deployed from this workspace. Local URL after `npm run dev`: http://localhost:3000

## Incomplete on purpose

Realtime co-editing, comments, version history, and PDF export are not built. The next slice would be version snapshots, Markdown export, and a simple viewing indicator. Details are in `ARCHITECTURE.md`.
