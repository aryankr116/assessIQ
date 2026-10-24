import unittest
from types import SimpleNamespace
from unittest.mock import patch

import numpy as np

from backend.rag import pipeline as pipeline_module
from backend.rag.pipeline import RagPipeline
from backend.rag.retriever import RetrievedChunk


class FakeRetriever:
    def __init__(self, contexts):
        self.contexts = contexts
        self.last_query = None

    def retrieve(self, query, k, doc_ids=None):
        self.last_query = query
        return self.contexts


class ScopeFilteringTests(unittest.TestCase):
    def setUp(self):
        self.pipeline = object.__new__(RagPipeline)
        self.pipeline.dim = 2

    def test_custom_prompt_with_irrelevant_context_skips_generation(self):
        self.pipeline.retriever = FakeRetriever(
            [
                RetrievedChunk(
                    doc_id="cookbook",
                    doc_name="cookbook.pdf",
                    chunk_id=0,
                    text="Recipes and cooking instructions.",
                    score=0.04,
                )
            ]
        )

        with patch.object(pipeline_module, "get_generator") as get_generator:
            questions, score = self.pipeline._generate_round(
                "Chef", "Linked Lists, Arrays", 6, ["cookbook"], 2, None, 1
            )

        self.assertEqual(questions, [])
        self.assertEqual(score, 0.04)
        self.assertEqual(self.pipeline.retriever.last_query, "Linked Lists, Arrays")
        get_generator.assert_not_called()

    def test_custom_prompt_rejects_incidental_match_above_base_threshold(self):
        self.pipeline.retriever = FakeRetriever(
            [
                RetrievedChunk(
                    doc_id="cookbook",
                    doc_name="cookbook.pdf",
                    chunk_id=0,
                    text="A recipe lists ingredients and preparation steps.",
                    score=0.30,
                )
            ]
        )

        with patch.object(pipeline_module, "get_generator") as get_generator:
            questions, score = self.pipeline._generate_round(
                "Chef", "Linked Lists, Arrays", 6, ["cookbook"], 2, None, 1
            )

        self.assertEqual(questions, [])
        self.assertEqual(score, 0.30)
        get_generator.assert_not_called()

    def test_ungrounded_generated_question_is_excluded(self):
        self.pipeline.retriever = FakeRetriever(
            [
                RetrievedChunk(
                    doc_id="data-structures",
                    doc_name="data-structures.pdf",
                    chunk_id=0,
                    text="Linked lists store nodes connected by references.",
                    score=0.9,
                )
            ]
        )
        generated = SimpleNamespace(
            question="What does a linked list store?",
            answer="A list of unrelated cooking recipes.",
            answerable=True,
            options=["A", "B", "C", "D"],
            correct_option=0,
            explanation="This answer is not supported by the passage.",
            sub_type="fundamentals",
        )

        def embed_texts(texts):
            if texts == ["Linked lists store nodes connected by references."]:
                return np.array([[1.0, 0.0]], dtype=np.float32)
            return np.array([[0.0, 1.0]], dtype=np.float32)

        with (
            patch.object(pipeline_module, "get_generator") as get_generator,
            patch.object(pipeline_module, "embed_texts", side_effect=embed_texts),
        ):
            get_generator.return_value.generate.return_value = [generated]
            questions, _ = self.pipeline._generate_round(
                "Software Engineer", "Linked Lists", 6, ["data-structures"], 1, None, 1
            )

        self.assertEqual(questions, [])

    def test_model_marked_unanswerable_question_is_excluded(self):
        self.pipeline.retriever = FakeRetriever(
            [
                RetrievedChunk(
                    doc_id="data-structures",
                    doc_name="data-structures.pdf",
                    chunk_id=0,
                    text="Linked lists store nodes connected by references.",
                    score=0.9,
                )
            ]
        )
        generated = SimpleNamespace(
            question="What does a linked list store?",
            answer="Nodes connected by references.",
            answerable=False,
            options=["A", "B", "C", "D"],
            correct_option=0,
            explanation="The model marked this question unanswerable.",
            sub_type="fundamentals",
        )
        matching_embeddings = np.array([[1.0, 0.0]], dtype=np.float32)

        with (
            patch.object(pipeline_module, "get_generator") as get_generator,
            patch.object(
                pipeline_module,
                "embed_texts",
                return_value=matching_embeddings,
            ),
        ):
            get_generator.return_value.generate.return_value = [generated]
            questions, _ = self.pipeline._generate_round(
                "Software Engineer", "Linked Lists", 6, ["data-structures"], 1, None, 1
            )

        self.assertEqual(questions, [])


if __name__ == "__main__":
    unittest.main()
