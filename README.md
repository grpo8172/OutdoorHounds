# Outdoor Hounds

An AI-guided service platform for Jenna Petersen's pet sitting, dog hiking, and animal adoption business.

Built with **FastAPI** (backend), **React/Vite** (web frontend), **Expo/React Native** (mobile), and **MySQL** (shared database).

# Clear cache for disk usage
rm -rf ~/.cache/*
rm -rf ~/.npm/_cacache

# Build up everything 
docker compose --env-file .env --profile mobile up -d --build db mobile-api mobile-web

# From the project root
cd /home/pigreetingz/outdoor_hounds

# Stop existing containers
docker compose --profile mobile down

# Rebuild the frontend/mobile web image after code changes
docker compose --profile mobile build mobile-web

# Start the DB, API, and mobile web containers
docker compose --profile mobile up -d mobile-web

# Check running containers
docker ps

# Check logs 

docker compose --profile mobile logs mobile-web --tail=80

docker compose --profile mobile logs mobile-api --tail=80


## Features

- **Storefront**: Browse adoptable pets, book group hikes, and arrange pet sitting.
- **Owner Setup Assistant**: AI helps draft business profiles and listings.
- **Agentic Guardrails**: AI cannot publish listings or confirm bookings. All state changes require explicit owner approval via the Admin Dashboard.
- **Mock LLM Mode**: Run locally for free using deterministic fixtures without needing API keys.
- **Shared Database**: Items created in the mobile app appear on the web storefront automatically.

---

## Running with Docker Compose (recommended)

Starts the FastAPI backend, React frontend, and MySQL database together.

```bash
# From the repo root
docker compose up --build
```

- Web app: http://localhost:8000
- MySQL: localhost:3306

To also start the mobile API and Expo web export:

```bash
docker compose --profile mobile up --build
```

- Mobile API (tRPC): http://localhost:3000
- Mobile web: http://localhost:8081

---

## Local Development

### Backend (FastAPI)

```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Copy and edit the example env file
cp .env.example .env

# Seed the database with initial approved listings
python seed.py

# Start the API server
uvicorn app.main:app --reload --port 8000
```

API available at http://localhost:8000

### Frontend (React/Vite)

In a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

Web app available at http://localhost:5173 (proxies `/api` to the backend at port 8000).

### Mobile (Expo/React Native)

In a separate terminal:

```bash
cd mobile
pnpm install

# Start the tRPC API server and Metro bundler together
pnpm dev
```

- Metro bundler: http://localhost:8081
- tRPC API: http://localhost:3000

To run on a physical device, generate a QR code:

```bash
pnpm qr
```

---

## Project Structure

```
outdoor_hounds/
├── Dockerfile            # Builds backend + frontend into a single image
├── docker-compose.yml    # Runs web + MySQL (add --profile mobile for mobile services)
├── backend/              # FastAPI app (Python)
├── frontend/             # React/Vite web app
├── mobile/               # Expo/React Native app + Express/tRPC server
└── infra/                # Kubernetes / GCP deployment manifests
```

---

## Architecture

### Services

The platform is three independently deployable services sharing one MySQL database:

| Service | Stack | Role |
|---|---|---|
| `web` | FastAPI + React/Vite (single image, backend serves the built frontend) | Public storefront, marketplace, owner admin dashboard, AI setup assistant |
| `mobile-api` | Express + tRPC + Drizzle | Backend for the Expo app — auth (Google OAuth), listings, bookings, subscriptions (PayPal), chat/LLM endpoints |
| `mobile-web` | Expo web export served via nginx | Browser build of the same mobile app (what "Open the app" links to from the marketplace) |

### Multi-tenancy

Each business ("tenant") gets its own `owner_config` row and a unique `slug`. The mobile app resolves which tenant to show via:

1. An explicit `/t/<slug>` deep link (sets the active tenant for that device), or
2. The signed-in user's own tenant, if they own one and haven't explicitly left/switched, or
3. A "no tenant chosen" default state.

`catalogue_items` is a shared table — a listing created from the mobile app or the web admin dashboard shows up in both, scoped by `tenant_id`.

### Request flow

```
Browser (web storefront) ──► web (FastAPI + React) ──► MySQL
                                     │
                                     └─ "Open the app" links out to ──► mobile-web (Expo web) ──► mobile-api (tRPC) ──► MySQL
Expo mobile app (iOS/Android) ───────────────────────────────────────► mobile-api (tRPC) ──► MySQL
```

- `web` never talks to `mobile-api` server-to-server — they're linked only by sharing the database and by the marketplace's outbound links.
- Auth differs by service: `web` uses bearer admin tokens (no cookies), `mobile-api` uses `SameSite=None; Secure` session cookies (required since `mobile-web` calls it cross-origin).
- The AI setup assistant and chat features run through `backend/app/llm` (web) or `mobile/server/_core/llm.ts` (mobile), gated by `LLM_ENABLED` — the AI can draft/suggest but never publishes listings or confirms bookings without explicit owner approval.

### Build-time config gotcha

`VITE_MOBILE_API_URL` / `VITE_MOBILE_APP_URL` (web) and `EXPO_PUBLIC_API_BASE_URL` / `EXPO_PUBLIC_WEB_URL` (mobile web) are baked into the JS bundle at **build time**, not read at runtime. Rebuilding `web` or `mobile-web` without passing these as `--build-arg`s silently falls back to `localhost` defaults in production — always rebuild via the project's `cloudbuild.yaml`-style config (not a bare `gcloud builds submit --tag ...`) so the build-args are preserved.

---

## Database

The backend and mobile app share a single **MySQL** database (`outdoor_hounds`).

- `catalogue_items` — shared table; items created in either app appear on both
- `web_users`, `web_enquiries`, `web_audit_events` — web-only tables managed by SQLAlchemy

Run database migrations for the mobile schema (requires MySQL running):

```bash
cd mobile
pnpm db:push
```

---

## LLM / AI Notes

- `LLM_ENABLED=false` by default — the app runs entirely offline using mock fixtures.
- To enable a real LLM, set `LLM_ENABLED=true`, `LLM_PROVIDER=openai`, and `OPENAI_API_KEY` in `backend/.env`.
- Guardrails prevent the AI from publishing listings or confirming bookings without owner approval.

---

## Infrastructure

See `infra/k8s-single-node.yaml` and `DEPLOY_GCP.md` for deployment to a single GKE node.
