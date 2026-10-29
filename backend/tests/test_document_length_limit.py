import unittest
from unittest.mock import Mock, patch

import numpy as np

from backend.rag import pipeline as pipeline_module
from backend.rag.pipeline import RagPipeline


class DocumentLengthLimitTests(unittest.TestCase):
    def test_document_below_minimum_is_not_indexed(self):
        pipeline = object.__new__(RagPipeline)
        pipeline.dim = 2

        with (
            patch.object(pipeline_module.settings, "min_document_chars", 15_000),
            patch.object(pipeline_module, "extract_text_from_file", return_value="x" * 14_999),
            patch.object(pipeline_module, "clean_text", side_effect=lambda text: text),
            patch.object(pipeline_module, "chunk_text") as chunk_text,
            patch.object(pipeline_module, "embed_texts") as embed_texts,
        ):
            result = pipeline.ingest_document("short.txt", "doc1", "short.txt")

        self.assertEqual(result.chunk_count, 0)
        self.assertEqual(result.char_count, 14_999)
        self.assertIn("minimum 15000 required", result.excerpt)
        chunk_text.assert_not_called()
        embed_texts.assert_not_called()

    def test_document_at_minimum_is_indexed(self):
        pipeline = object.__new__(RagPipeline)
        pipeline.dim = 2
        pipeline.store = Mock()

        with (
            patch.object(pipeline_module.settings, "min_document_chars", 15_000),
            patch.object(pipeline_module, "extract_text_from_file", return_value="x" * 15_000),
            patch.object(pipeline_module, "clean_text", side_effect=lambda text: text),
            patch.object(pipeline_module, "chunk_text", return_value=["valid content"]),
            patch.object(
                pipeline_module,
                "embed_texts",
                return_value=np.array([[1.0, 0.0]], dtype=np.float32),
            ),
        ):
            result = pipeline.ingest_document("valid.txt", "doc2", "valid.txt")

        self.assertEqual(result.chunk_count, 1)
        self.assertEqual(result.char_count, 15_000)
        pipeline.store.add.assert_called_once()


if __name__ == "__main__":
    unittest.main()
