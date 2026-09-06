# MindSpace — Private AI-Powered Personal Reflection Workspace

> **Think. Write. Reflect. Move Forward.**
> A full-stack, privacy-first personal reflection and productivity workspace built with React 19, Tailwind CSS, Google Cloud Run, Cloud Firestore, and the Gemini 3.6 Flash API with resilient fallback architecture.

---

## 1. Overview & Architecture

MindSpace bridges distraction-free reflective writing with multi-turn cognitive exploration:
- **Client**: React 19 + TypeScript SPA with Tailwind CSS and responsive design.
- **Server**: Node.js + Express backend running Vite middleware in development and serving compiled static assets in production.
- **Database**: Google Cloud Firestore with strict user isolation (`request.auth.uid == userId`).
- **Authentication**: Firebase Authentication with Federated Google Sign-In (no passwords handled or stored).
- **AI Intelligence**: Gemini 3.6 Flash with automated fallback ladder (`gemini-3.6-flash` &rarr; `gemini-3.1-flash-lite` &rarr; `gemini-flash-latest` &rarr; `gemini-3.7-flash`).

---

## 2. Environment & Prerequisites

### Required Tools & SDKs
- [Google Cloud SDK (`gcloud` CLI)](https://cloud.google.com/sdk/docs/install)
- [Firebase CLI (`firebase-tools`)](https://firebase.google.com/docs/cli)
- Node.js 20+ and npm / bun

### Google Cloud Project Setup
Ensure your active GCP project is configured:
```bash
export PROJECT_ID="YOUR_GOOGLE_CLOUD_PROJECT_ID"
export REGION="asia-southeast1" # or your preferred region

gcloud config set project $PROJECT_ID
```

### Enable Necessary Google Cloud APIs
```bash
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  identitytoolkit.googleapis.com
```

---

## 3. Secret Management Setup (Google Secret Manager)

To eliminate hardcoded credentials in accordance with zero-hardcoding security hygiene, store your Gemini API key inside Google Cloud Secret Manager:

```bash
# 1. Create the secret in Secret Manager
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"

# 2. Add the API key version
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 3. Retrieve your project number
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")

# 4. Grant Cloud Run compute service account access to read the secret
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 4. Cloud Firestore Security Rules Configuration

MindSpace isolates all user data under `/users/{userId}/*`. Deploy the following hardened security rules to prevent cross-tenant data leaks:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Strict user data isolation: path owner must match authenticated user token
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      match /{allSubcollections=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }

    // Required user interactions validation block
    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Default deny for all other collections
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Deploy the rules via Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

---

## 5. Local Development

```bash
# Install dependencies
npm install

# Configure environment variables in .env
echo "GEMINI_API_KEY=YOUR_GEMINI_API_KEY" >> .env

# Launch unified development server on port 3000
npm run dev
```

---

## 6. Cloud Run Deployment Flow

Build and deploy the application container to Google Cloud Run with Secret Manager environment injection:

```bash
# Deploy service to Cloud Run
gcloud run deploy mindspace \
  --source . \
  --region=$REGION \
  --platform=managed \
  --allow-unauthenticated \
  --set-secrets=GEMINI_API_KEY=GEMINI_API_KEY:latest \
  --port=3000
```

### Mandatory Campaign Labeling
To register the deployed service for automated challenge verification, apply the required label:

```bash
gcloud run services update mindspace \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=$REGION
```

---

## 7. Security Architecture & Threat Countermeasures

| Threat Zone | Risk Identified | Countermeasure |
| :--- | :--- | :--- |
| **Input Surfaces** | Malicious injection & oversized payloads | JSON body limits (`10mb`), sanitization routines, undefined-stripping prior to Firestore writes. |
| **Planning & Reasoning** | Prompt injection attempting to manipulate instructions | Input treated as un-executable data; strict boundaries preventing psychiatric / clinical claims. |
| **Tool Execution** | API rate limits & service downtime | Automated fallback ladder (`gemini-3.6-flash` &rarr; `gemini-3.1-flash-lite` &rarr; `gemini-flash-latest` &rarr; `gemini-3.7-flash`). |
| **Memory & State** | Cross-tenant data leaks | Cloud Firestore security rules strictly validating `request.auth.uid == userId`. |
| **Inter-System** | Token leakage in client bundles | Zero client-side Gemini keys; federated Google Identity authentication. |
