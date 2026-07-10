"""Load LEVELS and reload automatically when levels.py changes on disk."""

from __future__ import annotations

import importlib
from pathlib import Path

import levels as _levels_module

_LEVELS_PATH = Path(__file__).resolve().parent / "levels.py"
_last_mtime: float | None = None


def _maybe_reload() -> None:
    global _last_mtime
    try:
        mtime = _LEVELS_PATH.stat().st_mtime
    except OSError:
        return
    if _last_mtime is None or mtime != _last_mtime:
        importlib.reload(_levels_module)
        _last_mtime = mtime


def get_levels() -> dict:
    _maybe_reload()
    return _levels_module.LEVELS


def get_critical_words() -> set[str]:
    _maybe_reload()
    return _levels_module.CRITICAL_WORDS


def get_target_words(mode: str) -> list[str]:
    _maybe_reload()
    level = _levels_module.LEVELS.get(mode) or {}
    words = level.get("target_words") or []
    return [str(w).lower() for w in words]


def get_constants() -> dict:
    _maybe_reload()
    return {
        "MAX_PRACTICE_WORDS": _levels_module.MAX_PRACTICE_WORDS,
        "PASS_THRESHOLD": _levels_module.PASS_THRESHOLD,
        "PRACTICE_WORD_MAX_SECONDS": _levels_module.PRACTICE_WORD_MAX_SECONDS,
        "PASSAGE_MAX_SECONDS": _levels_module.PASSAGE_MAX_SECONDS,
    }
