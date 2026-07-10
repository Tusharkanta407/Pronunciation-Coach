import edge_tts

VOICE = "en-US-JennyNeural"
_cache: dict[str, bytes] = {}


async def generate_pronunciation_audio(word: str) -> bytes:
    key = word.strip().lower()
    if key in _cache:
        return _cache[key]

    communicate = edge_tts.Communicate(word, VOICE)
    chunks: list[bytes] = []
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            chunks.append(chunk["data"])

    audio = b"".join(chunks)
    _cache[key] = audio
    return audio
