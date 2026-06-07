"""Text extractor package.

Provides a pluggable interface to extract raw text from documents.
"""

from .extractors import extract_text_from_file, SUPPORTED_EXTENSIONS

__all__ = ["extract_text_from_file", "SUPPORTED_EXTENSIONS"]
