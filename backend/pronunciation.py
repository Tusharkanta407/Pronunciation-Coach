import asyncio
import io
import re
from dataclasses import dataclass
from typing import Optional

import httpx
from g2p_en import G2p
from rapidfuzz import fuzz

from config import groq_api_key
from level_loader import get_constants, get_critical_words

# Whisper is most reliable on <=30s windows. Longer audio is split into
# overlapping chunks so a hallucination in one part can't drop the rest.
_STT_SINGLE_LIMIT_MS = 30_000
_STT_CHUNK_MS = 24_000
_STT_CHUNK_STEP_MS = 21_000  # ~3s overlap between consecutive chunks


def _max_practice_words() -> int:
    return get_constants()["MAX_PRACTICE_WORDS"]


def _pass_threshold() -> float:
    return get_constants()["PASS_THRESHOLD"]


def _ensure_nltk_data() -> None:
    """g2p-en needs these taggers; download once if the image missed them."""
    import nltk

    checks = (
        ("averaged_perceptron_tagger_eng", "taggers/averaged_perceptron_tagger_eng"),
        ("averaged_perceptron_tagger", "taggers/averaged_perceptron_tagger"),
        ("cmudict", "corpora/cmudict"),
        ("punkt", "tokenizers/punkt"),
        ("punkt_tab", "tokenizers/punkt_tab"),
    )
    for pkg, path in checks:
        try:
            nltk.data.find(path)
        except LookupError:
            nltk.download(pkg, quiet=True)


_ensure_nltk_data()
_g2p = G2p()
_WORD_RE = re.compile(r"[a-zA-Z']+")
_SKIP_WORDS = {
    "the", "a", "an", "is", "are", "was", "were", "to", "of", "in", "and", "or",
    "i", "my", "with", "for", "on", "at", "by", "as", "it", "be", "we", "you",
    "he", "she", "they", "this", "that", "from", "when", "how", "his", "her",
    "our", "me", "him", "them", "us", "so", "if", "but", "not", "no", "yes",
    "do", "did", "does", "have", "has", "had", "will", "can", "could", "would",
    "should", "may", "than", "then", "too", "very", "just", "also", "into",
    "every", "more", "own", "day", "lot", "way",
}

# Whisper often mis-hears these as each other during single-word practice
_STT_VERIFY_ALIASES: dict[str, set[str]] = {
    "with": {"wait", "wit", "width", "whith"},
    "wait": {"with", "white", "weight"},
    "fresh": {"phrase", "flesh", "press"},
    "phrase": {"fresh"},
    "aloud": {"allowed", "a loud", "loud"},
    "three": {"free", "tree"},
    "free": {"three"},
    "think": {"thing", "sink"},
    "thing": {"think", "sing"},
    "then": {"than", "them"},
    "than": {"then"},
    "them": {"then", "him"},
    "through": {"threw", "true"},
    "threw": {"through"},
    "weather": {"whether"},
    "whether": {"weather"},
    "peace": {"piece"},
    "piece": {"peace"},
    "read": {"red"},
    "red": {"read"},
    "one": {"won"},
    "won": {"one"},
    "two": {"to", "too"},
    "too": {"to", "two"},
    "to": {"too", "two"},
    "our": {"are", "hour"},
    "hour": {"our", "are"},
    "are": {"our", "hour", "r"},
}

MISTAKE_SIMILARITY = 88
CRITICAL_SIMILARITY = 93
LOW_CONFIDENCE = 72
VERIFY_PASS_SCORE = 82
PAUSE_GAP_SECONDS = 0.9
_META_PRACTICE_WORDS = {"introduction", "speech", "ending", "transcription"}

# Pronunciation traps: words whose spelling does not match their sound.
# When STT hears a listed "confusion" instead of the target word, the learner
# almost certainly mispronounced it (silent letter, wrong vowel, or homophone).
# `confidence_floor` — even if the correct word is heard, flag it as unclear
# when Whisper's confidence stays below this (the sound was borderline).
PRONUNCIATION_TRAPS: dict[str, dict] = {
    # NOTE: only traps where correct speech → STT usually writes the right word.
    # Skip near-homophones (whether/weather, castle/casual) — correct speech
    # still fails practice forever.
    "island": {
        "confusions": {"iland", "ireland", "highland", "isle", "izland", "aisland"},
        "tip": "The 's' is silent: say 'EYE-land'.",
        "confidence_floor": 75,
    },
    "comfortable": {
        "confusions": {"comftable", "confortable", "comfterble", "comfortabl", "comfterbal", "comfort"},
        "tip": "Four smooth beats: 'KUMF-ter-buh-bul' — don't drop syllables.",
        "confidence_floor": 76,
    },
}


def _trap_tip(expected: str, heard: Optional[str]) -> Optional[str]:
    """Return a coaching tip when `heard` is a known mispronunciation of `expected`."""
    trap = PRONUNCIATION_TRAPS.get(expected.lower())
    if not trap:
        return None
    if heard is not None and heard.lower() in trap["confusions"]:
        return trap["tip"]
    return None


def _is_trap_confusion(expected: str, heard: Optional[str]) -> bool:
    return _trap_tip(expected, heard) is not None


@dataclass
class WordToken:
    text: str
    confidence: float
    start: float = 0.0
    end: float = 0.0


@dataclass
class TranscriptionResult:
    text: str
    words: list[WordToken]
    raw_text: str = ""


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.lower().strip())


def _tokenize(text: str) -> list[str]:
    return [w.lower() for w in _WORD_RE.findall(text)]


def _split_sentences(text: str) -> list[str]:
    parts = re.split(r"[.!?]+", _normalize(text))
    return [p.strip() for p in parts if len(p.strip()) >= 8]


def _content_set(words: list[str]) -> set[str]:
    return {w for w in words if w not in _SKIP_WORDS and len(w) > 3}


def _sentence_overlap(a: str, b: str) -> float:
    """How much of sentence a's content words appear in sentence b."""
    wa, wb = _content_set(_tokenize(a)), _content_set(_tokenize(b))
    if not wa:
        return float(fuzz.token_set_ratio(a, b)) / 100.0
    return len(wa & wb) / len(wa)


