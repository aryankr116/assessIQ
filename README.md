# AssessIQ

AssessIQ generates job-specific interview questions grounded in uploaded documents. It includes a React frontend and a FastAPI backend for document extraction, indexing, question generation, and answer grounding.

## Setup for collaborators

### Run the full application (recommended)

Install and start Docker Desktop, then run this from the repository root:

```powershell
docker compose up --build
```

Open `http://localhost:8080`. This starts the frontend and backend together. In this mode, uploads are checked for at least **15,000 extracted characters** before indexing. The standalone frontend's mock mode simulates uploads and does not enforce this backend check.

Stop the app with `Ctrl+C`, then run `docker compose down`. Add `-v` only if you also want to delete the Docker-stored application data.

### Run the document-ingestion CLI

1. Create and activate a virtual environment.

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

2. Install shared dependencies.

```powershell
pip install -r requirements.txt
```

3. Run the ingestion pipeline.

```powershell
python -m backend.ingest --input backend/sample_docs --output backend/structured_out --jsonl
```

## Supported input files

- `*.pdf`
- `*.docx`
- `*.txt`
- `*.pptx`
- `*.md`
- `*.png`
- `*.jpg` / `*.jpeg`
- `*.tiff` / `*.tif`
- `*.bmp`

## Notes

- OCR is supported for scanned PDFs and image files.
- If Tesseract is installed and available on `PATH`, it will be used.
- Otherwise the system will fall back to `easyocr`.

## Troubleshooting

- If a collaborator gets an import error, verify the correct Python interpreter is active and run:

```powershell
pip install -r requirements.txt
```

- If image OCR fails, confirm the Tesseract binary is installed or that `easyocr` installed successfully.
