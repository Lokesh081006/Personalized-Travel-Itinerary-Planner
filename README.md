# Roamly — AI Travel Itinerary Planner

A full-stack travel planning workspace built with React, FastAPI, an OpenAI-compatible LLM endpoint, and optional Supabase persistence. Roamly creates editable day-by-day plans with activities, dining, stays, transportation notes, and estimated costs. Its AI logic lives in a dedicated backend agent at `backend/app/agents/travel_agent.py`.

## Project structure

```text
frontend/   React + TypeScript + Vite UI
backend/    FastAPI API, LLM prompt pipeline, Supabase REST adapter
supabase/   SQL schema for persistent trips
```

## Quick start

### Backend

```powershell
Copy-Item .env.example .env
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
uvicorn backend.app.main:app --reload --port 8000
```

Edit `.env` and point `OPENAI_BASE_URL` at the OpenAI-compatible API running on the laptop that hosts Qwen3 8B. Common endpoints expose `/v1/chat/completions`; the backend appends that path automatically.

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The frontend talks to `http://localhost:8000` by default. To change it, copy `frontend/.env.example` to `frontend/.env`.

## Supabase (optional)

Run `supabase/schema.sql` in the Supabase SQL editor, then set `SUPABASE_URL` and the server-only `SUPABASE_SECRET_KEY` in the root `.env`. Legacy projects can use `SUPABASE_SERVICE_ROLE_KEY` instead. If those values are blank, the API uses local in-memory storage so the product is still fully testable.

## API

- `GET /api/health` — service and integration status
- `GET /api/trips` — list saved trips
- `GET /api/trips/{id}` — retrieve a trip
- `POST /api/trips/generate` — generate and save a complete itinerary
- `PUT /api/trips/{id}` — save edited itinerary data
- `POST /api/trips/{id}/days/{day_number}/regenerate` — regenerate one day
- `DELETE /api/trips/{id}` — delete a trip
