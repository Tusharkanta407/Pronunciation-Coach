# Pronunciation Coach

AI-assisted English pronunciation practice — record or upload speech, get a score, see where you went off, and drill the hard words.

**Live app:** [https://pronunciation-coach.vercel.app](https://pronunciation-coach.vercel.app)  
**API health:** [https://pronunciation-coach-api.onrender.com/health](https://pronunciation-coach-api.onrender.com/health)

---

## What it does

1. **Consent** — short DPDP-style notice before anything is recorded  
2. **Read Passage** — read a scripted paragraph aloud  
3. **Free Speech** — talk about yourself naturally  
4. **Jam (Just a Minute)** — speak on a random topic for at least 60 seconds  
5. **Practice** — listen to the target word (TTS), re-record, verify  

You get an overall score, highlighted mistakes, and a small practice list (not an endless wall of errors).

---

## Stack

| Layer | Tech |
|--------|------|
| Frontend | Next.js (App Router), React, Tailwind — **Vercel** |
| Backend | FastAPI, ffmpeg/pydub — **Render** (Docker) |
| Speech-to-text | Groq `whisper-large-v3` (word timestamps + confidence) |
| Phonetics | `g2p-en` + RapidFuzz |
| Practice audio | edge-tts |
| Optional tip | OpenRouter LLM (scoring works without it) |

Frontend proxies `/api/*` to the backend via Next.js rewrites (`API_PROXY_TARGET`), so the browser stays same-origin.

---

## How scoring works (short version)

- **Scripted round:** align expected words ↔ STT words. Score mixes text match, phoneme distance, and Whisper confidence. Unspoken words count as 0.  
- **Trap words** (e.g. *island*, *comfortable*): if STT hears a known mis-sounding, flag as `wrong_sound` with a tip.  
- **Free / Jam:** no forced passage — flag mumbled / low-confidence words; Jam also flags repeats and stuttery loops.  
- **Long audio:** Whisper is chunked (~24s windows) so a 50–75s recording doesn’t truncate or hallucinate the ending.

This is a practical coach, not a lab phoneme lab. Architecture notes: `docs/System_Architecture.docx` (regenerate with `python docs/generate_architecture_doc.py`).

---

## Local setup

### Backend

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Copy `backend/.env.example` → `backend/.env` and set:

```env
GROQ_API_KEY=gsk_...
OPENROUTER_API_KEY=   # optional
CORS_ORIGIN=http://localhost:3000
```

You need **ffmpeg** on PATH (or set `FFMPEG_PATH`). Then:

```bash
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
# from repo root
npm install
```

Copy `.env.local.example` → `.env.local` (defaults are fine for local):

```env
API_PROXY_TARGET=http://127.0.0.1:8000
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deploy

| Service | Root | Notes |
|---------|------|--------|
| **Render** | `backend/` | Docker (`Dockerfile` installs ffmpeg + NLTK data). Env: `GROQ_API_KEY`, `CORS_ORIGIN` = Vercel URL |
| **Vercel** | repo root | Env: `API_PROXY_TARGET` = `https://your-api.onrender.com` (no trailing slash) |

`render.yaml` is included for a Blueprint deploy.

---

## Privacy (DPDP-oriented)

- No login, name, or email  
- Audio is processed in memory for the request — not saved to disk / S3  
- Sessions live in memory (~24h idle purge); Restart / `DELETE /api/session` clears sooner  
- Consent screen before recording  

Details are in the in-app notice and the architecture doc.

---

## Repo layout

```
├── app/                 # Next.js pages
├── components/          # UI
├── lib/                 # API client, levels, consent copy
├── backend/             # FastAPI + scoring
├── docs/                # Architecture doc + generator
├── render.yaml
└── Task.md              # Assignment brief
```

---

## Scripts

```bash
npm run lint          # tsc --noEmit
npm run build         # Next production build
python docs/generate_architecture_doc.py   # needs: pip install python-docx
```

---

Built for the Livo AI SWE assessment — ship something real, explain the trade-offs.
