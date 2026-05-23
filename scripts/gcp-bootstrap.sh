#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-}"
REGION="${REGION:-asia-northeast3}"
REPOSITORY="${REPOSITORY:-moneyrocket}"
SERVICE_ACCOUNT_NAME="${SERVICE_ACCOUNT_NAME:-github-moneyrocket-deployer}"
OPENAI_API_KEY_VALUE="${OPENAI_API_KEY_VALUE:-}"
GITHUB_REPOSITORY="${GITHUB_REPOSITORY:-kimjuneon/MoneyRocket}"
WORKLOAD_IDENTITY_POOL="${WORKLOAD_IDENTITY_POOL:-github-actions}"
WORKLOAD_IDENTITY_PROVIDER="${WORKLOAD_IDENTITY_PROVIDER:-github}"

if [[ -z "${PROJECT_ID}" ]]; then
  echo "PROJECT_ID is required."
  echo "Example: PROJECT_ID=moneyrocket-juneon OPENAI_API_KEY_VALUE=sk-... ./scripts/gcp-bootstrap.sh"
  exit 1
fi

gcloud config set project "${PROJECT_ID}"

gcloud services enable \
  artifactregistry.googleapis.com \
  cloudresourcemanager.googleapis.com \
  iam.googleapis.com \
  run.googleapis.com \
  secretmanager.googleapis.com

if ! gcloud artifacts repositories describe "${REPOSITORY}" --location "${REGION}" >/dev/null 2>&1; then
  gcloud artifacts repositories create "${REPOSITORY}" \
    --repository-format docker \
    --location "${REGION}" \
    --description "MoneyRocket Docker images"
fi

if ! gcloud iam service-accounts describe "${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" >/dev/null 2>&1; then
  gcloud iam service-accounts create "${SERVICE_ACCOUNT_NAME}" \
    --display-name "MoneyRocket GitHub deployer"
fi

for role in \
  roles/artifactregistry.writer \
  roles/run.admin \
  roles/iam.serviceAccountUser \
  roles/secretmanager.secretAccessor; do
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member "serviceAccount:${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role "${role}" \
    --quiet
done

PROJECT_NUMBER="$(gcloud projects describe "${PROJECT_ID}" --format "value(projectNumber)")"
RUNTIME_SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member "serviceAccount:${RUNTIME_SERVICE_ACCOUNT}" \
  --role roles/secretmanager.secretAccessor \
  --quiet

if ! gcloud iam workload-identity-pools describe "${WORKLOAD_IDENTITY_POOL}" \
  --project "${PROJECT_ID}" \
  --location global >/dev/null 2>&1; then
  gcloud iam workload-identity-pools create "${WORKLOAD_IDENTITY_POOL}" \
    --project "${PROJECT_ID}" \
    --location global \
    --display-name "GitHub Actions"
fi

if ! gcloud iam workload-identity-pools providers describe "${WORKLOAD_IDENTITY_PROVIDER}" \
  --project "${PROJECT_ID}" \
  --location global \
  --workload-identity-pool "${WORKLOAD_IDENTITY_POOL}" >/dev/null 2>&1; then
  gcloud iam workload-identity-pools providers create-oidc "${WORKLOAD_IDENTITY_PROVIDER}" \
    --project "${PROJECT_ID}" \
    --location global \
    --workload-identity-pool "${WORKLOAD_IDENTITY_POOL}" \
    --display-name "GitHub OIDC" \
    --issuer-uri "https://token.actions.githubusercontent.com" \
    --attribute-mapping "google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
    --attribute-condition "attribute.repository == '${GITHUB_REPOSITORY}'"
fi

gcloud iam service-accounts add-iam-policy-binding "${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --project "${PROJECT_ID}" \
  --role roles/iam.workloadIdentityUser \
  --member "principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${WORKLOAD_IDENTITY_POOL}/attribute.repository/${GITHUB_REPOSITORY}" \
  --quiet >/dev/null

if ! gcloud secrets describe OPENAI_API_KEY >/dev/null 2>&1; then
  gcloud secrets create OPENAI_API_KEY --replication-policy automatic
fi

if [[ -n "${OPENAI_API_KEY_VALUE}" ]]; then
  printf "%s" "${OPENAI_API_KEY_VALUE}" | gcloud secrets versions add OPENAI_API_KEY --data-file=-
else
  echo "OPENAI_API_KEY secret exists, but no new value was added."
fi

echo "Done."
echo "Add these GitHub repository secrets:"
echo "GCP_PROJECT_ID=${PROJECT_ID}"
echo "GCP_WIF_PROVIDER=projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${WORKLOAD_IDENTITY_POOL}/providers/${WORKLOAD_IDENTITY_PROVIDER}"
echo "GCP_SERVICE_ACCOUNT=${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
