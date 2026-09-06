#!/usr/bin/env python3
import sys
sys.path.insert(0, '.')
from backend.api.store import get_store
from pathlib import Path

store = get_store()
test_files = [
    ("backend/sample_docs/sample1.txt", "txt"),
    ("backend/sample_docs/sample2.md", "md"),
    ("backend/sample_docs/sample3.docx", "docx"),
    ("backend/sample_docs/sample4.pptx", "pptx"),
    ("backend/sample_docs/sample5.png", "png"),
    ("backend/sample_docs/Unit 1.pdf", "pdf"),
]

for path, ftype in test_files:
    if not Path(path).exists():
        print(f"✗ {ftype.upper()}: File not found - {path}")
        continue
    try:
        result = store.pipeline.ingest_document(path, f"test_{ftype}", Path(path).name)
        print(f"✓ {ftype.upper()}: {result.chunk_count} chunks")
    except Exception as e:
        print(f"✗ {ftype.upper()}: {type(e).__name__}: {str(e)[:100]}")
