# Ajaia Docs — Architecture Note

## Overview

Ajaia Docs is a lightweight collaborative document editor built with **Angular 22**, **Python FastAPI**, and **PostgreSQL**. The system is designed around a pragmatic layered backend architecture and a reactive standalone-component frontend so that core workflows — document creation, rich-text editing, autosave, file import, and role-based sharing — work reliably end to end without over-engineering.

## Architecture Diagram

```
Angular Frontend (Standalone Components + Signals + ngx-editor)
        │
        │  REST / JSON  (X-User-Id header via functional AuthInterceptor)
        ▼
FastAPI Application (/api/*)
        │
        ├── API Layer        (Routes, Request/Response Validation, Identity Dependency)
        ├── Application Layer (DocumentService, SharingService, FileImportService)
        ├── Domain Layer      (DocumentPolicy, Domain Exceptions)
        └── Infrastructure    (SQLAlchemy 2.0 Models, Repositories, nh3 Sanitizer, Markdown/TXT Parser)
                │
                ▼
           PostgreSQL
```

## Key Architectural Decisions

### 1. Angular Standalone Components + Signals + `ngx-editor`
- **Choice**: Angular 22 standalone components with Angular Signals for shared identity/UI state, RxJS for debounced autosave and HTTP streams, and `ngx-editor` (built on ProseMirror) for rich-text editing.
- **Rationale**: Avoids brittle `document.execCommand()` and custom `contenteditable` cursor/selection bugs while keeping state management lightweight without NgModules or heavy store libraries.

### 2. FastAPI with Pragmatic Layered Separation
- **Choice**: Separate routes (`api/`), application services (`application/services/`), authorization policy (`domain/policies/`), and SQLAlchemy repositories/utilities (`infrastructure/`).
- **Rationale**: Keeps HTTP status translation, business rules, and database queries decoupled without introducing redundant interfaces or multi-layer DTO mapping boilerplate.

### 3. PostgreSQL + SQLAlchemy 2.0 + Alembic (with SQLite for Isolated Tests)
- **Choice**: PostgreSQL via `psycopg` 3 in Docker Compose/production, explicit SQLAlchemy 2.0 `Mapped` models separate from Pydantic v2 schemas, and Alembic migrations. Automated tests use in-memory SQLite with `StaticPool` and foreign-key enforcement.
- **Rationale**: Preserves strong relational guarantees (unique share constraints, cascade deletes, UTC timestamps) while keeping automated tests fast and self-contained.

### 4. Backend-Enforced Role-Based Access Control
- **Choice**: Every protected endpoint resolves `X-User-Id` independently and enforces permissions via `document_policy.py` (`owner`, `editor`, `viewer`).
- **Rationale**: The frontend hides unavailable controls (e.g., hiding the formatting toolbar for viewers or Share/Delete buttons for non-owners) purely for usability; the backend remains the sole source of truth and returns `401`, `403`, or `404` as appropriate.

### 5. Sanitized HTML Persistence + Optimistic Concurrency
- **Choice**: Editor HTML and converted `.txt`/`.md` imports are sanitized server-side using `nh3` with an explicit tag/attribute allowlist before persistence. Each document maintains an incrementing `version` column checked on `PUT /api/documents/{id}/content` (`409 Conflict` on stale writes).
- **Rationale**: Restores rich-text structure reliably across refreshes, prevents stored XSS, and prevents silent overwrites when two collaborators open the same document sequentially.

### 6. Simulated Demo Identity (`X-User-Id`)
- **Choice**: Three seeded demo accounts (Alice, Bob, Charlie) selected via an in-app switcher and sent via `X-User-Id`.
- **Rationale**: Enables instant evaluation of multi-user sharing, permission enforcement, and revocation without full OAuth2/JWT overhead. **Limitation**: This header is client-supplied and is strictly a demonstration mechanism, not production authentication.

## Intentional Tradeoffs & Deprioritized Scope

- **No real-time co-editing (WebSockets / CRDTs / OT)**: Shared editing is persistent and sequential with optimistic version checks rather than simultaneous Google Docs-style live cursor merging.
- **No document comments, suggestion mode, or version history UI**: Deferred to keep the core editing, import, and sharing flows solid.
- **File import limited to `.txt` and `.md` (max 2 MB)**: Avoids heavyweight DOCX/PDF parsing dependencies while demonstrating safe upload validation, encoding checks, conversion, and sanitization.

