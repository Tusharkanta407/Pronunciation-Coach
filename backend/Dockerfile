FROM python:3.12-slim

# ffmpeg is required by pydub for decoding webm/mp3/m4a and converting to wav
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Warm g2p-en / nltk data at build time so the first request isn't slow
# and doesn't need to download anything at runtime.
RUN python -c "from g2p_en import G2p; G2p()"

COPY . .

ENV PORT=8000
EXPOSE 8000

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
