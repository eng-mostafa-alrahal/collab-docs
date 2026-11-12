# Ajaia Docs — Submission Overview

## 1. Included Materials

- `frontend/` — Angular 22 standalone application with Tailwind CSS and `ngx-editor`.
- `backend/` — FastAPI application, SQLAlchemy 2.0 models, Alembic migrations, and Pytest suite.
- `docker-compose.yml` — Local PostgreSQL 16 setup.
- `README.md` — Local setup, migration, seeding, and run instructions.
- `ARCHITECTURE.md` — Architecture decisions and tradeoffs.
- `AI_WORKFLOW.md` — AI usage, rejected suggestions, and verification summary.
- `SUBMISSION.md` — Submission overview and feature completeness checklist.
- `walkthrough_video.txt` — Placeholder file for the walkthrough video URL.

## 2. Live Product

- **Frontend URL:** https://collab-docs-1ed.pages.dev/
- **Backend API:** `<INSERT_DEPLOYED_RENDER_API_URL>` (e.g. `https://ajaia-docs-api.onrender.com/api`)
- **API Documentation (Swagger UI):** `<INSERT_DEPLOYED_RENDER_API_URL>/docs` (e.g. `https://ajaia-docs-api.onrender.com/docs`)
- **Health Check Endpoint:** `<INSERT_DEPLOYED_RENDER_API_URL>/api/health`

*(Deployed on Cloudflare Pages (Frontend), Render (FastAPI Backend), and Neon (Managed PostgreSQL).)*

## 3. Demo Accounts

| Account | Email | Role |
| --- | --- | --- |
| Alice Johnson | `alice@ajaia.dev` | Owner |
| Bob Smith | `bob@ajaia.dev` | Collaborator |
| Charlie Davis | `charlie@ajaia.dev` | Collaborator / Unauthorized user |

Use the account switcher in the application navigation bar (no passwords required).

## 4. Feature Completeness

| Feature | Status |
| --- | --- |
| Create documents | Complete |
| Rename documents | Complete |
| Rich-text editing (`ngx-editor`) | Complete |
| Bold, italic, underline | Complete |
| Headings (`H1`, `H2`, `H3`, `Normal`) | Complete |
| Bulleted and numbered lists | Complete |
| Debounced automatic saving | Complete |
| Optimistic concurrency (`409 Conflict` detection) | Complete |
| Reopen documents | Complete |
| TXT file import (escaped & sanitized) | Complete |
| Markdown file import (semantic HTML & sanitized) | Complete |
| Document sharing | Complete |
| Editor permissions | Complete |
| Viewer permissions (read-only UI + backend `403`) | Complete |
| Access revocation | Complete |
| Database persistence (PostgreSQL + Alembic) | Complete |
| Automated tests (16 Pytest + 3 Vitest) | Complete |
| Markdown export (`.md`) | Complete |
| PDF export (print stylesheet + `window.print()`) | Complete |
| Live public deployment | Pending external hosting |
| Walkthrough video | Pending recording (`walkthrough_video.txt`) |

## 5. Known Limitations

- Demo authentication uses a simulated `X-User-Id` header and is not production-ready.
- Real-time simultaneous co-editing (WebSockets / CRDTs) is intentionally not implemented; concurrent saves rely on optimistic `version` checking (`409 Conflict`).
- No document revision history UI or inline comments.
- File import is limited to `.txt` and `.md` files up to 2 MB.

## 6. Future Improvements (2–4 Hour Roadmap)

1. **Document Version History:** Persist revision snapshots and let owners inspect or restore prior versions.
2. **Collaborator Presence:** Lightweight WebSocket presence indicators showing active viewers/editors.
3. **Improved Conflict Recovery:** Side-by-side diff or merge helper when a `409 Conflict` occurs.
4. **Expanded File Import:** Support `.docx` import and richer Markdown syntax coverage.

