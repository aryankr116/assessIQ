import unittest
from unittest.mock import patch

import numpy as np

from backend.rag.classifier import classify_question


class ClassifierConfidenceTests(unittest.TestCase):
    def test_explicit_skill_cue_has_high_confidence(self):
        prototypes = (
            np.array([[0.0, 1.0]], dtype=np.float32),
            np.array([[0.0, 1.0]], dtype=np.float32),
        )

        with (
            patch("backend.rag.classifier._proto_embeddings", return_value=prototypes),
            patch(
                "backend.rag.classifier.embed_texts",
                return_value=np.array([[1.0, 0.0]], dtype=np.float32),
            ),
        ):
            result = classify_question("How would you implement X?")

        self.assertEqual(result.type, "skill")
        self.assertGreaterEqual(result.confidence, 0.93)

    def test_explicit_knowledge_cue_has_high_confidence(self):
        prototypes = (
            np.array([[0.0, 1.0]], dtype=np.float32),
            np.array([[0.0, 1.0]], dtype=np.float32),
        )

        with (
            patch("backend.rag.classifier._proto_embeddings", return_value=prototypes),
            patch(
                "backend.rag.classifier.embed_texts",
                return_value=np.array([[1.0, 0.0]], dtype=np.float32),
            ),
        ):
            result = classify_question("What is the definition of X?")

        self.assertEqual(result.type, "knowledge")
        self.assertGreaterEqual(result.confidence, 0.93)


if __name__ == "__main__":
    unittest.main()
