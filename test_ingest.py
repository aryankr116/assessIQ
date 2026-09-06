#!/usr/bin/env python3
import sys
sys.path.insert(0, '.')
from backend.api.store import get_store

# Try to ingest a simple text file
store = get_store()
try:
    result = store.pipeline.ingest_document(
        "backend/sample_docs/sample1.txt",
        "test_doc_1",
        "sample1.txt"
    )
    print(f"✓ Success: {result.chunk_count} chunks")
    print(f"  Excerpt: {result.excerpt[:100]}")
except Exception as e:
    print(f"✗ Error: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
