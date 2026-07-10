"""
Strip 'Co-authored-by: Cursor' from recent commit messages (Windows-safe).

GitHub shows Cursor as collaborator because of that trailer — not Cursor files.

Usage (from repo root):
    set FILTER_BRANCH_SQUELCH_WARNING=1
    python docs/strip_cursor_coauthor.py
    git log -5
    git push --force-with-lease origin main
"""

from __future__ import annotations

import os
import subprocess
import sys
import tempfile
from pathlib import Path


MARKER = "Co-authored-by: Cursor"


def main() -> int:
    log = subprocess.check_output(
        ["git", "log", "--format=%H", "-30"],
        text=True,
    ).strip().splitlines()

    to_fix: list[str] = []
    for sha in log:
        body = subprocess.check_output(
            ["git", "log", "-1", "--format=%B", sha],
            text=True,
        )
        if MARKER in body:
            to_fix.append(sha)

    if not to_fix:
        print("No Cursor co-author trailers found. Nothing to do.")
        return 0

    oldest = to_fix[-1]
    print(f"Found {len(to_fix)} commit(s) with Cursor co-author.")
    print(f"Rewriting from {oldest[:8]}..HEAD")

    # Write a tiny msg-filter script to a temp file (avoids quoting hell on Windows)
    filter_py = Path(tempfile.gettempdir()) / "git_msg_filter_strip_cursor.py"
    filter_py.write_text(
        "import sys\n"
        "data = sys.stdin.read()\n"
        "lines = [l for l in data.splitlines() if 'Co-authored-by: Cursor' not in l]\n"
        "sys.stdout.write('\\n'.join(lines).rstrip() + '\\n')\n",
        encoding="utf-8",
    )

    parent = subprocess.check_output(
        ["git", "rev-parse", f"{oldest}^"],
        text=True,
    ).strip()

    env = os.environ.copy()
    env["FILTER_BRANCH_SQUELCH_WARNING"] = "1"

    cmd = [
        "git",
        "filter-branch",
        "-f",
        "--msg-filter",
        f'python "{filter_py}"',
        f"{parent}..HEAD",
    ]

    print("Running filter-branch (no prompt)...")
    result = subprocess.run(cmd, env=env)
    if result.returncode != 0:
        print("filter-branch failed.", file=sys.stderr)
        return result.returncode

    # Show result
    print()
    print("Recent messages:")
    subprocess.run(["git", "log", "-5", "--format=%h %s%n%b%n---"])
    print()
    print("If Cursor lines are gone, push with:")
    print("  git push --force-with-lease origin main")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
