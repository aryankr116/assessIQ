"""CLI to batch-extract raw text from documents.

Usage example:
  python -m backend.text_extractor.cli --input docs/ --output extracted/
"""

import argparse
import json
import os
from pathlib import Path

from .extractors import extract_text_from_file, SUPPORTED_EXTENSIONS, file_metadata


def iter_files(input_path: Path):
    if input_path.is_file():
        yield input_path
        return
    for root, _, files in os.walk(input_path):
        for f in files:
            p = Path(root) / f
            if p.suffix.lower() in SUPPORTED_EXTENSIONS:
                yield p


def process(input_path: str, output_dir: str, overwrite: bool = False):
    inp = Path(input_path)
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)

    for p in iter_files(inp):
        try:
            text = extract_text_from_file(str(p))
        except Exception as e:
            print(f"Skipping {p}: {e}")
            continue
        meta = file_metadata(str(p))
        record = {"source": str(p), "text": text, "meta": meta}
        out_file = out / (p.name + ".json")
        if out_file.exists() and not overwrite:
            print(f"Exists {out_file}, skipping")
            continue
        with open(out_file, "w", encoding="utf-8") as f:
            json.dump(record, f, ensure_ascii=False, indent=2)
        print(f"Wrote {out_file}")


def main():
    parser = argparse.ArgumentParser(description="Batch extract raw text from documents")
    parser.add_argument("--input", "-i", required=True, help="Input file or directory")
    parser.add_argument("--output", "-o", required=True, help="Output directory for JSON files")
    parser.add_argument("--overwrite", action="store_true", help="Overwrite existing outputs")
    args = parser.parse_args()
    process(args.input, args.output, overwrite=args.overwrite)


if __name__ == "__main__":
    main()
