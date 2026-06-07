"""Ingestion pipeline: extract -> clean -> chunk -> store structured outputs.

Writes one JSON file per document containing raw text, cleaned text, chunks, and metadata.
Optionally writes a JSONL file with all chunks for downstream ingestion.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import unicodedata
from pathlib import Path
from typing import List

from backend.text_extractor.extractors import extract_text_from_file, file_metadata


def clean_text(text: str) -> str:
    # Normalize unicode
    text = unicodedata.normalize("NFKC", text)
    # Remove null bytes and control chars except newlines and tabs
    text = re.sub(r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]+", "", text)
    # Replace Windows newlines and multiple newlines
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    # Collapse multiple spaces/tabs
    text = re.sub(r"[ \t]+", " ", text)
    # Collapse repeated newlines to max 2
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
    if chunk_size <= 0:
        return [text]
    chunks: List[str] = []
    start = 0
    length = len(text)
    while start < length:
        end = min(start + chunk_size, length)
        chunks.append(text[start:end].strip())
        if end == length:
            break
        start = max(end - overlap, end)
    return chunks


def iter_files(input_path: Path, exts=None):
    if input_path.is_file():
        yield input_path
        return
    for root, _, files in os.walk(input_path):
        for f in files:
            p = Path(root) / f
            if exts is None or p.suffix.lower() in exts:
                yield p


def process(input_path: str, output_dir: str, chunk_size: int = 1000, overlap: int = 200, jsonl: bool = False):
    inp = Path(input_path)
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)

    jsonl_path = out / "chunks.jsonl" if jsonl else None
    jsonl_f = open(jsonl_path, "w", encoding="utf-8") if jsonl_path else None

    for p in iter_files(inp):
        try:
            raw = extract_text_from_file(str(p))
        except Exception as e:
            print(f"Skipping {p}: {e}")
            continue
        cleaned = clean_text(raw)
        chunks = chunk_text(cleaned, chunk_size=chunk_size, overlap=overlap)
        meta = file_metadata(str(p))
        record = {
            "source": str(p),
            "meta": meta,
            "raw_text": raw,
            "cleaned_text": cleaned,
            "chunks": chunks,
        }
        out_file = out / (p.name + ".structured.json")
        with open(out_file, "w", encoding="utf-8") as f:
            json.dump(record, f, ensure_ascii=False, indent=2)
        print(f"Wrote {out_file}")

        if jsonl_f:
            for i, c in enumerate(chunks):
                item = {"doc": p.name, "chunk_id": i, "text": c, "meta": meta}
                jsonl_f.write(json.dumps(item, ensure_ascii=False) + "\n")

    if jsonl_f:
        jsonl_f.close()
        print(f"Wrote {jsonl_path}")


def main():
    parser = argparse.ArgumentParser(description="Ingest unstructured docs into structured JSON and JSONL chunks")
    parser.add_argument("--input", "-i", required=True, help="Input file or directory")
    parser.add_argument("--output", "-o", required=True, help="Output directory")
    parser.add_argument("--chunk-size", type=int, default=1000, help="Chunk size in characters")
    parser.add_argument("--overlap", type=int, default=200, help="Overlap size in characters")
    parser.add_argument("--jsonl", action="store_true", help="Also write a combined JSONL of chunks")
    args = parser.parse_args()
    process(args.input, args.output, chunk_size=args.chunk_size, overlap=args.overlap, jsonl=args.jsonl)


if __name__ == "__main__":
    main()