def _trim_to_reference_coverage(transcript: str, reference: str) -> tuple[str, bool]:
    """Keep only transcript sentences that still match the passage.

    Drops Whisper hallucinations / paraphrases at the end (repeats OR invented endings).
    Returns (cleaned_transcript, was_trimmed).
    """
    if not reference or not transcript:
        return transcript, False

    ref_sents = _split_sentences(reference)
    heard_sents = _split_sentences(transcript)
    if not ref_sents or not heard_sents:
        return transcript, False

    # Also drop exact/near repeats of earlier heard sentences
    deduped: list[str] = []
    for hs in heard_sents:
        if any(fuzz.ratio(hs, prev) >= 85 for prev in deduped):
            continue
        deduped.append(hs)
    heard_sents = deduped

    kept: list[str] = []
    ri = 0
    for hs in heard_sents:
        best_j, best_ov = -1, 0.0
        for j in range(ri, len(ref_sents)):
            ov = max(
                _sentence_overlap(hs, ref_sents[j]),
                _sentence_overlap(ref_sents[j], hs),
                fuzz.token_set_ratio(hs, ref_sents[j]) / 100.0,
            )
            if ov > best_ov:
                best_ov, best_j = ov, j
        # Must look like a real passage sentence — not invented filler
        if best_ov >= 0.45 and best_j >= 0:
            kept.append(hs)
            ri = best_j + 1
        elif kept:
            # Diverged after matching some of the passage — stop
            break
        # If nothing kept yet and first sentence is weak, still keep trying
        # (leading noise); only break once we had a match then diverged.

    if not kept:
        return transcript, False

    cleaned = ". ".join(kept)
    was_trimmed = len(kept) < len(heard_sents) or len(_tokenize(cleaned)) + 5 < len(
        _tokenize(transcript)
    )
    return cleaned, was_trimmed


def _fix_transcript_with_reference(transcript: str, reference: str) -> str:
    cleaned, _ = _trim_to_reference_coverage(transcript, reference)
    return cleaned


def _phonemes(word: str) -> str:
    phones = _g2p(word.lower())
    return " ".join(p for p in phones if p not in {" ", ""})


def _phoneme_similarity(a: str, b: str) -> float:
    if not a or not b:
        return 0.0
    return float(fuzz.ratio(a, b))


def _word_similarity(expected: str, heard: str) -> float:
    return max(
        float(fuzz.ratio(expected.lower(), heard.lower())),
        _phoneme_similarity(_phonemes(expected), _phonemes(heard)),
    )


def _logprob_to_confidence(logprob: float) -> float:
    return max(0.0, min(100.0, (logprob + 0.6) * 125))


def _best_transcript_text(data: dict) -> str:
    """Pick the fullest transcript Groq returned (text vs segments)."""
    candidates = [_normalize(data.get("text", ""))]
    segments = data.get("segments") or []
    if segments:
        candidates.append(_normalize(" ".join(str(s.get("text", "")).strip() for s in segments)))
    return max(candidates, key=lambda t: len(_tokenize(t))) if any(candidates) else ""


def _tokens_from_text(text: str, duration: float = 0.0) -> list[WordToken]:
    """Build word tokens from full transcript when API word timestamps are incomplete."""
    words = _tokenize(text)
    if not words:
        return []
    if duration <= 0:
        duration = max(1.0, len(words) * 0.35)
    step = duration / len(words)
    return [
        WordToken(text=w, confidence=82.0, start=i * step, end=(i + 1) * step)
        for i, w in enumerate(words)
    ]


def _build_word_tokens(text: str, raw_words: list, segments: list) -> list[WordToken]:
    tokens: list[WordToken] = []
    if raw_words:
        for item in raw_words:
            raw = str(item.get("word", "")).strip()
            clean = raw.lower().strip(".,!?;:\"'")
            if not clean:
                continue
            start = float(item.get("start", 0))
            end = float(item.get("end", start))
            conf = 75.0
            for seg in segments:
                if float(seg.get("start", 0)) <= start <= float(seg.get("end", 0)):
                    conf = _logprob_to_confidence(float(seg.get("avg_logprob", -0.25)))
                    break
            tokens.append(WordToken(text=clean, confidence=conf, start=start, end=end))

    text_words = _tokenize(text)
    # Groq sometimes returns full text but truncated word timestamps — use full text
    if len(text_words) > len(tokens) + 2:
        duration = tokens[-1].end if tokens else 0.0
        if segments:
            duration = max(duration, float(segments[-1].get("end", duration)))
        return _tokens_from_text(text, duration)

    if tokens:
        return tokens
    return _tokens_from_text(text)


_STT_PHRASE_FIXES = [
    # Only fix Whisper token-merge glitches — never rewrite meaning
    (re.compile(r"\bworld[- ]?like\b", re.I), "words like"),
    (re.compile(r"\bword like\b", re.I), "words like"),
    (re.compile(r"\bwords likes\b", re.I), "words like"),
]
_WORDS_LIKE_RE = re.compile(r"^world[- ]?like$|^word[- ]?like$|^words[- ]?like$", re.I)
_GOOD_MATCH = 85  # at or above = pronounced fine, do not flag


def _fix_stt_text(text: str) -> str:
    """Fix common Whisper mis-hearings for scripted read-aloud."""
    fixed = text
    for pattern, replacement in _STT_PHRASE_FIXES:
        fixed = pattern.sub(replacement, fixed)
    return _normalize(fixed)


