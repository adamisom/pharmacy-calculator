# Deployment Plan

## Target Platform

**Primary**: Google Cloud Run (recommended)
**Alternative**: Google App Engine

## Prerequisites

- GCP account with billing enabled
- GCP project created
- `gcloud` CLI installed and authenticated
- Docker installed (for Cloud Run)

## Deployment Steps

### 1. Install Adapter

```sh
npm install -D @sveltejs/adapter-node
```

Update `svelte.config.js`: `import adapter from '@sveltejs/adapter-node';`

### 2. Create Dockerfile

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci && npm run build

FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/build ./build
EXPOSE 3000
CMD ["node", "build"]
```

### 3. Deploy to Cloud Run

```sh
gcloud builds submit --tag gcr.io/PROJECT_ID/ndc-calculator
gcloud run deploy ndc-calculator \
  --image gcr.io/PROJECT_ID/ndc-calculator \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "VITE_FDA_API_KEY=your_key_here" \
  --memory 512Mi \
  --min-instances 0 --max-instances 10
```

## Environment Variables

Set via Cloud Run console or CLI: `VITE_FDA_API_KEY` (optional)

## Alternative: App Engine

Create `app.yaml`:
```yaml
runtime: nodejs18
env: standard
instance_class: F1
automatic_scaling:
  min_instances: 0
  max_instances: 10
env_variables:
  VITE_FDA_API_KEY: 'your_key_here'
```

Deploy: `gcloud app deploy`

## Post-Deployment

1. Visit Cloud Run service URL
2. Run smoke tests (see `IMPLEMENTATION_SUMMARY.md`)
3. Check logs: `gcloud run logs read --service ndc-calculator`

## CI/CD (GitHub Actions)

```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: google-github-actions/setup-gcloud@v1
      - run: gcloud builds submit --tag gcr.io/${{ secrets.GCP_PROJECT_ID }}/ndc-calculator
      - run: gcloud run deploy ndc-calculator --image gcr.io/${{ secrets.GCP_PROJECT_ID }}/ndc-calculator --region us-central1
```

## Rollback

```sh
gcloud run revisions list --service ndc-calculator
gcloud run services update-traffic ndc-calculator --to-revisions PREVIOUS_REVISION=100
```

## Notes

- Cloud Run scales to zero (free tier: 2M requests/month)
- In-memory cache resets on restart (acceptable for low-volume)
- For multi-instance, consider Redis for shared cache
