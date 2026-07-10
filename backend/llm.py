def _one_sentence_feedback(score: float, mistakes: list[dict], pauses: list[dict], *, guided: bool = False) -> str:
    issue_count = len(mistakes) + len(pauses)
    if issue_count == 0:
        return f"Strong {'sharing' if guided else 'reading'} at {score}% — no major mistakes detected."
    top = mistakes[0].get("word", "") if mistakes else ""
    if top and top.lower() not in {"introduction", "speech", "ending"}:
        return f"{score}% — {issue_count} issue(s) found; start by fixing '{top}' in practice."
    if pauses:
        return f"{score}% — good effort; try to keep a steady pace with fewer long pauses."
    return f"{score}% — {issue_count} note(s) below; overall you were understood well."


async def generate_feedback(
    *,
    mode: str,
    score: float,
    transcript: str,
    mistakes: list[dict],
    pauses: list[dict],
    stats: dict,
) -> str:
    # One sentence only — details live in highlightedMistakes / pauses UI (no LLM tokens).
    return _one_sentence_feedback(score, mistakes, pauses, guided=mode in {"free-speech", "just-a-minute"})
