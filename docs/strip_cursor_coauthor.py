"""
Strip 'Co-authored-by: Cursor' from recent commit messages.

GitHub shows Cursor as a collaborator because of that trailer — not because
of any Cursor files in the repo.

Run from repo root (you push yourself afterward):

    python docs/strip_cursor_coauthor.py
    git push --force-with-lease origin main

Only rewrites commits that contain the Cursor co-author line.
"""

from __future__ import annotations

import subprocess
import sys


MARKER = "Co-authored-by: Cursor"


def main() -> int:
    log = subprocess.check_output(
        ["git", "log", "--format=%H", "-20"],
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
    print()

    # filter-branch msg-filter: drop Cursor co-author lines
    filter_cmd = (
        r"python -c \"import sys; "
        r"print(''.join([l for l in sys.stdin "
        r"if 'Co-authored-by: Cursor' not in l]).rstrip() + chr(10))\""
    )

    # Use git filter-branch from parent of oldest commit
    parent = subprocess.check_output(
        ["git", "rev-parse", f"{oldest}^"],
        text=True,
    ).strip()

    cmd = [
        "git",
        "filter-branch",
        "-f",
        "--msg-filter",
        (
            "python -c \"import sys; data=sys.stdin.read(); "
            "lines=[l for l in data.splitlines() if 'Co-authored-by: Cursor' not in l]; "
            "print(chr(10).join(lines).rstrip()+chr(10))\""
        ),
        f"{parent}..HEAD",
    ]

    print("Running:", " ".join(cmd[:5]), "...")
    result = subprocess.run(cmd)
    if result.returncode != 0:
        print("filter-branch failed.", file=sys.stderr)
        return result.returncode

    print()
    print("Done. Verify with:  git log -5")
    print("Then push:          git push --force-with-lease origin main")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
