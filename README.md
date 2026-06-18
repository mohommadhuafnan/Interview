# InterviewGuard AI

**AI Interview Integrity & Candidate Authenticity Detection Platform**

A production-ready full-stack SaaS platform that monitors online interviews and detects suspicious candidate behavior in real time using computer vision, NLP, and behavioral analysis.

---

## Features

- **JWT Authentication** with role-based access (Admin, HR, Interviewer, Candidate)
- **Real-time AI Monitoring** — gaze tracking, head pose, multi-person detection
- **Browser Integrity** — tab switch, copy-paste, fullscreen enforcement
- **NLP Answer Analysis** — AI-generated response detection
- **Audio Analysis** — Whisper-powered speech-to-text and anomaly detection
- **Trust Score Engine** — composite authenticity scoring with risk levels
- **HR Dashboard** — live monitoring, analytics, candidate management
- **PDF Reports** — downloadable interview integrity reports
- **WebSocket** — real-time event streaming

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | Next.js 14, React, Tailwind CSS, Framer Motion, Chart.js, Monaco Editor |
| Backend | FastAPI, Python 3.11+ |
| AI/CV | OpenCV, MediaPipe, HuggingFace Transformers, Whisper |
| Database | Supabase (PostgreSQL) |
| Real-time | WebSockets |

---

## Project Structure

```
Interview/
├── frontend/           # Next.js application
│   └── src/
│       ├── app/        # Pages (App Router)
│       ├── components/ # UI components
│       ├── hooks/      # Custom React hooks
│       └── lib/        # API client & auth
├── backend/            # FastAPI server
│   └── app/
│       ├── routes/     # API endpoints
│       ├── services/   # Business logic
│       ├── models/     # Pydantic schemas
│       └── utils/      # Security helpers
├── ai_models/          # AI detection modules
│   ├── gaze_detection.py
│   ├── head_pose.py
│   ├── multi_person.py
│   ├── nlp_analysis.py
│   └── audio_analysis.py
└── database/           # Supabase schema
    └── schema.sql
```

---

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+
- (Optional) Supabase account for persistent storage

### 1. Backend Setup

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env

# Start server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API docs available at: http://localhost:8000/docs

### 2. Frontend Setup

```bash
cd frontend
npm install

# Configure environment
copy .env.local.example .env.local

# Start dev server
npm run dev
```

App available at: http://localhost:3000

### 3. Database (Optional)

Run `database/schema.sql` in your Supabase SQL editor, then add credentials to `backend/.env`:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
```

Without Supabase, the app runs with in-memory demo data.

---

## Deploy to Vercel (Services)

This project uses [Vercel Services](https://vercel.com/docs/services) to deploy the Next.js frontend and FastAPI backend on one domain.

### `vercel.json` configuration

| Service | Path | Route |
|---------|------|-------|
| Frontend (Next.js) | `frontend/` | `/` |
| Backend (FastAPI) | `backend/app/main.py` | `/_/backend` |

### Deploy steps

1. Import [github.com/mohommadhuafnan/Interview](https://github.com/mohommadhuafnan/Interview) on [Vercel](https://vercel.com)
2. Set **Framework Preset** to **Services**
3. Add environment variables in Vercel dashboard:
   - `SUPABASE_URL`, `SUPABASE_KEY`, `SECRET_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
4. Deploy

### Local multi-service dev

```bash
npm i -g vercel
vercel dev -L
```

API requests from the frontend use `/api/*` rewrites → `/_/backend/api/*` on Vercel, or `http://localhost:8000/api/*` locally.

---

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@interviewguard.com | admin123 |
| HR | hr@interviewguard.com | hr123456 |
| Interviewer | interviewer@interviewguard.com | interview123 |
| Candidate | candidate@interviewguard.com | candidate123 |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/register` | User registration |
| GET | `/api/auth/me` | Current user |
| GET | `/api/interviews/` | List interviews |
| POST | `/api/analysis/gaze` | Gaze detection |
| POST | `/api/analysis/head-pose` | Head pose analysis |
| POST | `/api/analysis/multi-person` | Multi-person detection |
| POST | `/api/analysis/answer` | NLP answer analysis |
| POST | `/api/interviews/trust-score` | Calculate trust score |
| POST | `/api/interviews/reports/generate` | Generate PDF report |
| WS | `/ws/{client_id}` | Real-time monitoring |

---

## Pages

### Public
- `/` — Landing page
- `/features` — Feature overview
- `/about` — About page
- `/contact` — Contact form

### Auth
- `/login` — Sign in
- `/register` — Create account

### Candidate
- `/interview` — Interview room with webcam, coding editor, AI monitoring

### HR/Admin
- `/dashboard` — Overview
- `/dashboard/monitoring` — Live monitoring
- `/dashboard/candidates` — Candidate list
- `/dashboard/analytics` — Charts & analytics
- `/dashboard/reports` — PDF report downloads

---

## License

MIT
