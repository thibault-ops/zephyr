# Zephyr Application Platform

Zephyr is a conversational, agentic web application creation and hosting platform. It allows end-users to build, iterate, and deploy full-stack or static web applications to production simply by chatting with an AI assistant, abstracting away all GCP infrastructure and deployment management.

## Tech Stack
* **Frontend:** Vite + React + Vanilla CSS (Custom glassmorphic system)
* **Backend:** Node.js + Express (API routing, GCP SDK orchestrator, and AI session manager)
* **AI Model:** Gemini 1.5 Pro / Flash via Antigravity API
* **Cloud Infrastructure:** Google Cloud Run (Containerized hosting), Cloud Build (Deployment pipelines), Cloud Monitoring (Telemetry metrics)
* **Database:** PostgreSQL/Firestore (User allowlist, session history, and granular telemetry logs)

## Repository Structure
```text
zephyr/
├── backend/            # Express.js backend server
│   ├── src/
│   │   ├── config/     # GCP, Database, and LLM configs
│   │   ├── services/   # AI Orchestrator, Billing/Telemetry, Deployer
│   │   └── index.js    # Entry point
│   ├── package.json
│   └── .env.example
├── frontend/           # React frontend client
│   ├── src/
│   │   ├── components/ # Chat, Canvas, Preview, Consumption Gauge
│   │   ├── styles/     # Premium Vanilla CSS design system
│   │   └── App.jsx
│   ├── package.json
│   └── index.html
└── README.md
```

## Setup & Running Locally

### Backend Setup
1. Navigate to `/backend`
2. Run `npm install`
3. Configure `.env` from `.env.example`
4. Run `npm run dev`

### Frontend Setup
1. Navigate to `/frontend`
2. Run `npm install`
3. Run `npm run dev`
