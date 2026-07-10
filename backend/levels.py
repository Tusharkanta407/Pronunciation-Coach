"""Level definitions aligned with frontend lib/levels.ts"""

PASS_THRESHOLD = 80
MAX_PRACTICE_WORDS = 4
PRACTICE_WORD_MAX_SECONDS = 10
PASSAGE_MAX_SECONDS = 60
JAM_MIN_SECONDS = 60
JAM_MAX_SECONDS = 75

CHALLENGE_WORDS = {
    "entrepreneur",
    "opportunity",
    "environment",
    "communication",
    "particularly",
    "responsibility",
    "necessary",
}

# Used for practice priority (not UI highlighting)
CRITICAL_WORDS = CHALLENGE_WORDS

LEVELS = {
    "read-passage": {
        "title": "Read the Passage",
        "instruction": "Read the passage below clearly and naturally in English.",
        "type": "scripted",
        "min_seconds": 3,
        "max_seconds": PASSAGE_MAX_SECONDS,
        "reference": (
            "Every morning, I take a short walk through a peaceful neighborhood before starting my work. "
            "The fresh air helps me concentrate and improves my confidence when speaking English. "
            "Along the way, I notice how comfortable conversations become with regular practice and clear pronunciation. "
            "Sometimes, words like entrepreneur, opportunity, environment, communication, particularly, responsibility, and necessary require extra attention because they are easy to mispronounce. "
            "By reading aloud every day and listening carefully to my own voice, I gradually become more fluent, expressive, and confident in everyday conversations."
        ),
    },
    "free-speech": {
        "title": "Share About Yourself",
        "instruction": "Cover your name, a hobby, or anything you want to share — speak naturally.",
        "type": "guided",
        "min_seconds": 3,
        "max_seconds": PASSAGE_MAX_SECONDS,
        "reference": (
            "Share your name, a hobby, or anything you would like us to hear. "
            "Speak clearly and naturally."
        ),
    },
    "just-a-minute": {
        "title": "Jam — Just a Minute",
        "instruction": "Talk about any topic for at least one full minute — keep speaking clearly.",
        "type": "jam",
        "min_seconds": JAM_MIN_SECONDS,
        "max_seconds": JAM_MAX_SECONDS,
        "reference": (
            "Speak continuously for at least one minute about any topic. "
            "Pronunciation is evaluated from your natural speech."
        ),
    },
}
