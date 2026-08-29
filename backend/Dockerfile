# ---------------------------------------------------------------------------
# AssessIQ backend image (FastAPI + RAG pipeline)
# Build from the PROJECT ROOT so the `backend` package is included:
#   docker build -f backend/Dockerfile -t assessiq-backend .
#
# By default this installs the lightweight dependency set, so the image is small
# (~250 MB) and always starts — it uses the hashing-embedder + numpy fallbacks
# and the offline generator. For the full report-accurate stack (real
# Sentence-Transformers + FAISS, much larger image) build with:
#   docker build -f backend/Dockerfile --build-arg INSTALL_ML=true -t assessiq-backend .
# ---------------------------------------------------------------------------
FROM python:3.12-slim

ARG INSTALL_ML=false
ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1

WORKDIR /app

# Lightweight core deps (parsing + API + offline pipeline).
RUN pip install \
      fastapi "uvicorn[standard]" python-multipart "pydantic>=2.0" numpy \
      openai requests python-dotenv \
      pymupdf python-docx python-pptx pdfminer.six \
 && if [ "$INSTALL_ML" = "true" ]; then \
      pip install sentence-transformers faiss-cpu ; \
    fi

# App code (the `backend` package).
COPY backend /app/backend

# Persisted state (documents, vectors, users) lives here.
ENV ASSESSIQ_DATA_DIR=/data
VOLUME ["/data"]

EXPOSE 8000
CMD ["uvicorn", "backend.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
