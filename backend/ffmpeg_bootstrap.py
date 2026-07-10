"""Must run before pydub is imported anywhere."""

import os
import shutil
import warnings
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(override=True)

FFMPEG_BIN: str | None = None


def find_ffmpeg() -> str | None:
    env_path = os.getenv("FFMPEG_PATH", "").strip().strip('"')
    if env_path and Path(env_path).exists():
        return env_path

    found = shutil.which("ffmpeg")
    if found:
        return found

    local = os.environ.get("LOCALAPPDATA", "")
    if local:
        winget_root = Path(local) / "Microsoft" / "WinGet" / "Packages"
        if winget_root.exists():
            for pkg in winget_root.glob("Gyan.FFmpeg*"):
                for exe in pkg.rglob("ffmpeg.exe"):
                    return str(exe)

    return None


def bootstrap() -> str | None:
    global FFMPEG_BIN
    ffmpeg = find_ffmpeg()
    if not ffmpeg:
        return None

    FFMPEG_BIN = ffmpeg
    bin_dir = str(Path(ffmpeg).parent)
    os.environ["PATH"] = bin_dir + os.pathsep + os.environ.get("PATH", "")
    os.environ["FFMPEG_PATH"] = ffmpeg
    return ffmpeg


bootstrap()

# Suppress pydub's import-time warning if we already located ffmpeg
if FFMPEG_BIN:
    warnings.filterwarnings(
        "ignore",
        message="Couldn't find ffmpeg or avconv",
        category=RuntimeWarning,
        module="pydub.utils",
    )