def _dedupe_repeated_spans(words: list[str]) -> list[str]:
    """Remove mid-transcript Whisper loops (same 6+ word span appearing twice).

    Example: '...mispronounce by reading a lot of words extra attention...mispronounce
    by reading aloud...' → drop the duplicated 'extra attention...mispronounce' loop.
    """
    out = list(words)
    changed = True
    while changed and len(out) >= 12:
        changed = False
        n = len(out)
        for span in range(min(22, n // 2), 5, -1):
            found = False
            for i in range(0, n - 2 * span + 1):
                chunk = out[i : i + span]
                # Search a window after the first span for the same chunk
                for j in range(i + span, min(i + span + 28, n - span + 1)):
                    if out[j : j + span] == chunk:
                        # Keep first copy; drop the duplicate (and short junk before it)
                        out = out[:j] + out[j + span :]
                        changed = True
                        found = True
                        break
                if found:
                    break
            if found:
                break
    return out


def _resync_heard_index(
    exp: str,
    heard_pairs: list[tuple[str, float]],
    hi: int,
    window: int = 18,
) -> Optional[tuple[int, str, float, float]]:
    """Find exp further ahead in heard (jump over STT hallucination gaps)."""
    best_j, best_sim, best_hw, best_conf = -1, -1.0, "", 0.0
    for j in range(hi, min(hi + window, len(heard_pairs))):
        hw, conf = heard_pairs[j]
        sim = _word_similarity(exp, hw)
        if sim > best_sim:
            best_sim, best_j, best_hw, best_conf = sim, j, hw, conf
    if best_j >= 0 and best_sim >= 78:
        return best_j, best_hw, best_sim, best_conf
    return None


def _is_words_like_variant(word: str) -> bool:
    return bool(_WORDS_LIKE_RE.match(word.lower().strip(".,;:!?")))


def _expand_heard_pairs(pairs: list[tuple[str, float]]) -> list[tuple[str, float]]:
    """Split STT tokens like 'world-like' into 'words' + 'like'."""
    expanded: list[tuple[str, float]] = []
    for word, conf in pairs:
        clean = word.lower().strip(".,;:!?\"'")
        if _is_words_like_variant(clean):
            expanded.append(("words", conf))
            expanded.append(("like", conf))
        else:
            expanded.append((clean, conf))
    return expanded


def _prepare_heard_pairs(transcript: str, word_tokens: Optional[list[WordToken]]) -> tuple[str, list[tuple[str, float]]]:
    """Normalize transcript and build word list for alignment."""
    fixed = _fix_stt_text(transcript)
    text_pairs = _expand_heard_pairs([(w, 100.0) for w in _tokenize(fixed)])
    if not word_tokens:
        return fixed, text_pairs

    expanded = _expand_heard_pairs(_heard_tokens(word_tokens))
    # Always prefer the longer representation — never drop words Whisper heard
    if len(text_pairs) >= len(expanded):
        return fixed, text_pairs
    return fixed, expanded


def _should_flag_mistake(exp: str, heard_word: Optional[str], similarity: float) -> bool:
    """Only flag real pronunciation issues — not STT alignment drift on small words."""
    if heard_word is None:
        return len(exp) > 3 and exp.lower() not in _SKIP_WORDS

    # Trap words (silent letters / homophones) are flagged even at high text
    # similarity — 'whether' vs 'weather' look almost identical to fuzzy match.
    if _is_trap_confusion(exp, heard_word):
        return True

    if similarity >= _GOOD_MATCH:
        return False

    exp_l, heard_l = exp.lower(), heard_word.lower()
    if exp_l == heard_l:
        return False

    if _is_words_like_variant(heard_word) and exp_l in {"words", "like"}:
        return False

    if _is_whisper_variant(exp, heard_word, similarity):
        return False

    # Challenge / longer content words — stricter
    if exp_l in _critical_words() or len(exp) > 6:
        return similarity < MISTAKE_SIMILARITY

    # Short function words — almost never flag (STT drops commas → false shifts)
    if exp_l in _SKIP_WORDS or len(exp) <= 3:
        return False

    return similarity < 78


def _heard_tokens(words: list[WordToken]) -> list[tuple[str, float]]:
    return [(w.text, w.confidence) for w in words if w.text.strip()]


def _align_words_dp(
    expected: list[str],
    heard: list[tuple[str, float]],
) -> list[tuple[str, Optional[str], float, float]]:
    n, m = len(expected), len(heard)
    neg = -1e9
    dp = [[neg] * (m + 1) for _ in range(n + 1)]
    back: list[list[Optional[tuple[str, int, int]]]] = [[None] * (m + 1) for _ in range(n + 1)]
    dp[0][0] = 0.0

    for i in range(n + 1):
        for j in range(m + 1):
            if i == 0 and j == 0:
                continue

            best_score = neg
            best_move: Optional[tuple[str, int, int]] = None

            if i > 0 and j > 0:
                heard_word, _conf = heard[j - 1]
                sim = _word_similarity(expected[i - 1], heard_word)
                score = dp[i - 1][j - 1] + sim
                if score > best_score:
                    best_score = score
                    best_move = ("match", i - 1, j - 1)

            if i > 0 and dp[i - 1][j] > neg:
                score = dp[i - 1][j] - 35.0
                if score > best_score:
                    best_score = score
                    best_move = ("del", i - 1, j)

            if j > 0 and dp[i][j - 1] > neg:
                score = dp[i][j - 1] - 12.0
                if score > best_score:
                    best_score = score
                    best_move = ("ins", i, j - 1)

            dp[i][j] = best_score
            back[i][j] = best_move

    end_i, end_j = n, m
    if dp[n][m] <= neg:
        best_partial = neg
        for i in range(n + 1):
            for j in range(m + 1):
                if dp[i][j] > best_partial:
                    best_partial = dp[i][j]
                    end_i, end_j = i, j

    aligned: list[tuple[str, Optional[str], float, float]] = []
    i, j = end_i, end_j
    while i > 0 or j > 0:
        move = back[i][j]
        if move is None:
            break
        kind, pi, pj = move
        if kind == "match":
            heard_word, conf = heard[j - 1]
            sim = _word_similarity(expected[i - 1], heard_word)
            aligned.append((expected[i - 1], heard_word, sim, conf))
            i, j = pi, pj
        elif kind == "del":
            aligned.append((expected[i - 1], None, 0.0, 0.0))
            i, j = pi, pj
        else:
            j = pj

    aligned.reverse()
    return aligned


def _critical_words() -> set[str]:
    return get_critical_words()


def _find_read_aloud_start(expected: list[str], heard_words: list[str]) -> int:
    """Find where in HEARD the start of the reference passage begins (leading noise)."""
    probe = min(6, len(expected))
    if not probe or not heard_words:
        return 0
    best_start, best_avg = 0, -1.0
    search = min(25, len(heard_words))
    for start in range(search):
        if start + probe > len(heard_words):
            break
        avg = sum(_word_similarity(expected[i], heard_words[start + i]) for i in range(probe)) / probe
        if avg > best_avg:
            best_avg = avg
            best_start = start
    return best_start if best_avg >= 55 else 0


def _find_expected_offset(expected: list[str], heard_words: list[str]) -> int:
    """Find where in EXPECTED the transcript starts (Whisper often drops the opening).

    Example: heard starts at 'peaceful neighborhood...' → skip 'every morning i take a short walk through'.
    """
    probe = min(5, len(heard_words), len(expected))
    if not probe:
        return 0
    best_off, best_avg = 0, -1.0
    # Allow dropping up to ~1/3 of the passage opening to STT truncation
    search = min(max(20, len(expected) // 3), max(0, len(expected) - probe + 1))
    for off in range(search):
        avg = sum(_word_similarity(expected[off + i], heard_words[i]) for i in range(probe)) / probe
        if avg > best_avg:
            best_avg = avg
            best_off = off
    # Only skip a prefix when it clearly matches better than aligning at 0
    if best_off > 0 and best_avg >= 62:
        return best_off
    return 0


def _passage_mismatch(expected: list[str], heard_words: list[str]) -> bool:
    """True when transcript clearly does not match this reference (e.g. stale server passage)."""
    if not heard_words or not expected:
        return False
    heard_start = _find_read_aloud_start(expected, heard_words)
    exp_off = _find_expected_offset(expected, heard_words[heard_start:])
    probe = min(5, len(expected) - exp_off, len(heard_words) - heard_start)
    if probe < 3:
        return True
    avg = (
        sum(
            _word_similarity(expected[exp_off + i], heard_words[heard_start + i])
            for i in range(probe)
        )
        / probe
    )
    return avg < 55


def _is_whisper_variant(expected: str, heard: str, similarity: float) -> bool:
    exp, hw = expected.lower(), heard.lower()
    if exp == hw:
        return False
    return (exp in hw or hw in exp) and similarity >= 78


def _classify_issue(
    exp: str,
    heard_word: Optional[str],
    similarity: float,
    confidence: float,
) -> Optional[tuple[str, str, str]]:
    """Return (issue detail, mistake_type, summary_line) or None."""
    if heard_word is None:
        return (
            "skipped or mumbled — no clear speech detected for this word",
            "skipped",
            f"You skipped or mumbled '{exp}' — nothing clear was detected here",
        )

    exp_l, heard_l = exp.lower(), heard_word.lower()
    is_critical = exp_l in _critical_words()
    trap = PRONUNCIATION_TRAPS.get(exp_l)

    # Said a known look-alike / homophone — this is a real pronunciation error,
    # not just a "wrong word". Give the specific sound tip.
    trap_tip = _trap_tip(exp, heard_word)
    if trap_tip:
        return (
            f"mispronounced — sounded like '{heard_word}'",
            "wrong_sound",
            f"'{exp}' came out as '{heard_word}'. {trap_tip}",
        )

    if exp_l != heard_l:
        if _is_whisper_variant(exp, heard_word, similarity):
            return None
        return (
            f"wrong word spoken",
            "wrong_word",
            f"You said '{heard_word}' instead of '{exp}'",
        )

    # Correct word heard, but a trap word came out with shaky confidence —
    # the sound was borderline even though STT guessed the spelling right.
    if trap and confidence < trap["confidence_floor"]:
        return (
            "pronunciation unclear on a tricky word",
            "unclear",
            f"'{exp}' was close but unclear. {trap['tip']}",
        )

    threshold = CRITICAL_SIMILARITY if is_critical else MISTAKE_SIMILARITY
    if similarity < threshold:
        return (
            "pronunciation unclear — sounds slurred or incorrect",
            "unclear",
            f"'{exp}' sounded unclear or slurred — slow down and stress each syllable",
        )
    if confidence < LOW_CONFIDENCE:
        return (
            "low clarity — hard to understand in the recording",
            "mumbled",
            f"'{exp}' was mumbled or too quiet — speak it louder and clearer",
        )
    return None


def _suggestion_for(word: str) -> str:
    trap = PRONUNCIATION_TRAPS.get(word.lower())
    if trap:
        return trap["tip"]
    phones = _phonemes(word).replace(" ", "-")
    return f"Say slowly: {phones}" if phones else f"Say '{word}' slowly and clearly."


def detect_pauses(words: list[WordToken]) -> list[dict]:
    pauses: list[dict] = []
    timed = [w for w in words if w.end > 0 and w.start >= 0]
    for i in range(len(timed) - 1):
        gap = timed[i + 1].start - timed[i].end
        if gap >= PAUSE_GAP_SECONDS:
            pauses.append(
                {
                    "afterWord": timed[i].text,
                    "durationSeconds": round(gap, 1),
                    "mistakeType": "pause",
                    "issue": f"long pause ({round(gap, 1)}s) — flow broke here",
                    "summaryLine": (
                        f"You paused for {round(gap, 1)}s after '{timed[i].text}' — keep reading steadily"
                    ),
                    "cleared": False,
                }
            )
    return pauses


def _make_mistake(
    exp: str,
    heard_word: Optional[str],
    similarity: float,
    confidence: float,
    word_score: float,
) -> Optional[dict]:
    classified = _classify_issue(exp, heard_word, similarity, confidence)
    if not classified:
        return None
    issue, mistake_type, summary_line = classified
    return {
        "word": exp,
        "expected": exp,
        "heard": heard_word or "(not detected)",
        "issue": issue,
        "summaryLine": summary_line,
        "mistakeType": mistake_type,
        "suggestion": _suggestion_for(exp),
        "score": word_score,
        "cleared": False,
    }


async def _stt_request(
    client: httpx.AsyncClient,
    api_key: str,
    wav_bytes: bytes,
    prompt: Optional[str] = None,
) -> dict:
    request_data = {
        "model": "whisper-large-v3",
        "language": "en",
        "response_format": "verbose_json",
        "timestamp_granularities[]": "word",
        "temperature": "0",
    }
    if prompt:
        request_data["prompt"] = prompt
    resp = await client.post(
        "https://api.groq.com/openai/v1/audio/transcriptions",
        headers={"Authorization": f"Bearer {api_key}"},
        files={"file": ("audio.wav", wav_bytes, "audio/wav")},
        data=request_data,
    )
    if resp.status_code == 401:
        raise RuntimeError(
            f"Groq rejected the API key (401). Restart uvicorn after changing .env. {resp.text[:200]}"
        )
    resp.raise_for_status()
    return resp.json()


def _merge_chunk_results(chunks: list[tuple[float, dict]]) -> tuple[str, list[dict], list[dict]]:
    """Merge per-chunk Whisper output, offsetting timestamps and dropping overlap dupes."""
    words: list[dict] = []
    segments: list[dict] = []
    for offset_s, data in chunks:
        for w in data.get("words") or []:
            try:
                start = float(w.get("start", 0)) + offset_s
                end = float(w.get("end", start)) + offset_s
            except (TypeError, ValueError):
                continue
            words.append({"word": w.get("word", ""), "start": start, "end": end})
        for s in data.get("segments") or []:
            seg = dict(s)
            seg["start"] = float(s.get("start", 0)) + offset_s
            seg["end"] = float(s.get("end", 0)) + offset_s
            segments.append(seg)

    words.sort(key=lambda w: w["start"])
    deduped: list[dict] = []
    for w in words:
        clean = str(w["word"]).strip().lower().strip(".,!?;:\"'")
        if not clean:
            continue
        if deduped:
            prev_clean = str(deduped[-1]["word"]).strip().lower().strip(".,!?;:\"'")
            # Same word within the overlap window = duplicate from the next chunk
            if prev_clean == clean and abs(w["start"] - deduped[-1]["start"]) < 1.2:
                continue
        deduped.append(w)

    text = _normalize(" ".join(str(w["word"]).strip() for w in deduped))
    return text, deduped, segments


async def transcribe_audio(
    wav_bytes: bytes,
    reference: str = "",
    *,
    guided: bool = False,
) -> TranscriptionResult:
    api_key = groq_api_key()
    if not api_key:
        raise RuntimeError("GROQ_API_KEY is not set. Get a free key at https://console.groq.com")
    if not api_key.startswith("gsk_"):
        raise RuntimeError(
            "GROQ_API_KEY looks wrong (must start with gsk_). "
            "Restart the API after editing backend/.env"
        )

    # Short passage anchor helps the FIRST window stay on track (scripted only).
    # A full-passage prompt makes Whisper stop early, so keep it tiny.
    anchor = None
    if reference and not guided:
        anchor = " ".join(_tokenize(reference)[:8]) or None

    # Measure duration to decide single-shot vs chunked transcription.
    audio = None
    duration_ms = 0
    try:
        from pydub import AudioSegment

        audio = AudioSegment.from_file(io.BytesIO(wav_bytes), format="wav")
        duration_ms = len(audio)
    except Exception:
        audio = None

    async with httpx.AsyncClient(timeout=180.0) as client:
        if audio is None or duration_ms <= _STT_SINGLE_LIMIT_MS:
            data = await _stt_request(client, api_key, wav_bytes, prompt=anchor)
            raw_text = _best_transcript_text(data)
            text = _fix_stt_text(raw_text)
            tokens = _build_word_tokens(text, data.get("words") or [], data.get("segments") or [])
            return TranscriptionResult(text=text, words=tokens, raw_text=raw_text)

        # Long recording (read-passage ~50s, Jam 60-75s): split into overlapping
        # windows so one bad window can't wipe out the rest of the transcript.
        slices: list[tuple[float, bytes]] = []
        start = 0
        while start < duration_ms:
            end = min(start + _STT_CHUNK_MS, duration_ms)
            buf = io.BytesIO()
            audio[start:end].export(buf, format="wav")
            slices.append((start / 1000.0, buf.getvalue()))
            if end >= duration_ms:
                break
            start += _STT_CHUNK_STEP_MS

        async def _run(idx: int, offset_s: float, chunk: bytes) -> tuple[float, dict]:
            prompt = anchor if idx == 0 else None
            return offset_s, await _stt_request(client, api_key, chunk, prompt=prompt)

        results = await asyncio.gather(
            *[_run(i, off, b) for i, (off, b) in enumerate(slices)]
        )

    merged_text, merged_words, merged_segments = _merge_chunk_results(list(results))
    raw_text = merged_text
    text = _fix_stt_text(merged_text)
    tokens = _build_word_tokens(text, merged_words, merged_segments)
    return TranscriptionResult(text=text, words=tokens, raw_text=raw_text)


def build_analysis(
    reference: str,
    transcription: TranscriptionResult,
    *,
    guided: bool = False,
    jam: bool = False,
) -> tuple[float, list[dict], list[dict], dict]:
    """Returns score, word mistakes, pauses, stats."""
    transcript = transcription.text
    fixed_transcript, heard_pairs = _prepare_heard_pairs(transcript, transcription.words)
    pauses = detect_pauses(transcription.words)

    if guided or jam:
        score, mistakes = score_guided(
            reference, fixed_transcript, transcription.words, jam=jam
        )
    else:
        score, mistakes = score_scripted(reference, fixed_transcript, transcription.words)

    expected_count = len(_tokenize(reference)) if not (guided or jam) else len(heard_pairs)
    spoken_count = len(heard_pairs)
    skipped = sum(1 for m in mistakes if m.get("mistakeType") == "skipped")

    stats = {
        "wordsExpected": expected_count,
        "wordsSpoken": spoken_count,
        "wordsSkipped": skipped,
        "pauseCount": len(pauses),
        "guided": guided or jam,
        "jam": jam,
        "transcriptWords": len(_tokenize(transcript)),
    }
    return score, mistakes, pauses, stats


def score_scripted(
    reference: str,
    transcript: str,
    word_tokens: Optional[list[WordToken]] = None,
) -> tuple[float, list[dict]]:
    """Passage mode: honest coverage + ordered match.

    Score = average over EVERY expected word (unmatched = 0).
    Reading half the passage cannot produce a 95%+ score.
    """
    expected = _tokenize(reference)
    cleaned, was_trimmed = _trim_to_reference_coverage(transcript, reference)
    _fixed, heard_pairs = _prepare_heard_pairs(cleaned, None)

    # Collapse Whisper mid-passage loops (duplicate spans) — not meaning rewrites
    deduped_words = _dedupe_repeated_spans([h for h, _ in heard_pairs])
    if len(deduped_words) < len(heard_pairs):
        conf_by_word: dict[str, float] = {}
        for h, c in heard_pairs:
            conf_by_word[h] = max(conf_by_word.get(h, 0.0), c)
        heard_pairs = [(w, conf_by_word.get(w, 100.0)) for w in deduped_words]
        was_trimmed = True

    heard_words = [h for h, _ in heard_pairs]
    if not expected:
        return 0.0, []

    if _passage_mismatch(expected, heard_words):
        heard_preview = heard_words[0] if heard_words else "(nothing detected)"
        return 0.0, [
            {
                "word": "(transcript)",
                "expected": expected[0] if expected else "passage",
                "heard": heard_preview,
                "issue": "transcript does not match this passage",
                "summaryLine": (
                    f"What we heard ('{heard_preview}...') does not match the passage — "
                    "record again and read the text on screen clearly"
                ),
                "mistakeType": "unclear",
                "suggestion": "Read the passage aloud word for word, at a steady pace.",
                "score": 0,
                "cleared": True,
            }
        ]

    # Drop leading non-passage noise only (coughs / "um"), keep alignment honest
    heard_start = _find_read_aloud_start(expected, heard_words)
    heard_pairs = heard_pairs[heard_start:]
    heard_words = [h for h, _ in heard_pairs]

    spoken_ratio = len(heard_words) / max(1, len(expected))
    # Only skip an expected prefix when the recording looks complete but STT
    # dropped the opening — never when the user clearly stopped early.
    exp_off = 0
    if spoken_ratio >= 0.75:
        exp_off = _find_expected_offset(expected, heard_words)
    expected_scored = expected[exp_off:]

    LOOKAHEAD = 4
    mistakes: list[dict] = []
    scores: list[float] = []
    hi = 0
    consecutive_misses = 0
    stopped_early = False

    for exp_idx, exp in enumerate(expected_scored):
        # Ran out of speech — remaining passage words are unmatched (score 0)
        if hi >= len(heard_pairs):
            stopped_early = True
            scores.append(0.0)
            continue

        best_j = -1
        best_sim = -1.0
        best_hw = ""
        best_conf = 0.0
        for j in range(hi, min(hi + LOOKAHEAD, len(heard_pairs))):
            hw, conf = heard_pairs[j]
            sim = _word_similarity(exp, hw)
            if sim > best_sim:
                best_sim, best_j, best_hw, best_conf = sim, j, hw, conf

        # Jump over short STT hallucination gaps only when more speech remains after
        if (best_j < 0 or best_sim < 72) and hi + LOOKAHEAD < len(heard_pairs):
            resync = _resync_heard_index(exp, heard_pairs, hi, window=12)
            if resync:
                best_j, best_hw, best_sim, best_conf = resync

        # Clear substitution at the current spot (e.g. air→water) — count it, don't skip
        if (
            best_j == hi
            and 40 <= best_sim < 72
            and best_hw.lower() != exp.lower()
            and exp.lower() not in _SKIP_WORDS
            and len(exp) > 2
        ):
            hi = best_j + 1
            consecutive_misses = 0
            scores.append(best_sim)
            mistake = _make_mistake(exp, best_hw, best_sim, best_conf, best_sim)
            if mistake:
                mistakes.append(mistake)
            continue

        if best_j >= 0 and best_sim >= 72:
            hi = best_j + 1
            consecutive_misses = 0
            word_score = best_sim
            if best_conf < LOW_CONFIDENCE:
                word_score = min(word_score, best_conf)
            # A trap confusion (whether→weather) can look like a near-perfect
            # text match — don't reward it. Cap the word's contribution.
            is_trap = _is_trap_confusion(exp, best_hw)
            if is_trap:
                word_score = min(word_score, 45.0)
            scores.append(word_score)

            # Correct spelling but a trap word came out with shaky confidence:
            # the sound was borderline even though STT guessed it right.
            trap_cfg = PRONUNCIATION_TRAPS.get(exp.lower())
            if (
                not is_trap
                and trap_cfg
                and best_hw.lower() == exp.lower()
                and best_conf < trap_cfg["confidence_floor"]
            ):
                mistake = _make_mistake(exp, best_hw, best_sim, best_conf, min(word_score, best_conf))
                if mistake:
                    mistakes.append(mistake)
                continue

            if (best_sim < _GOOD_MATCH or is_trap) and _should_flag_mistake(exp, best_hw, best_sim):
                nearby_better = False
                if not is_trap:
                    for k in range(1, 3):
                        if exp_idx + k < len(expected_scored):
                            if _word_similarity(expected_scored[exp_idx + k], best_hw) > best_sim + 8:
                                nearby_better = True
                                break
                if not nearby_better:
                    mistake = _make_mistake(exp, best_hw, best_sim, best_conf, word_score)
                    if mistake:
                        mistakes.append(mistake)
            continue

        rem_heard = heard_words[hi:]
        # Compare against the next chunk of the passage (not the entire unread tail),
        # otherwise a single miss mid-passage looks like total divergence.
        probe = expected_scored[exp_idx : exp_idx + max(10, len(rem_heard) + 2)]
        rem_content = _content_set(probe)
        overlap = (
            len(rem_content & _content_set(rem_heard)) / max(1, len(rem_content))
            if rem_content
            else 0.0
        )

        # Heard still tracks the upcoming passage — word missing in this spot
        if rem_heard and overlap >= 0.3:
            consecutive_misses += 1
            scores.append(0.0)
            if _should_flag_mistake(exp, None, 0.0):
                mistake = _make_mistake(exp, None, 0.0, 0.0, 0.0)
                if mistake:
                    mistakes.append(mistake)
            continue

        # Truly off-track or out of speech — zero the rest; one incomplete note later
        stopped_early = True
        scores.append(0.0)
        for _ in range(exp_idx + 1, len(expected_scored)):
            scores.append(0.0)
        break

    # Prefix not spoken (or STT-dropped on a short take) counts as 0
    full_scores = [0.0] * exp_off + scores
    while len(full_scores) < len(expected):
        full_scores.append(0.0)
        stopped_early = True

    matched = sum(1 for s in full_scores if s > 0)
    coverage = matched / max(1, len(expected))
    # Honest score: every expected word counts (missed = 0)
    overall = sum(full_scores) / max(1, len(expected))

    if coverage < 0.85 or stopped_early or spoken_ratio < 0.8:
        missing = len(expected) - matched
        mistakes.append(
            {
                "word": "(incomplete)",
                "expected": "full passage",
                "heard": f"only ~{matched}/{len(expected)} words matched",
                "issue": "passage not finished",
                "summaryLine": (
                    f"You only covered about {int(round(coverage * 100))}% of the passage "
                    f"({matched} of {len(expected)} words) — read the full text"
                ),
                "mistakeType": "skipped",
                "suggestion": "Record again and read the entire passage without stopping early.",
                "score": 0,
                "cleared": True,  # informational — re-record; not a practice-word drill
            }
        )

    # Keep real wrong_word / unclear from what they DID say; drop skip-noise on
    # unread tail words (those are covered by the incomplete note)
    if coverage < 0.85:
        matched_region = set()
        # words that appear in the spoken transcript — skips for unread content words
        # further down the passage are noise
        heard_set = set(heard_words)
        trimmed: list[dict] = []
        for m in mistakes:
            if m.get("word", "").startswith("("):
                trimmed.append(m)
                continue
            if m.get("mistakeType") == "skipped":
                # Only keep skip if it sits inside the spoken span (alignment miss)
                # Approximate: content word that was expected early enough
                w = m.get("word", "").lower()
                if w in heard_set:
                    continue  # said later / elsewhere — not a real skip
                # Keep skips only for words near the spoken portion
                try:
                    idx = expected.index(w)
                except ValueError:
                    continue
                if idx <= matched + 5:
                    trimmed.append(m)
                continue
            trimmed.append(m)
        mistakes = trimmed

    # Pronunciation should visibly count: each mispronounced trap word (silent
    # letter / homophone) trims the score beyond its single-word average, so a
    # fully-read passage with clear sound errors cannot sit near the top.
    trap_errors = sum(
        1 for m in mistakes if m.get("mistakeType") in {"wrong_sound"}
        and m.get("word", "").lower() in PRONUNCIATION_TRAPS
    )
    if trap_errors:
        overall = max(0.0, overall - min(24.0, trap_errors * 6.0))

    return round(overall, 1), mistakes


def _heard_is_synthetic(heard: list[tuple[str, float]]) -> bool:
    """True when STT did not return per-word confidence (all ~82 or ~100)."""
    if not heard:
        return True
    confs = {round(c, 1) for _, c in heard}
    return len(confs) <= 2 and all(c >= 82 for _, c in heard)


def _detect_jam_repetitions(heard: list[tuple[str, float]]) -> list[dict]:
    """Flag back-to-back repeats (call call) and near repeats (stutter)."""
    mistakes: list[dict] = []
    flagged: set[str] = set()

    for i in range(len(heard) - 1):
        w1, c1 = heard[i]
        w2, c2 = heard[i + 1]
        wl = w1.lower()
        if wl != w2.lower() or wl in _SKIP_WORDS or len(wl) <= 2:
            continue
        if wl in flagged:
            continue
        flagged.add(wl)
        conf = min(c1, c2)
        mistakes.append(
            {
                "word": w1,
                "expected": w1,
                "heard": f"{w1} {w2}",
                "issue": "repeated the same word twice in a row",
                "summaryLine": f"You said '{w1}' twice in a row — slow down and say it once",
                "mistakeType": "repeat",
                "suggestion": f"Pause briefly, then say '{w1}' once clearly.",
                "score": conf,
                "cleared": False,
            }
        )

    for i, (w, c) in enumerate(heard):
        wl = w.lower()
        if wl in _SKIP_WORDS or len(wl) <= 3 or wl in flagged:
            continue
        for j in range(i + 2, min(i + 5, len(heard))):
            if heard[j][0].lower() != wl:
                continue
            flagged.add(wl)
            mistakes.append(
                {
                    "word": w,
                    "expected": w,
                    "heard": w,
                    "issue": "word repeated again within a few words (stutter)",
                    "summaryLine": f"You repeated '{w}' — take a breath and say it once",
                    "mistakeType": "stutter",
                    "suggestion": f"Practice: say '{w}' slowly once, without repeating.",
                    "score": min(c, heard[j][1]),
                    "cleared": False,
                }
            )
            break

    return mistakes


def _detect_jam_phrase_repeats(heard: list[tuple[str, float]]) -> list[dict]:
    """Flag 2–3 word phrases spoken more than once (e.g. 'i don't know')."""
    words = [w.lower() for w, _ in heard]
    mistakes: list[dict] = []
    flagged: set[str] = set()

    for plen in (2, 3):
        counts: dict[tuple[str, ...], int] = {}
        for i in range(len(words) - plen + 1):
            phrase = tuple(words[i : i + plen])
            if all(p in _SKIP_WORDS for p in phrase):
                continue
            counts[phrase] = counts.get(phrase, 0) + 1

        for phrase, count in counts.items():
            if count < 2:
                continue
            phrase_text = " ".join(phrase)
            if phrase_text in flagged:
                continue
            # Skip ultra-common bigrams that are normal in rambling speech
            if phrase_text in {"i don", "don t", "t know"}:
                continue
            flagged.add(phrase_text)
            practice_word = next((p for p in reversed(phrase) if p not in _SKIP_WORDS and len(p) > 3), phrase[-1])
            mistakes.append(
                {
                    "word": practice_word,
                    "expected": phrase_text,
                    "heard": phrase_text,
                    "issue": f"repeated phrase '{phrase_text}' ({count} times)",
                    "summaryLine": f"You kept repeating '{phrase_text}' — plan your next sentence before speaking",
                    "mistakeType": "stutter",
                    "suggestion": "Pause half a second, then continue with the next idea.",
                    "score": 70.0,
                    "cleared": False,
                }
            )

    return mistakes[:3]


def _detect_jam_unclear(heard: list[tuple[str, float]], *, synthetic: bool) -> list[dict]:
    """Low-confidence or borderline-clear content words in Jam."""
    mistakes: list[dict] = []
    seen: set[str] = set()
    threshold = 78 if synthetic else LOW_CONFIDENCE

    for word, conf in heard:
        w = word.lower()
        if w in _SKIP_WORDS or len(w) <= 3 or w in seen:
            continue
        if conf < threshold:
            seen.add(w)
            mistakes.append(
                {
                    "word": w,
                    "expected": w,
                    "heard": w,
                    "issue": "unclear or mumbled in the recording",
                    "summaryLine": f"'{w}' was hard to catch — speak it louder and slower",
                    "mistakeType": "mumbled",
                    "suggestion": _suggestion_for(w),
                    "score": conf,
                    "cleared": False,
                }
            )
    return mistakes


def score_guided(
    reference: str,
    transcript: str,
    word_tokens: Optional[list[WordToken]] = None,
    *,
    jam: bool = False,
) -> tuple[float, list[dict]]:
    """Free-speech / Jam mode: score natural speech — no forced passage alignment.

    Jam (Just a Minute): any topic, flag unclear/mumbled words from STT confidence.
    Free speech: same + soft intro-topic coverage bonus.
    """
    _fixed, heard = _prepare_heard_pairs(transcript, word_tokens)
    if not heard:
        return 0.0, [
            {
                "word": "speech",
                "expected": "speech",
                "heard": "(nothing detected)",
                "issue": "no speech detected",
                "summaryLine": "No speech was detected — speak clearly into the microphone",
                "mistakeType": "skipped",
                "suggestion": "Speak clearly into the microphone.",
                "score": 0.0,
                "cleared": False,
            }
        ]

    mistakes: list[dict] = []
    word_scores: list[float] = []
    synthetic = _heard_is_synthetic(heard)

    if jam:
        mistakes.extend(_detect_jam_repetitions(heard))
        mistakes.extend(_detect_jam_phrase_repeats(heard))
        mistakes.extend(_detect_jam_unclear(heard, synthetic=synthetic))
        # De-dupe by word + mistake type
        deduped: list[dict] = []
        seen_keys: set[tuple[str, str]] = set()
        for m in mistakes:
            key = (m["word"].lower(), m.get("mistakeType", ""))
            if key in seen_keys:
                continue
            seen_keys.add(key)
            deduped.append(m)
        mistakes = deduped
    else:
        seen: set[str] = set()
        for word, conf in heard:
            w = word.lower()
            if w in _SKIP_WORDS or len(w) <= 2:
                continue
            score = conf
            word_scores.append(score)
            if conf < LOW_CONFIDENCE and w not in seen and len(w) > 3:
                seen.add(w)
                mistakes.append(
                    {
                        "word": w,
                        "expected": w,
                        "heard": w,
                        "issue": "low clarity — hard to understand in the recording",
                        "summaryLine": f"'{w}' was mumbled or unclear — say it louder and slower",
                        "mistakeType": "mumbled",
                        "suggestion": _suggestion_for(w),
                        "score": conf,
                        "cleared": False,
                    }
                )

    for word, conf in heard:
        w = word.lower()
        if w in _SKIP_WORDS or len(w) <= 2:
            continue
        word_scores.append(conf)

    # Soft topic coverage — intro round only (Jam: any topic is valid)
    coverage_bonus = 0.0
    if not jam:
        prompt_topics = {
            "name": {"name", "i'm", "im", "called"},
            "interest": {"hobby", "hobbies", "enjoy", "love", "like", "favorite", "passion", "play", "reading"},
            "personal": {"from", "live", "work", "study", "family", "friend", "share", "about"},
        }
        heard_set = {h.lower() for h, _ in heard}
        covered = sum(1 for cues in prompt_topics.values() if heard_set & cues)
        coverage_bonus = covered * 4  # up to +12

    base = sum(word_scores) / len(word_scores) if word_scores else 40.0
    # If STT gave no confidence (all 100 from text-only), use length heuristic
    if word_tokens is None or all(c >= 99 for _, c in heard):
        n = len([w for w, _ in heard if w not in _SKIP_WORDS])
        base = min(92.0, 55.0 + n * 2.5)

    overall = min(100.0, base + coverage_bonus - len(mistakes) * 3)
    if jam:
        repeat_penalty = sum(2 for m in mistakes if m.get("mistakeType") in {"repeat", "stutter"})
        overall = max(0.0, overall - repeat_penalty)

    return round(max(0.0, overall), 1), mistakes[:10]


def format_mistakes(mistakes: list[dict]) -> list[dict]:
    return [
        {
            "word": m["word"],
            "expected": m.get("expected", m["word"]),
            "heard": m.get("heard", ""),
            "issue": m.get("issue", "mispronounced or unclear"),
            "summaryLine": m.get("summaryLine", m.get("issue", "")),
            "mistakeType": m.get("mistakeType", "unclear"),
            "suggestion": m.get("suggestion", _suggestion_for(m["word"])),
            "cleared": False,
        }
        for m in mistakes
    ]


def _dedupe_by_word(mistakes: list[dict]) -> list[dict]:
    """One practice entry per word — Jam can flag the same word as repeat + stutter."""
    seen: set[str] = set()
    unique: list[dict] = []
    for m in mistakes:
        key = m.get("word", "").lower()
        if not key or key in seen:
            continue
        seen.add(key)
        unique.append(m)
    return unique


def pick_practice_words(
    mistakes: list[dict],
    limit: int | None = None,
    *,
    guided: bool = False,
    jam: bool = False,
) -> list[dict]:
    cap = limit if limit is not None else _max_practice_words()
    critical = _critical_words()

    if guided or jam:
        practice_types = {"mumbled", "unclear", "repeat", "stutter"} if jam else {"mumbled"}
        filtered = [
            m
            for m in mistakes
            if m.get("mistakeType") in practice_types
            and m.get("word", "").lower() not in _META_PRACTICE_WORDS
            and not m.get("cleared")
            and len(m.get("word", "")) > 2
            and m["word"].lower() not in _SKIP_WORDS
        ]
        def jam_sort(m: dict) -> tuple:
            priority = {"repeat": 0, "stutter": 1, "mumbled": 2, "unclear": 3}
            return (priority.get(m.get("mistakeType", ""), 9), m.get("score", 0))
        if jam:
            filtered.sort(key=jam_sort)
        return format_mistakes(_dedupe_by_word(filtered)[:cap])

    filtered = [
        m
        for m in mistakes
        if m.get("mistakeType") != "pause"
        and not m.get("cleared")
        and not str(m.get("word", "")).startswith("(")
        and m.get("word", "").lower() not in _META_PRACTICE_WORDS
        and len(m.get("word", "")) > 5  # practice real content words only
        and m["word"].lower() not in _SKIP_WORDS
    ]

    def sort_key(m: dict) -> tuple:
        word = m["word"].lower()
        is_critical = word in critical
        is_substitution = m.get("mistakeType") == "wrong_word"
        return (not is_critical, not is_substitution, m.get("score", 0))

    filtered.sort(key=sort_key)
    return format_mistakes(_dedupe_by_word(filtered)[:cap])


def build_metrics(overall: float, stats: dict) -> dict:
    pause_penalty = min(12.0, stats.get("pauseCount", 0) * 3)
    skip_penalty = min(10.0, stats.get("wordsSkipped", 0) * 2)
    fluency = max(0.0, min(100.0, overall + 4 - pause_penalty))
    clarity = max(0.0, overall - 2 - skip_penalty * 0.5)
    return {
        "pronunciation": round(overall, 1),
        "fluency": round(fluency, 1),
        "clarity": round(clarity, 1),
        "pace": round(max(0.0, min(100.0, overall + 2 - pause_penalty * 0.5)), 1),
    }


def verify_word(expected_word: str, transcript: str) -> tuple[bool, float, str]:
    heard = _tokenize(transcript)
    if not heard:
        return False, 0.0, "(nothing detected)"

    expected = expected_word.lower().strip()
    trap = PRONUNCIATION_TRAPS.get(expected)
    # Trap words must be pronounced correctly — never soft-pass a look-alike.
    aliases: set[str] = set() if trap else _STT_VERIFY_ALIASES.get(expected, set())

    best_word = heard[0]
    best_score = 0.0
    for w in heard:
        wl = w.lower()
        if trap and wl in trap["confusions"]:
            # Said the wrong-sounding homophone — clear fail with the tip.
            return False, 0.0, w
        if wl == expected or wl in aliases:
            # Exact or known Whisper mix-up — treat as a clear pass
            return True, 100.0, w
        score = _word_similarity(expected, wl)
        if score > best_score:
            best_score = score
            best_word = w

    # Trap words need exact spelling from STT — phonetic near-misses are the
    # very errors we are trying to catch, so don't soft-pass them.
    if trap:
        return False, round(best_score, 1), best_word

    # Pass on strong phonetic match even if Whisper spelled it differently
    # (single-word practice is noisy; don't require exact spelling)
    soft_threshold = 70 if len(expected) <= 4 else VERIFY_PASS_SCORE
    passed = best_score >= soft_threshold
    return passed, round(best_score, 1), best_word


def level_passed(score: float, mistakes: list[dict]) -> bool:
    uncleared = [m for m in mistakes if not m.get("cleared")]
    return score >= _pass_threshold() and len(uncleared) == 0
