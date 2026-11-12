# Ajaia Docs

Ajaia Docs is a lightweight collaborative document editor inspired by Google Docs, built with **Angular 22**, **Python FastAPI**, and **PostgreSQL**.

> **Security Note — Simulated Demo Authentication:**  
> This application uses seeded demonstration accounts and an `X-User-Id` HTTP header set by an in-app account switcher. This is a demonstration mechanism for evaluating multi-user sharing and permissions without OAuth2/JWT setup; it is **not** production authentication. All document authorization checks are still enforced server-side on every API request.

## Prerequisites

- **Python** 3.11+ (tested on Python 3.14.2)
- **Node.js** 22+ & **npm** 10+ (tested on Node v22.23.2 / npm 10.9.8)
- **Docker Desktop** (for local PostgreSQL)
- **Git**

## Local Setup & Run Instructions

### Option A: Run Everything with Docker Compose (Recommended)

Start PostgreSQL, the FastAPI backend (with automatic Alembic migrations and demo user seeding), and the Angular frontend served by Nginx:

```bash
docker compose up -d --build
```

- **Frontend:** `http://localhost:4200`
- **Backend API (via Nginx proxy or direct):** `http://localhost:4200/api` / `http://localhost:8000`
- **Swagger UI:** `http://localhost:8000/docs`

### Option B: Run Locally Without Containerizing Backend/Frontend

#### 1. Start PostgreSQL

```bash
docker compose up -d postgres
```

### 2. Configure and Start the Backend

```bash
cd backend
python -m venv venv
```

Activate the virtual environment:

- **Windows PowerShell:**
  ```powershell
  .\venv\Scripts\Activate.ps1
  ```
- **Linux / macOS:**
  ```bash
  source venv/bin/activate
  ```

Install dependencies and configure `.env`:

```bash
pip install -r requirements.txt
cp .env.example .env
```

*(On Windows PowerShell, use `Copy-Item .env.example .env`.)*

Apply database migrations and seed the demo accounts:

```bash
alembic upgrade head
python -m app.seed
```

Run backend automated tests:

```bash
pytest -v
```

Start the FastAPI server:

```bash
uvicorn app.main:app --reload --port 8000
```

- API base URL: `http://localhost:8000`
- Swagger UI: `http://localhost:8000/docs`
- Health endpoint: `http://localhost:8000/api/health`

### 3. Start the Frontend

Open a second terminal:

```bash
cd frontend
npm install --legacy-peer-deps
npm start
```

- Frontend URL: `http://localhost:4200`

Run frontend unit tests or production build:

```bash
npx ng test --watch=false
npm run build
```

## Demo Accounts

No passwords are required. Use the account switcher in the top navigation bar:

| ID | Name | Email | Default Role Example |
| --- | --- | --- | --- |
| 1 | Alice Johnson | `alice@ajaia.dev` | Document Owner |
| 2 | Bob Smith | `bob@ajaia.dev` | Collaborator (Editor / Viewer) |
| 3 | Charlie Davis | `charlie@ajaia.dev` | Collaborator / Unauthorized User |

## Supported File Imports

- **Formats:** `.txt` (plain text converted to escaped HTML paragraphs) and `.md` (Markdown converted to semantic HTML)
- **Maximum size:** `2 MB` (`2097152` bytes)
- All imported HTML and editor HTML is sanitized server-side with `nh3` before persistence.

## Demonstrating Sharing & Access Control

1. Select **Alice** in the top navigation bar.
2. Click **+ New Document** (or **Import File** with a `.txt` / `.md` file), rename the title, and format text using Bold, Italic, Underline, Headings, and Lists. Wait ~1 second for **All changes saved**.
3. Click **Share**, select **Bob Smith** as **Can Edit**, and click **Grant Access**.
4. Grant **Charlie Davis** **View Only** access (or leave another document unshared to verify `403` access denial).
5. Switch to **Bob** in the top bar: verify Bob sees the document under **Shared with Me** (`Can Edit`), can edit content, and cannot rename, delete, or manage sharing.
6. Switch to **Charlie**: verify Charlie opens the document in read-only mode without the formatting toolbar.
7. Switch back to **Alice**, open **Share**, and click **Revoke** for Bob. Switching back to **Bob** immediately denies access (`403 Forbidden`).

## Known Scope & Tradeoffs

- Shared editing is persistent and sequential with optimistic version checking (`409 Conflict` on stale saves), **not** real-time simultaneous WebSocket/CRDT co-editing.
- Document comments, suggestion mode, and revision history are intentionally omitted from this initial release.

## Production Deployment (Neon + Render + Cloudflare Pages)

### 1. Database — Neon PostgreSQL

1. Create a free PostgreSQL database in **Neon** and copy the connection string (for example: `postgresql://user:password@ep-example.us-east-2.aws.neon.tech/neondb?sslmode=require`).
2. `backend/app/config.py` automatically normalizes `postgres://` and `postgresql://` to `postgresql+psycopg://` for SQLAlchemy 2.0 + `psycopg` 3.

### 2. Backend — Render

You can deploy via the included [render.yaml](render.yaml) Blueprint or create a Web Service manually with:

- **Root Directory:** `backend`
- **Runtime:** Python 3.12
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `alembic upgrade head && python -m app.seed && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Health Check Path:** `/api/health`
- **Environment Variables:**
  - `DATABASE_URL` = your Neon connection string
  - `CORS_ORIGINS` = your Cloudflare Pages URL (for example `https://ajaia-docs.pages.dev` — update this after creating the Cloudflare Pages project)
  - `MAX_UPLOAD_SIZE` = `2097152`
  - `ENVIRONMENT` = `production`

Verify the deployed API at `https://<your-render-service>.onrender.com/api/health` and `/docs`.

### 3. Frontend — Cloudflare Pages

Create a **Cloudflare Pages** project connected to your GitHub repository:

- **Root directory:** `frontend`
- **Build command:** `npm install --legacy-peer-deps && npm run build:pages`
- **Build output directory:** `dist/frontend/browser`
- **Environment variables:**
  - `NODE_VERSION` = `22`
  - `API_URL` = `https://<your-render-service>.onrender.com/api`

Cloudflare Pages automatically serves `index.html` for Angular client-side routes like `/documents/1`. After Cloudflare Pages gives you the live `https://*.pages.dev` URL, set `CORS_ORIGINS` on Render to match it (without a trailing slash).


