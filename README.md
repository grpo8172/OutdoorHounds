# Outdoor Hounds

An AI-guided service platform for Jenna Petersen's pet sitting, dog hiking, and animal adoption business.

Built with **FastAPI** (backend), **React/Vite** (web frontend), **Expo/React Native** (mobile), and **MySQL** (shared database).

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
