# Text extractor

This package provides a pluggable text extraction system for unstructured documents (PDF, DOCX, TXT, PPTX, MD) and includes OCR support for scanned PDFs and image files.

Supported file types:

- PDF
- DOCX
- TXT
- PPTX
- MD
- PNG
- JPG/JPEG
- TIFF
- BMP

Quickstart

1. Create a virtual environment and install requirements:

```bash
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r backend/text_extractor/requirements.txt
```

2. Run the CLI to extract files from a folder:

```bash
python -m backend.text_extractor.cli --input path/to/docs --output extracted/
```

> Note: OCR will use Tesseract if installed, but it can also fall back to `easyocr` if the Tesseract binary is unavailable.
> On Windows, install Tesseract from https://github.com/tesseract-ocr/tesseract if you want the fastest results.

Design notes

- Pluggable registry in `extractors.py` so new file types and extraction strategies can be added easily.
- CLI writes one JSON file per input document with `source`, `text`, and `meta` keys.
