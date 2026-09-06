#!/usr/bin/env python3
import sys
sys.path.insert(0, '.')
from backend.api.store import get_store

store = get_store()
try:
    print("Testing PDF...")
    result = store.pipeline.ingest_document(
        "backend/sample_docs/Unit 1.pdf",
        "test_pdf",
        "Unit 1.pdf"
    )
    print(f"✓ PDF: {result.chunk_count} chunks")
except Exception as e:
    print(f"✗ PDF failed:")
    print(f"  {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
