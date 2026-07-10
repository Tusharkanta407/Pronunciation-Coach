import io
import os
from pathlib import Path

import ffmpeg_bootstrap  # noqa: F401 — must run before pydub

from pydub import AudioSegment

PASSAGE_MAX_SECONDS = 60
PRACTICE_MAX_SECONDS = 10
MIN_PASSAGE_SECONDS = 3
MIN_PRACTICE_SECONDS = 1

_SUPPORTED = {"wav", "mp3", "ogg", "webm", "m4a", "flac", "mp4", "opus"}

if ffmpeg_bootstrap.FFMPEG_BIN:
    AudioSegment.converter = ffmpeg_bootstrap.FFMPEG_BIN
    _ffprobe = str(Path(ffmpeg_bootstrap.FFMPEG_BIN).with_name("ffprobe.exe"))
    if Path(_ffprobe).exists():
        AudioSegment.ffprobe = _ffprobe


def _guess_format(filename: str, data: bytes) -> str:
    ext = os.path.splitext(filename or "")[1].lower().lstrip(".")
    if ext in _SUPPORTED:
        return ext
    if data[:4] == b"\x1aE\xdf\xa3":
        return "webm"
    if data[:3] == b"ID3" or data[:2] == b"\xff\xfb":
        return "mp3"
    if data[:4] == b"RIFF":
        return "wav"
    return "webm"


def _load_audio(data: bytes, filename: str) -> AudioSegment:
    if not data:
        raise ValueError("Empty audio file.")

    fmt = _guess_format(filename, data)
    errors: list[str] = []

    for attempt in [fmt, "webm", "ogg", "mp4", "wav"]:
        try:
            return AudioSegment.from_file(io.BytesIO(data), format=attempt)
        except Exception as exc:
            errors.append(f"{attempt}: {exc}")

    hint = (
        f"ffmpeg at {ffmpeg_bootstrap.FFMPEG_BIN}"
        if ffmpeg_bootstrap.FFMPEG_BIN
        else "ffmpeg not found — set FFMPEG_PATH in backend/.env"
    )
    raise ValueError(f"Could not decode audio ({hint}). Tried: {'; '.join(errors[:2])}")


def get_audio_duration_seconds(data: bytes, filename: str) -> float:
    audio = _load_audio(data, filename)
    return len(audio) / 1000.0


def validate_passage_audio(
    data: bytes,
    filename: str,
    *,
    min_seconds: float | None = None,
    max_seconds: float | None = None,
) -> tuple[bool, str, float]:
    try:
        duration = get_audio_duration_seconds(data, filename)
    except Exception as exc:
        return False, f"Could not read audio file: {exc}", 0.0

    lo = MIN_PASSAGE_SECONDS if min_seconds is None else min_seconds
    hi = PASSAGE_MAX_SECONDS if max_seconds is None else max_seconds

    if duration < lo:
        if lo >= 60:
            return (
                False,
                f"Recording too short ({duration:.1f}s). Jam requires at least {int(lo)} seconds — keep talking.",
                duration,
            )
        return False, f"Audio too short ({duration:.1f}s).", duration
    if duration > hi:
        return False, f"Audio too long ({duration:.1f}s). Maximum is {int(hi)}s.", duration
    return True, "", duration


def validate_practice_audio(data: bytes, filename: str) -> tuple[bool, str, float]:
    try:
        duration = get_audio_duration_seconds(data, filename)
    except Exception as exc:
        return False, f"Could not read audio file: {exc}", 0.0

    if duration < MIN_PRACTICE_SECONDS:
        return False, f"Clip too short ({duration:.1f}s).", duration
    if duration > PRACTICE_MAX_SECONDS:
        return (
            False,
            f"Clip too long ({duration:.1f}s). Maximum is {PRACTICE_MAX_SECONDS}s for practice.",
            duration,
        )
    return True, "", duration


def to_wav_bytes(data: bytes, filename: str) -> bytes:
    audio = _load_audio(data, filename)
    audio = audio.set_frame_rate(16000).set_channels(1)
    buf = io.BytesIO()
    audio.export(buf, format="wav")
    return buf.getvalue()
