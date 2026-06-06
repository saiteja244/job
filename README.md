# AI Career Assistant

Resume analysis, JD matching, mock interviews, and a **voice coach** (short spoken answers).

## Stack

| Part | Deploy on |
|------|-----------|
| Frontend (React + Vite) | [Vercel](https://vercel.com) |
| Backend (Flask) | [Render](https://render.com) |
| Text AI | Google Gemini |
| Voice | Sarvam AI (STT + TTS) |

## Local development

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux
pip install -r requirements.txt
cp .env.example .env           # add GEMINI_API_KEY, SARVAM_API_KEY
python app.py
```

Runs at `http://localhost:5000`.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:5173` (API proxied to backend).

---

## Deploy backend on Render

1. Push this repo to GitHub.
2. [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint** (or **Web Service**).
3. Connect the repo.
4. Settings:
   - **Root Directory:** `backend`
   - **Runtime:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn app:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120`
   - **Health Check Path:** `/health`

   Or use the included `backend/render.yaml` with **New Blueprint**.

5. **Environment variables** (Render → Environment):

   | Key | Value |
   |-----|--------|
   | `GEMINI_API_KEY` | your key |
   | `SARVAM_API_KEY` | your key |
   | `CORS_ORIGINS` | `https://your-app.vercel.app` (optional; `*.vercel.app` is allowed by default) |
   | `FLASK_DEBUG` | `false` |

6. Deploy and copy your service URL, e.g. `https://ai-career-backend.onrender.com`.

> Free Render services sleep after inactivity; first request may take ~30s to wake.

---

## Deploy frontend on Vercel

1. [Vercel Dashboard](https://vercel.com/new) → import the same GitHub repo.
2. **Root Directory:** `frontend`
3. **Framework Preset:** Vite (auto-detected)
4. **Environment variables** (Production + Preview):

   | Key | Value |
   |-----|--------|
   | `VITE_API_URL` | `https://YOUR-RENDER-SERVICE.onrender.com/api` |

5. Deploy.

`vercel.json` is included for SPA routing. All `*.vercel.app` origins are allowed on the backend for preview deployments.

---

## AI response length

- **Live mode:** click **Start live conversation** — no stop button between turns; ~1s pause after you speak triggers the reply; mic re-opens as soon as the AI finishes (you can also interrupt by speaking over it)
- **Your voice input:** any length — full message is transcribed
- **Voice assistant reply:** answers **only your specific question** (~75 words / ~30 sec audio)
- **Resume / JD / feedback:** short bullet summaries on screen

Tune voice reply length in `backend/.env`:

```env
VOICE_MAX_WORDS=75
TTS_MAX_WORDS=75
```

---

## API routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/upload-resume` | PDF upload + brief analysis |
| POST | `/api/compare-jd` | Short JD vs resume match |
| POST | `/api/generate-questions` | 5 interview questions |
| POST | `/api/final-feedback` | Short interview scorecard |
| POST | `/api/voice-chat` | Voice coach (brief reply + audio) |
| POST | `/api/clear-chat` | Clear voice chat history |
| GET | `/health` | Health check |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `contentscript.js` / MaxListeners warnings | Browser extension noise (e.g. wallet). Safe to ignore, or test in Incognito |
| `500` on resume / voice | Kill stale Flask on port 5000 (`backend/start.ps1`), set `GEMINI_MODEL=gemini-flash-lite-latest`, check http://localhost:5000/health shows `"version":"2.0"` |
| `400` speech not recognized | Speak 2+ seconds clearly; check `SARVAM_API_KEY` |
| Audio cuts off mid-sentence | Fixed: mic no longer interrupts AI playback; restart frontend |
| CORS error on Vercel | Set `VITE_API_URL` to Render URL ending in `/api` |
| Render cold start | Wait ~30s after idle; upgrade plan or use a ping cron |
| JD analyzer error | Upload resume first |
| Empty PDF text | Use a text-based PDF, not a scan-only image |

### Required env vars (Render)

```
GEMINI_API_KEY=...
SARVAM_API_KEY=...
GEMINI_MODEL=gemini-2.0-flash
CORS_ORIGINS=https://your-app.vercel.app
```
