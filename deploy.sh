#!/bin/bash

# Exit on any command failure
set -e

echo "===================================================="
echo "🚀 Zephyr Application Platform GCP Deployer"
echo "===================================================="

# 1. Detect Active GCP Project
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
  echo "❌ Error: No active gcloud project found."
  echo "Please set your project first: gcloud config set project YOUR_PROJECT_ID"
  exit 1
fi

echo "📡 Target GCP Project: $PROJECT_ID"

# 2. Set Default Region
REGION="us-central1"
echo "📍 Target Deployment Region: $REGION"

# 3. Check for GEMINI_API_KEY in Env or prompt
if [ -z "$GEMINI_API_KEY" ]; then
  echo "🔑 GEMINI_API_KEY is not set in the shell environment."
  read -p "Please enter your Gemini API Key (or press Enter to skip and configure later): " USER_API_KEY
  GEMINI_API_KEY=$USER_API_KEY
fi

# 4. Build and Push via GCP Cloud Build to Artifact Registry
IMAGE_TAG="us-central1-docker.pkg.dev/$PROJECT_ID/zephyr-repo/zephyr-platform:latest"
echo "🛠️ Submitting Cloud Build request to project [$PROJECT_ID]..."
echo "📦 Target Tag: $IMAGE_TAG"
gcloud builds submit --tag "$IMAGE_TAG" .

# 5. Deploy to GCP Cloud Run
echo "🚀 Deploying 'zephyr' service to GCP Cloud Run in region [$REGION]..."
gcloud run deploy zephyr \
  --image "$IMAGE_TAG" \
  --platform managed \
  --region "$REGION" \
  --allow-unauthenticated \
  --service-account "zephyr-platform-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --update-env-vars "GCP_PROJECT_ID=$PROJECT_ID,GEMINI_API_KEY=$GEMINI_API_KEY"

# 6. Retrieve Service URL
SERVICE_URL=$(gcloud run services describe zephyr --platform managed --region "$REGION" --format 'value(status.url)' 2>/dev/null)

echo "===================================================="
echo "🎉 Zephyr Application Platform is LIVE!"
echo "🌐 URL: $SERVICE_URL"
echo "🛡️ Admin Restricted Console: $SERVICE_URL/admin"
echo "===================================================="
