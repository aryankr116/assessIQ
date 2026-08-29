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


def _is_structural_line(line: str) -> bool:
    stripped = line.strip()
    if not stripped:
        return False

    if re.match(r"^(#{1,6}\s+|[-*•+]\s+|\d+[\.)]\s+)", stripped):
        return True
    if "|" in line and re.search(r"\w\s*\|\s*\w", line):
        return True
    if stripped.endswith(":"):
        return True
    if stripped.isupper() and len(stripped) > 3 and sum(c.isalpha() for c in stripped) / max(len(stripped), 1) > 0.6:
        return True
    return False


def clean_text(text: str) -> str:
    text = unicodedata.normalize("NFKC", text)
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]+", "", text)

    lines = [line.rstrip() for line in text.split("\n")]
    merged_lines: List[str] = []
    for idx, line in enumerate(lines):
        if not line.strip():
            merged_lines.append("")
            continue

        next_line = lines[idx + 1] if idx + 1 < len(lines) else ""
        if line.endswith("-") and next_line and not _is_structural_line(next_line):
            merged_lines.append(line[:-1])
            continue

        if _is_structural_line(line) or _is_structural_line(next_line) or not next_line.strip():
            merged_lines.append(line)
        else:
            merged_lines.append(f"{line} ")

    text = "\n".join(merged_lines)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _line_kind(line: str) -> str:
    stripped = line.strip()
    if not stripped:
        return "blank"
    if re.match(r"^(#{1,6}\s+|[-*•+]\s+|\d+[\.)]\s+)", stripped):
        return "list"
    if "|" in line and re.search(r"\w\s*\|\s*\w", line):
        return "table"
    if stripped.endswith(":") or (stripped.isupper() and len(stripped) > 3):
        return "heading"
    return "paragraph"


def _split_structural_blocks(text: str) -> List[str]:
    blocks: List[str] = []
    current: List[str] = []
    current_type: str | None = None

    for line in text.split("\n"):
        if not line.strip():
            if current:
                blocks.append("\n".join(current))
                current = []
                current_type = None
            continue

        kind = _line_kind(line)
        if current and kind != current_type and not (current_type == "heading" and kind == "paragraph"):
            blocks.append("\n".join(current))
            current = [line]
            current_type = kind
        else:
            current.append(line)
            current_type = kind if current_type is None else current_type

    if current:
        blocks.append("\n".join(current))
    return blocks


def _split_long_block(block: str, chunk_size: int) -> List[str]:
    if len(block) <= chunk_size:
        return [block]

    sentences = re.split(r"(?<=[.!?])\s+", block)
    chunks: List[str] = []
    current = ""

    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue

        if not current:
            current = sentence
            continue

        if len(current) + 1 + len(sentence) <= chunk_size:
            current = f"{current} {sentence}"
            continue

        chunks.append(current)
        current = sentence

        if len(current) > chunk_size:
            words = current.split()
            current = ""
            part = ""
            for word in words:
                if not part:
                    part = word
                elif len(part) + 1 + len(word) <= chunk_size:
                    part = f"{part} {word}"
                else:
                    chunks.append(part)
                    part = word
            current = part

    if current:
        chunks.append(current)
    return chunks


def _chunk_block(block: str, chunk_size: int) -> List[str]:
    if len(block) <= chunk_size:
        return [block]

    parts: List[str] = []
    for paragraph in block.split("\n\n"):
        paragraph = paragraph.strip()
        if not paragraph:
            continue
        if len(paragraph) <= chunk_size:
            parts.append(paragraph)
            continue
        if "\n" in paragraph:
            lines = paragraph.split("\n")
            current = ""
            for line in lines:
                if not current:
                    current = line
                    continue
                if len(current) + 1 + len(line) <= chunk_size:
                    current = f"{current}\n{line}"
                else:
                    parts.append(current)
                    current = line
            if current:
                parts.append(current)
        else:
            parts.extend(_split_long_block(paragraph, chunk_size))
    return parts


def chunk_text(text: str, chunk_size: int = 1000, overlap: int | None = None) -> List[str]:
    if chunk_size <= 0:
        return [text.strip()]

    if overlap is None:
        overlap = max(int(chunk_size * 0.15), 1)

    blocks = _split_structural_blocks(text)
    chunks: List[str] = []
    for block in blocks:
        if not block.strip():
            continue
        chunks.extend(_chunk_block(block, chunk_size))

    if overlap <= 0:
        return chunks

    overlapped: List[str] = []
    for index, chunk in enumerate(chunks):
        if index == 0:
            overlapped.append(chunk)
            continue
        prefix = chunks[index - 1][-overlap:]
        overlapped.append(f"{prefix}\n\n{chunk}")
    return overlapped


def iter_files(input_path: Path, exts=None):
    if input_path.is_file():
        yield input_path
        return
    for root, _, files in os.walk(input_path):
        for f in files:
            p = Path(root) / f
            if exts is None or p.suffix.lower() in exts:
                yield p


def process(
    input_path: str,
    output_dir: str,
    chunk_size: int = 1000,
    overlap: int | None = None,
    jsonl: bool = False,
):
    if overlap is None:
        overlap = max(int(chunk_size * 0.15), 1)

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
