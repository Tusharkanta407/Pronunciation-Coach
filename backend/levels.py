"""Level definitions aligned with frontend lib/levels.ts"""

PASS_THRESHOLD = 80
MAX_PRACTICE_WORDS = 5
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

# Free Speech: natural intro words the learner must say clearly.
FREE_SPEECH_TARGET_WORDS = [
    "experience",
    "education",
    "interested",
    "professional",
    "enthusiastic",
]

# Jam: different hard pronunciation words (not the intro set).
JAM_TARGET_WORDS = [
    "entrepreneur",
    "opportunity",
    "environment",
    "communication",
    "particularly",
    "responsibility",
    "necessary",
]

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
            "Certain words, such as island and comfortable, are tricky because their spelling does not match how they actually sound. "
            "By reading aloud every day and listening carefully to my own voice, I gradually become more fluent, expressive, and confident in everyday conversations."
        ),
        "target_words": [],
    },
    "free-speech": {
        "title": "Share About Yourself",
        "instruction": (
            "Introduce yourself naturally — and you must clearly say each of the 5 target words "
            "somewhere in your introduction."
        ),
        "type": "guided",
        "min_seconds": 3,
        "max_seconds": PASSAGE_MAX_SECONDS,
        "reference": (
            "Introduce yourself. Include your name or background, and clearly pronounce each "
            "required target word in your speech."
        ),
        "target_words": FREE_SPEECH_TARGET_WORDS,
    },
    "just-a-minute": {
        "title": "Jam — Just a Minute",
        "instruction": (
            "Talk about the topic for at least one full minute. Weave in all 7 hard words "
            "clearly — your score is based on those words."
        ),
        "type": "jam",
        "min_seconds": JAM_MIN_SECONDS,
        "max_seconds": JAM_MAX_SECONDS,
        "reference": (
            "Speak for at least one minute on the topic. Pronounce each required hard word clearly."
        ),
        "target_words": JAM_TARGET_WORDS,
    },
}
