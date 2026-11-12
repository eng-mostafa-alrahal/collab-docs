# AI Workflow Note

## 1. AI Tools Used

- **Antigravity (AI Coding Assistant) : model Gemini 3.8 Flash - Medium Thinking
s
## 2. Where AI Materially Accelerated Development

- **Layered Backend Scaffolding:** Quickly generated SQLAlchemy 2.0 models (`User`, `Document`, `DocumentShare`), Pydantic v2 schemas, Alembic initial migration (`0001_initial_schema`), and repository/service classes with consistent error mapping.
- **Test Suite Creation:** Scaffolded 16 backend Pytest tests covering authorization rules (`401`/`403`/`404`), optimistic version conflicts (`409`), HTML sanitization, Markdown/TXT conversion, and upload limits (`400`/`413`).
- **Angular Standalone Components:** Accelerated repetitive Tailwind UI templates for the Dashboard, Editor, Navbar account switcher, Share modal, and confirmation dialogs.

## 3. AI-Generated Output Changed or Rejected

- **Rejected: Native `contenteditable` + `document.execCommand()`:** Avoided building a custom editor from scratch due to selection, undo/redo, and cross-browser HTML normalization risks; integrated `ngx-editor` (v19.1.1 on ProseMirror) and verified compatibility with Angular 22 (`@angular/core >= 22.0.0`).
- **Simplified: Heavy Clean-Architecture Boilerplate:** Kept a pragmatic layered structure (routers -> application services -> domain policy/exceptions -> repositories) without unnecessary abstract repository interfaces or mapper layers.
- **Refined: Debounced Autosave & In-Flight Concurrency Guard:** Ensured `PUT /api/documents/{id}/content` responses update only the document `version` and `updated_at` rather than calling `FormControl.setValue()`, preventing editor DOM resets or cursor jumps while typing, and tracked `editRevision` across in-flight saves so concurrent keystrokes remain marked dirty until saved.
- **Fixed: `npm` Peer Dependency & Import Paths:** Resolved an npm 10 arborist `edgesOut` error during package installation using `--legacy-peer-deps` and corrected relative import paths during the Angular production build check.

## 4. Verification Performed

All verification steps below were executed locally after implementation:

- **Backend Automated Tests (`pytest -v`):** 16/16 tests passed against an isolated in-memory SQLite database with `StaticPool` and foreign-key enforcement.
- **PostgreSQL + Alembic Migration Verification:** Started PostgreSQL 16 via `docker compose up -d`, ran `alembic upgrade head`, and verified deterministic seeding of the 3 demo accounts via `python -m app.seed`.
- **Live Backend API Smoke Test:** Started `uvicorn` against PostgreSQL and verified `/api/health`, `/api/users`, document creation, sharing with Bob (`editor`), listing Bob's shared documents, and document deletion.
- **Frontend Production Build (`npm run build`) & Unit Tests (`npx ng test --watch=false`):** Production bundle compiled cleanly (`dist/frontend`) and 3/3 Vitest unit tests passed.

