import unittest
from collections import Counter
from types import SimpleNamespace
from unittest.mock import patch

from backend.rag.pipeline import Question, RagPipeline


class QuestionBalanceTests(unittest.TestCase):
    def setUp(self):
        self.pipeline = object.__new__(RagPipeline)
        self.round_requests = []

    def _generate_round(self, _role, _prompt, _top_k, _docs, count, category, start, *_args):
        self.round_requests.append((category, count))
        questions = [
            Question(
                id=f"round-{start}-{i}",
                question=f"{category} question {i}",
                answer="Answer",
                type=category,
                confidence=0.9,
                answerable=True,
                sub_type="fundamentals",
                expected_time_seconds=30,
            )
            for i in range(count)
        ]
        return questions, 0.9

    def _generate(self, total):
        with patch.object(self.pipeline, "_generate_round", side_effect=self._generate_round):
            return self.pipeline.generate_qa(
                job_role="Engineer",
                prompt="Python",
                top_k=4,
                document_ids=["doc-1"],
                num_questions=total,
                question_type="both",
            )

    def test_even_total_has_equal_question_types_and_balanced_subtypes(self):
        result = self._generate(8)
        types = Counter(question.type for question in result.questions)
        subtypes = {
            kind: Counter(question.sub_type for question in result.questions if question.type == kind)
            for kind in ("knowledge", "skill")
        }

        self.assertEqual(types, {"knowledge": 4, "skill": 4})
        self.assertEqual(subtypes["knowledge"], {"fundamentals": 2, "understanding": 2})
        self.assertEqual(subtypes["skill"], {"apply": 2, "analyse": 2})
        self.assertEqual(self.round_requests, [("knowledge", 4), ("skill", 4)])

    def test_odd_total_gives_knowledge_and_first_subtypes_one_extra(self):
        result = self._generate(5)
        types = Counter(question.type for question in result.questions)
        subtypes = {
            kind: Counter(question.sub_type for question in result.questions if question.type == kind)
            for kind in ("knowledge", "skill")
        }

        self.assertEqual(types, {"knowledge": 3, "skill": 2})
        self.assertEqual(subtypes["knowledge"], {"fundamentals": 2, "understanding": 1})
        self.assertEqual(subtypes["skill"], {"apply": 1, "analyse": 1})
        self.assertEqual(self.round_requests, [("knowledge", 3), ("skill", 2)])

    def test_unavailable_category_is_not_replaced_by_mixed_questions(self):
        def partial_round(_role, _prompt, _top_k, _docs, count, category, start, *_args):
            if category == "skill":
                return [], 0.0
            return self._generate_round(
                _role, _prompt, _top_k, _docs, count, category, start
            )

        with patch.object(self.pipeline, "_generate_round", side_effect=partial_round):
            result = self.pipeline.generate_qa(
                job_role="Engineer",
                prompt="Python",
                top_k=4,
                document_ids=["doc-1"],
                num_questions=5,
                question_type="both",
            )

        self.assertEqual([question.type for question in result.questions], [])

    def test_single_category_requests_still_balance_its_subtypes(self):
        with patch.object(self.pipeline, "_generate_round", side_effect=self._generate_round):
            result = self.pipeline.generate_qa(
                job_role="Engineer",
                prompt="Python",
                top_k=4,
                document_ids=["doc-1"],
                num_questions=5,
                question_type="knowledge",
            )

        self.assertEqual(
            Counter(question.sub_type for question in result.questions),
            {"fundamentals": 3, "understanding": 2},
        )


if __name__ == "__main__":
    unittest.main()
