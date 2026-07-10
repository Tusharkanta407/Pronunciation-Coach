FROM python:3.12-slim

# ffmpeg is required by pydub for decoding webm/mp3/m4a and converting to wav
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# g2p-en needs these NLTK corpora at runtime (Render has no home-dir cache).
# Download explicitly — G2p() alone does not pull every tagger package.
ENV NLTK_DATA=/usr/local/share/nltk_data
RUN python -c "\
import nltk; \
nltk.download('averaged_perceptron_tagger_eng', download_dir='/usr/local/share/nltk_data'); \
nltk.download('averaged_perceptron_tagger', download_dir='/usr/local/share/nltk_data'); \
nltk.download('cmudict', download_dir='/usr/local/share/nltk_data'); \
nltk.download('punkt', download_dir='/usr/local/share/nltk_data'); \
nltk.download('punkt_tab', download_dir='/usr/local/share/nltk_data'); \
from g2p_en import G2p; \
assert G2p()('island'), 'g2p warmup failed'"

COPY . .

ENV PORT=8000
EXPOSE 8000

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
