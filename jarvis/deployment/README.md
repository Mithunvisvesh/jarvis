# JARVIS Deployment Guide

This guide provides instructions for deploying the JARVIS agent platform locally using containers or deploying it to production on Google Cloud Run.

---

## 1. Environment Configuration

Before deploying, ensure you have the required environment variables. Create a `.env` file based on `.env.example` in the repository root:

| Variable | Description | Default | Required |
| --- | --- | --- | --- |
| `GEMINI_API_KEY` | Google Gemini API Authentication Key | None | Yes |
| `USE_WORKFLOW` | If true, routes queries via the Event-Driven A2A mesh | `true` | No |
| `PORT` | FastAPI server runtime port | `8001` | No |

---

## 2. Local Container Deployment

You can build and run JARVIS locally using Docker and Docker Compose.

### Build and Run with Docker Compose
From the `jarvis/` directory, run:
```bash
docker-compose up --build
```
This launches the FastAPI backend on port `8001` and binds all local storage paths for memory, reminders, and traces.

### Manual Docker Execution
To run only the backend server in a standalone container:
```bash
# Build the container
docker build -t jarvis-backend:latest .

# Run the container
docker run -p 8001:8001 --env-file .env jarvis-backend:latest
```

---

## 3. Production Deployment to Google Cloud Run

To host JARVIS on Google Cloud, use Google Cloud Build and Cloud Run to manage the serverless container deployment.

### Prerequisites
1. Install the Google Cloud CLI (`gcloud`).
2. Set your active project and configure authentication:
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```
3. Enable the required GCP Services:
   ```bash
   gcloud services enable run.googleapis.com cloudbuild.googleapis.com
   ```

### Step A: Deploy using Cloud Build (Remote compilation)
Submit the local workspace directly to Google Cloud Build to produce a secure container image in Google Artifact Registry and deploy it automatically:
```bash
gcloud builds submit --config cloudbuild.yaml
```

### Step B: Manual Cloud Run deployment
Alternatively, compile and deploy in two manual steps:
```bash
# Build the container image in the cloud
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/jarvis-backend:latest

# Deploy to Cloud Run
gcloud run deploy jarvis-backend \
    --image gcr.io/YOUR_PROJECT_ID/jarvis-backend:latest \
    --platform managed \
    --region us-central1 \
    --set-env-vars GEMINI_API_KEY=YOUR_GEMINI_API_KEY,USE_WORKFLOW=true \
    --allow-unauthenticated
```

---

## 4. Production Security Recommendations

- **API Secret Management**: Do not pass `GEMINI_API_KEY` in plain text. Instead, configure Google Secret Manager and reference the secret in the Cloud Run service definition.
- **VPC Service Controls**: If integrating JARVIS with corporate database systems, restrict the Cloud Run service to internal traffic using a Serverless VPC Access connector.
