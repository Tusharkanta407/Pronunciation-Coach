import os
from typing import Optional

from dotenv import load_dotenv

load_dotenv(override=True)  # before local imports so FFMPEG_PATH is available

import ffmpeg_bootstrap  # noqa: F401
from config import groq_api_key
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel

from audio_utils import to_wav_bytes, validate_passage_audio, validate_practice_audio
from level_loader import get_constants, get_levels, get_target_words
from llm import generate_feedback
from pronunciation import (
    build_analysis,
    build_metrics,
    format_mistakes,
    pick_practice_words,
    transcribe_audio,
    verify_word,
)
from session import store
from tts import generate_pronunciation_audio

app = FastAPI(title="Livo Assistant API", version="1.0.0")


@app.exception_handler(Exception)
async def unhandled_exception_handler(_request: Request, exc: Exception) -> JSONResponse:
    """Always return JSON errors — never a blank 'Internal Server Error'."""
    if isinstance(exc, HTTPException):
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
    return JSONResponse(status_code=500, content={"detail": f"Server error: {exc}"})


def _cors_origins() -> list[str]:
    origins = {
        os.getenv("CORS_ORIGIN", "http://localhost:3000"),
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    }
    for part in os.getenv("CORS_ORIGINS", "").split(","):
        part = part.strip()
        if part:
            origins.add(part)
    return sorted(origins)


app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SessionCreate(BaseModel):
    consent: bool = True


@app.get("/health")
async def health():
    key = groq_api_key()
    levels = get_levels()
    ref = levels["read-passage"]["reference"]
    return {
        "status": "ok",
        "ffmpeg": ffmpeg_bootstrap.FFMPEG_BIN or "not found",
        "groq_key": f"{key[:8]}..." if key.startswith("gsk_") else "missing or invalid",
        "passage_starts": ref[:50],
    }


@app.post("/api/session")
async def create_session(body: SessionCreate):
    if not body.consent:
        raise HTTPException(400, "Consent is required to start the assessment.")
    session = store.create(consent=True)
    return {"session_id": session.id, "consent_given": True}


@app.get("/api/session/{session_id}")
async def get_session(session_id: str):
    session = store.get(session_id)
    if not session:
        raise HTTPException(404, "Session not found or expired.")
    return session.to_dict()


@app.delete("/api/session/{session_id}")
async def delete_session(session_id: str):
    deleted = store.delete(session_id)
    if not deleted:
        raise HTTPException(404, "Session not found.")
    return {"deleted": True}


@app.get("/api/levels/{mode}")
async def get_level(mode: str):
    levels = get_levels()
    if mode not in levels:
        raise HTTPException(404, f"Unknown mode: {mode}")
    level = levels[mode]
    return {
        "mode": mode,
        "title": level["title"],
        "instruction": level["instruction"],
        "content": level["reference"],
        "type": level["type"],
    }


@app.get("/api/pronounce/{word}")
async def pronounce_word(word: str):
    if not word.strip():
        raise HTTPException(400, "Word is required.")
    try:
        audio = await generate_pronunciation_audio(word.strip())
    except Exception as e:
        raise HTTPException(503, f"Reference audio unavailable: {e}") from e
    if not audio:
        raise HTTPException(503, "Reference audio unavailable (empty response).")
    return Response(content=audio, media_type="audio/mpeg")


@app.post("/api/analyze")
async def analyze_audio(
    session_id: str = Form(...),
    mode: str = Form(...),
    audio: UploadFile = File(...),
):
    session = store.get(session_id)
    if not session:
        raise HTTPException(404, "Session not found or expired.")
    if not session.consent_given:
        raise HTTPException(403, "Consent not given for this session.")

    if mode not in get_levels():
        raise HTTPException(400, f"Unknown mode: {mode}")

    raw = await audio.read()
    filename = audio.filename or "recording.webm"

    levels = get_levels()
    level = levels[mode]

    ok, err, duration = validate_passage_audio(
        raw,
        filename,
        min_seconds=level.get("min_seconds"),
        max_seconds=level.get("max_seconds"),
    )
    if not ok:
        raise HTTPException(400, err)

    reference = level["reference"]
    level_type = level["type"]
    guided = level_type in {"guided", "jam"}
    jam = level_type == "jam"

    try:
        wav = to_wav_bytes(raw, filename)
        transcription = await transcribe_audio(wav, reference=reference, guided=guided)
    except RuntimeError as e:
        raise HTTPException(500, str(e)) from e
    except Exception as e:
        raise HTTPException(500, f"Transcription failed: {e}") from e

    transcript = transcription.text

    try:
        score, all_mistakes, pauses, stats = build_analysis(
            reference,
            transcription,
            guided=guided,
            jam=jam,
            target_words=get_target_words(mode),
        )
    except Exception as e:
        raise HTTPException(500, f"Analysis failed: {e}") from e

    highlighted_mistakes = format_mistakes(all_mistakes)
    practice_words = pick_practice_words(
        all_mistakes, get_constants()["MAX_PRACTICE_WORDS"], guided=guided, jam=jam
    )
    feedback = await generate_feedback(
        mode=mode,
        score=score,
        transcript=transcript,
        mistakes=highlighted_mistakes,
        pauses=pauses,
        stats=stats,
    )

    result = {
        "mode": mode,
        "overallScore": score,
        "metrics": build_metrics(score, stats),
        "feedback": feedback,
        "transcript": transcript,
        "highlightedMistakes": highlighted_mistakes,
        "pauses": pauses,
        "stats": stats,
        "wordsToImprove": practice_words,
        "duration": round(duration, 1),
    }

    session.mode_results[mode] = result
    session.practice_cleared[mode] = []
    return result


@app.post("/api/verify-word")
async def verify_word_endpoint(
    session_id: str = Form(...),
    mode: str = Form(...),
    word: str = Form(...),
    audio: UploadFile = File(...),
):
    session = store.get(session_id)
    if not session:
        raise HTTPException(404, "Session not found or expired.")
    if not session.consent_given:
        raise HTTPException(403, "Consent not given.")

    raw = await audio.read()
    filename = audio.filename or "practice.webm"

    ok, err, _ = validate_practice_audio(raw, filename)
    if not ok:
        raise HTTPException(400, err)

    try:
        wav = to_wav_bytes(raw, filename)
        transcription = await transcribe_audio(wav, reference=word)
        transcript = transcription.text
    except RuntimeError as e:
        raise HTTPException(500, str(e)) from e
    except Exception as e:
        raise HTTPException(500, f"Verification failed: {e}") from e

    passed, match_score, heard = verify_word(word, transcript)

    if passed:
        cleared = session.practice_cleared.setdefault(mode, [])
        if word not in cleared:
            cleared.append(word)

        stored = session.mode_results.get(mode)
        if stored:
            for item in stored.get("wordsToImprove", []):
                if item["word"].lower() == word.lower():
                    item["cleared"] = True
            for item in stored.get("highlightedMistakes", []):
                if item["word"].lower() == word.lower():
                    item["cleared"] = True

    return {
        "passed": passed,
        "score": match_score,
        "heard": heard,
        "word": word,
    }
