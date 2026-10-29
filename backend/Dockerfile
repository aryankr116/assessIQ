# ---------------------------------------------------------------------------
# AssessIQ backend image (FastAPI + RAG pipeline)
# Build from the PROJECT ROOT so the `backend` package is included:
#   docker build -f backend/Dockerfile -t assessiq-backend .
#
# By default this installs the lightweight dependency set and uses the
# hashing-embedder + numpy fallbacks and the offline generator. For real
# Sentence-Transformers + FAISS, build with:
#   docker build -f backend/Dockerfile --build-arg INSTALL_ML=true -t assessiq-backend .
# ---------------------------------------------------------------------------
FROM python:3.12-slim

ARG INSTALL_ML=false
ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1

WORKDIR /app

# Tesseract and its Python bindings provide OCR for scanned PDFs and images.
RUN apt-get update \
 && apt-get install -y --no-install-recommends tesseract-ocr \
 && rm -rf /var/lib/apt/lists/* \
 && pip install \
      fastapi "uvicorn[standard]" python-multipart "pydantic>=2.0" numpy \
      openai requests python-dotenv \
      pymupdf python-docx python-pptx pdfminer.six \
      sqlalchemy "psycopg2-binary" google-auth Pillow pytesseract \
 && if [ "$INSTALL_ML" = "true" ]; then \
      pip install sentence-transformers faiss-cpu ; \
    fi

# App code (the `backend` package).
COPY backend /app/backend

# Persisted state (documents, vectors, users) lives here.
ENV ASSESSIQ_DATA_DIR=/data
VOLUME ["/data"]

EXPOSE 8000
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=6 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=3)" || exit 1
CMD ["uvicorn", "backend.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
