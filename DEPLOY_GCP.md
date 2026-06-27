# Deploying Outdoor Hounds to your own GCP (single GKE node)

This guide takes you from a fresh GCP project to a live Outdoor Hounds site running on a single GKE node. It assumes you have a Google Cloud account with billing enabled and the `gcloud` CLI installed (or you can run all of this from Cloud Shell in the browser, where `gcloud`, `kubectl`, and `docker` are pre-installed).

Everything here uses the files already in the repo: the multi-stage `Dockerfile` and `infra/k8s-single-node.yaml`.

---

## 0. One-time setup: variables

Set these once in your shell so the later commands can be copied as-is.

```bash
export PROJECT_ID="your-gcp-project-id"      # e.g. outdoor-hounds-prod
export REGION="australia-southeast1"          # pick the region closest to Jenna
export ZONE="australia-southeast1-a"
export CLUSTER="outdoor-hounds"
export REPO="outdoor-hounds"                   # Artifact Registry repo name
export IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/outdoor-hounds:latest"

gcloud config set project "$PROJECT_ID"
```

## 1. Enable the required APIs

```bash
gcloud services enable \
  container.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com
```

## 2. Create an Artifact Registry repo and build the image

You can build the container with Cloud Build (no local Docker needed):

```bash
gcloud artifacts repositories create "$REPO" \
  --repository-format=docker \
  --location="$REGION" \
  --description="Outdoor Hounds container images"

# Build & push straight from the repo root (where the Dockerfile lives)
gcloud builds submit --tag "$IMAGE" .
```

> If you prefer to build locally instead: `gcloud auth configure-docker ${REGION}-docker.pkg.dev`, then `docker build -t "$IMAGE" .` and `docker push "$IMAGE"`.

## 3. Create a single-node GKE cluster

A single small node is plenty for the MVP. `e2-small` (2 vCPU shared, 2 GB) keeps cost low; bump to `e2-medium` if you want more headroom.

```bash
gcloud container clusters create "$CLUSTER" \
  --zone="$ZONE" \
  --num-nodes=1 \
  --machine-type=e2-small \
  --disk-size=20

# Wire kubectl to the new cluster
gcloud container clusters get-credentials "$CLUSTER" --zone="$ZONE"
```

> Tip: GKE Autopilot is an alternative that bills per-pod and removes node management, but standard mode with `--num-nodes=1` matches your "single node to start" requirement most directly.

## 4. Point the manifest at your image

The manifest ships with a placeholder image. Update it to the image you just pushed:

```bash
sed -i "s#gcr.io/your-project/outdoor-hounds:latest#${IMAGE}#" infra/k8s-single-node.yaml
```

(Or just open `infra/k8s-single-node.yaml` and edit the `image:` line by hand.)

## 5. Deploy

```bash
kubectl apply -f infra/k8s-single-node.yaml
```

This creates:
- the Deployment (1 replica — single node),
- two PersistentVolumeClaims (1 Gi for the SQLite database, 5 Gi for Jenna's photos),
- a `LoadBalancer` Service that gives you a public IP.

## 6. Seed the database (first run only)

The app auto-creates tables on startup. To load the starter listings, run the seed script inside the running pod once:

```bash
POD=$(kubectl get pod -l app=outdoor-hounds -o jsonpath='{.items[0].metadata.name}')
kubectl exec "$POD" -- python backend/seed.py
```

## 7. Get your public URL

```bash
kubectl get service outdoor-hounds-service
```

Wait until `EXTERNAL-IP` shows an address (a minute or two), then open `http://<EXTERNAL-IP>/` — that's your live site.

---

## Adding Jenna's photos

The deployment mounts a `/media` volume into the container. To add photos:

```bash
POD=$(kubectl get pod -l app=outdoor-hounds -o jsonpath='{.items[0].metadata.name}')
kubectl cp ./max.jpg "$POD":/app/frontend/dist/media/max.jpg
```

Then reference them in a listing as `/media/max.jpg` (the seed data already follows this pattern). For larger photo libraries you can later switch the `image_url` to point at a Google Cloud Storage bucket instead — no code change needed, just a different URL.

---

## Turning on real AI (optional)

By default the app runs in free, deterministic **mock mode**. To use a real LLM, edit the env block in `infra/k8s-single-node.yaml`:

```yaml
- name: LLM_ENABLED
  value: "true"
- name: LLM_PROVIDER
  value: "openai"
```

Store the API key as a Kubernetes secret rather than in the manifest:

```bash
kubectl create secret generic llm-secrets --from-literal=OPENAI_API_KEY=sk-...
```

…and add a `valueFrom.secretKeyRef` entry for `OPENAI_API_KEY` in the container env. Re-apply the manifest and restart the pod.

---

## Cost notes for GCP

| Component | Configuration | Rough cost |
| --- | --- | --- |
| GKE node | 1 × `e2-small`, 20 GB disk | The node VM is the main cost; a small e2 instance is in the low-tens-of-dollars/month range. Standard GKE also has a per-cluster management fee (one zonal cluster is free under the standard tier allowance). |
| Load Balancer | 1 forwarding rule | A few dollars/month. For a cheaper MVP you can swap the `LoadBalancer` Service for a `NodePort` and hit the node IP directly. |
| Database | SQLite on a 1 Gi PVC | Negligible — just disk. |
| Photos | 5 Gi PVC (or a GCS bucket later) | Negligible at MVP scale. |
| LLM | Mock mode (default) | $0 until you switch `LLM_ENABLED=true`. |

Confirm current pricing in the GCP Pricing Calculator for your region before committing, as rates change.

## Tearing it down

To stop all charges when you're done testing:

```bash
kubectl delete -f infra/k8s-single-node.yaml
gcloud container clusters delete "$CLUSTER" --zone="$ZONE"
```
