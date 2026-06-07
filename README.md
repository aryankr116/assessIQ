# AssessIQ

This repository contains the backend ingestion system for extracting and structuring unstructured documents.

## Setup for collaborators

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
