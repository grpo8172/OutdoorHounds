# Stage 1: Build Frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./

# VITE_* vars are baked into the static build at compile time. These point
# the admin Google sign-in gate (features/admin-auth/AdminLoginGate.jsx) at
# the mobile-api backend and mobile-web app, which own the real Google OAuth
# flow and the $30 admin-subscription check — this frontend has no OAuth
# implementation of its own. Left unset, both fall back to localhost, which
# is fine for local dev but silently breaks Google sign-in in production.
ARG VITE_MOBILE_API_URL=""
ARG VITE_MOBILE_APP_URL=""
ENV VITE_MOBILE_API_URL=$VITE_MOBILE_API_URL
ENV VITE_MOBILE_APP_URL=$VITE_MOBILE_APP_URL

RUN npm run build

# Stage 2: Backend + Serve
FROM python:3.11-slim
WORKDIR /app

# Install backend deps
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./backend/

# Copy built frontend
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Start app correctly
ENV PYTHONPATH=/app/backend

# Expose port
EXPOSE 8000

# Run uvicorn (in a real setup, we'd mount static files or use nginx, but uvicorn can serve them for MVP)
# For this MVP Dockerfile, we assume Uvicorn runs the API and serves static files from /app/frontend/dist
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
