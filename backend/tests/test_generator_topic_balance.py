import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch

from backend.rag.generator import (
    OfflineProvider,
    OpenAIProvider,
    _build_user_prompt,
    _split_focus_topics,
    _topic_question_plan,
)
from backend.rag.retriever import RetrievedChunk


class GeneratorTopicBalanceTests(unittest.TestCase):
    def test_splits_prompt_into_requested_topics(self):
        self.assertEqual(
            _split_focus_topics("Linked list and trees,"),
            ["Linked list", "trees"],
        )

    def test_topic_plan_distributes_questions_and_respects_offset(self):
        topics = _split_focus_topics("Linked list and trees")

        plan = _topic_question_plan(topics, n=3, question_offset=1)

        self.assertIn("Question 2: trees", plan)
        self.assertIn("Question 3: Linked list", plan)
        self.assertIn("Question 4: trees", plan)

    def test_llm_prompt_requires_balanced_topic_coverage(self):
        prompt = _build_user_prompt(
            "Software Engineer",
            "Linked list and trees",
            [],
            n=4,
            question_offset=0,
        )

        self.assertIn("do not let the first topic dominate", prompt)
        self.assertIn("Question 1: Linked list", prompt)
        self.assertIn("Question 2: trees", prompt)
        self.assertIn("Question 3: Linked list", prompt)
        self.assertIn("Question 4: trees", prompt)

    def test_offline_generation_alternates_topics_across_rounds(self):
        contexts = [
            RetrievedChunk(
                doc_id="data-structures",
                doc_name="data-structures.pdf",
                chunk_id=i,
                text="A data structures passage supports grounded questions.",
                score=0.9,
            )
            for i in range(2)
        ]

        questions = OfflineProvider().generate(
            "Software Engineer",
            "Linked list and trees",
            contexts,
            n=2,
            question_offset=1,
        )

        self.assertIn('"trees"', questions[0].question)
        self.assertIn('"Linked list"', questions[1].question)

    def test_invalid_completed_response_is_not_retried(self):
        provider = object.__new__(OpenAIProvider)
        provider.client = Mock()
        provider.client.chat.completions.create.return_value = SimpleNamespace(
            choices=[
                SimpleNamespace(
                    message=SimpleNamespace(content="not valid JSON"),
                    finish_reason="stop",
                )
            ]
        )
        provider.model = "test-model"

        with patch("time.sleep") as sleep:
            questions = provider._generate_batch(
                "Software Engineer",
                "Linked list and trees",
                [],
                2,
                None,
            )

        self.assertEqual(questions, [])
        provider.client.chat.completions.create.assert_called_once()
        sleep.assert_not_called()


if __name__ == "__main__":
    unittest.main()
