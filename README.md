# Outdoor Hounds

An AI-guided service platform for Jenna Petersen's pet sitting, dog hiking, and animal adoption business.

Built with **FastAPI**, **React**, and **SQLite** for a clean, modular MVP that deploys easily to a single GKE node.

## Features
- **Storefront**: Browse adoptable pets, book group hikes, and arrange pet sitting.
- **Owner Setup Assistant**: AI helps draft business profiles and listings.
- **Agentic Guardrails**: AI cannot publish listings or confirm bookings. All state changes require explicit owner approval via the Admin Dashboard.
- **Mock LLM Mode**: Run locally for free using deterministic fixtures without needing API keys.
- **Easy Photos**: Drop photos into `frontend/src/assets/photos` (or the deployed media volume) and reference them in the listings.

## Local Development Setup

### 1. Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Seed the database with initial approved listings
python seed.py

# Run the API
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend
In a new terminal:
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

## Budget & Cost Notes

*   **Infrastructure**: The included Kubernetes manifests (`infra/k8s-single-node.yaml`) restrict the deployment to exactly 1 replica. This is designed to run on a single small GKE node (e.g., `e2-small` or `e2-medium`), keeping cloud costs extremely low for the MVP.
*   **Database**: Uses SQLite by default, which requires zero separate database hosting costs. It stores the `.db` file in the mounted PVC.
*   **LLM Costs**: 
    *   By default, `LLM_ENABLED` is `false` and `LLM_PROVIDER` is `mock`. This uses local Python fixtures to return deterministic AI responses, costing $0.
    *   To use a real LLM, set `LLM_ENABLED=true`, `LLM_PROVIDER=openai`, and provide an `OPENAI_API_KEY`.
    *   Guardrails prevent the LLM from being called unnecessarily (e.g., simple CRUD actions bypass the LLM entirely).

## Architecture & Code Cleanliness

See `ARCHITECTURE.md` for a breakdown of the data layer, services, and policy guardrails. The project strictly separates API routing from business logic and LLM orchestration.
# OutdoorHounds
