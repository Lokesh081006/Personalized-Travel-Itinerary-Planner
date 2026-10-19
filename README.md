# Roamly — Local AI Travel Planner

Roamly is a full-stack travel planning application that turns dates, budget, group size, pace, and interests into a structured day-by-day itinerary. It runs with a local OpenAI-compatible model server and optionally stores trips in Supabase.

## What it includes

- Responsive React dashboard and guided trip builder
- Contextual AI planning screen with live generation stages
- Detailed day timeline, costs, travel time, dining, stays, and transport
- Day regeneration and itinerary editing controls
- Dedicated `TravelAgent` with strict JSON-schema output validation
- OpenAI-compatible support for LM Studio, llama.cpp, Ollama proxies, vLLM, and SGLang
- Supabase persistence with automatic in-memory fallback
- Browser-persisted profile and travel preferences (until user authentication is added)

## Architecture

```text
Browser (React + Vite)
        |
        v
FastAPI backend ──────> OpenAI-compatible local LLM
        |
        └─────────────> Supabase PostgreSQL
```

The browser never receives the Supabase secret key or model-server credential.

## Requirements

- Python 3.11 or newer
- Node.js 20 or newer
- npm
- An OpenAI-compatible model server
- Optional: a Supabase project for persistent trips

Recommended lightweight model: `mistralai/Ministral-3-3B-Instruct-2512-GGUF` using `Q4_K_M`.

## 1. Clone and install

```bash
git clone <your-repository-url>
cd <repository-folder>
```

### Windows PowerShell

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt

cd frontend
npm install
cd ..
```

### macOS or Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt

cd frontend
npm install
cd ..
```

## 2. Configure environment variables

Create the backend environment file:

```powershell
Copy-Item .env.example .env
```

On macOS/Linux:

```bash
cp .env.example .env
```

Update `.env`:

```env
OPENAI_BASE_URL=http://YOUR_MODEL_SERVER_IP:1234/v1
OPENAI_API_KEY=your-model-server-key
OPENAI_MODEL=the-exact-model-id-returned-by-your-server

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=sb_secret_your_project_secret
SUPABASE_SERVICE_ROLE_KEY=

CORS_ORIGINS=http://localhost:5173
```

Never commit `.env`. It is already included in `.gitignore`.

### LM Studio on another computer

1. Download and load an instruct model.
2. Open **Developer** and start the local server on port `1234`.
3. Enable serving on the local network, not only `127.0.0.1`.
4. Allow port `1234` through the host computer's firewall.
5. Put that computer's LAN IP in `OPENAI_BASE_URL`.
6. Use the exact model ID shown by `GET /v1/models` for `OPENAI_MODEL`.

Both computers must be reachable on the same network.

## 3. Configure Supabase

Supabase is optional. Without it, Roamly uses memory storage and saved trips disappear when FastAPI restarts.

1. Create a Supabase project.
2. Open **SQL Editor → New query**.
3. Copy and run [`supabase/schema.sql`](supabase/schema.sql).
4. Confirm that `public.trips` appears in the Table Editor.
5. Open **Settings → API Keys**.
6. Copy **secret key (default)** beginning with `sb_secret_`.
7. Add the project URL and secret key to `.env`.

Do not use an `sb_publishable_` browser key or an `sbp_` personal access token as `SUPABASE_SECRET_KEY`.

## 4. Start the application

Open two terminals in the project root.

### Terminal 1 — FastAPI

Activate the virtual environment, then run:

```powershell
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

### Terminal 2 — React

```powershell
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

Useful development URLs:

- Frontend: `http://localhost:5173`
- API health: `http://localhost:8000/api/health`
- Interactive API docs: `http://localhost:8000/docs`

A healthy persistent setup returns:

```json
{
  "status": "ok",
  "ai_configured": true,
  "storage": "supabase",
  "model": "your-model-id"
}
```

## Frontend configuration

The frontend defaults to `http://localhost:8000`. For another backend URL:

```powershell
Copy-Item frontend\.env.example frontend\.env
```

Then set:

```env
VITE_API_URL=http://your-backend-host:8000
```

## Production build

```powershell
cd frontend
npm run build
```

The optimized frontend is written to `frontend/dist`.

For production, run FastAPI behind a reverse proxy, serve the frontend build from static hosting, restrict `CORS_ORIGINS`, use HTTPS, and store all secrets in your hosting provider's secret manager.

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/health` | Integration status |
| `GET` | `/api/trips` | List saved trips |
| `GET` | `/api/trips/{id}` | Get one trip |
| `POST` | `/api/trips/generate` | Generate and save an itinerary |
| `PUT` | `/api/trips/{id}` | Save itinerary changes |
| `POST` | `/api/trips/{id}/days/{day}/regenerate` | Regenerate one day |
| `DELETE` | `/api/trips/{id}` | Delete a trip |

## Project structure

```text
backend/
  app/
    agents/travel_agent.py   AI planning and structured-output agent
    services/storage.py      Supabase and memory storage adapters
    main.py                  FastAPI routes
    models.py                Validated request/response schemas
    prompts.py               Travel-planning prompts
frontend/
  src/
    App.tsx                  Product screens and interactions
    api.ts                   FastAPI client
    styles.css               Responsive visual system
supabase/
  schema.sql                 Database schema
```

## Troubleshooting

### Health says `storage: memory`

- Use a project secret beginning with `sb_secret_`.
- Make sure `.env` is in the repository root.
- Restart FastAPI after editing `.env`.

### LM Studio cannot be reached

- Verify the model server is running.
- Open `http://MODEL_IP:1234/v1/models` from the backend computer.
- Check the LAN IP, firewall, and API key.
- Confirm `OPENAI_BASE_URL` ends in `/v1`.

### The configured model is not found

Read `GET /v1/models` and copy the returned `id` exactly into `OPENAI_MODEL`.

### Supabase reports Row Level Security errors

The backend received a publishable key. Replace it with **secret key (default)** from the project's API Keys page. Never put that secret in frontend code.
