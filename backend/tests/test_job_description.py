import unittest
from types import SimpleNamespace

from backend.rag.generator import OfflineProvider, _build_user_prompt
from backend.rag.generator import _balanced_subtype_plan
from backend.rag.job_description import (
    experience_difficulty_level,
    extract_experience_requirement,
    extract_skills,
)


class JobDescriptionExtractionTests(unittest.TestCase):
    def test_extracts_unique_skills_in_document_order(self):
        skills = extract_skills(
            "Required: JavaScript, Python, PostgreSQL, and AWS. "
            "Experience with Python is preferred."
        )

        self.assertEqual(skills, ["JavaScript", "Python", "PostgreSQL", "AWS"])

    def test_does_not_treat_common_go_verb_as_skill(self):
        self.assertEqual(extract_skills("You will go to market with the team."), [])
        self.assertEqual(extract_skills("Experience building services in Go."), ["Go"])

    def test_maps_experience_to_three_question_difficulty_bands(self):
        cases = {
            "Required: 0-2 years of experience.": ("0-2 years", "beginner"),
            "At least 2 years of experience.": ("2+ years", "beginner"),
            "Required: 3-5 years of experience.": ("3-5 years", "intermediate"),
            "5+ years of professional experience.": ("5+ years", "intermediate"),
            "More than 5 years of experience.": ("6+ years", "advanced"),
            "6+ years of experience.": ("6+ years", "advanced"),
        }
        for description, expected in cases.items():
            with self.subTest(description=description):
                self.assertEqual(extract_experience_requirement(description), expected)

    def test_missing_experience_keeps_normal_question_level(self):
        self.assertEqual(
            extract_experience_requirement("Skills include Python and SQL."),
            (None, None),
        )
        self.assertEqual(
            extract_experience_requirement("5 years' experience"),
            ("5 years", "intermediate"),
        )
        self.assertEqual(experience_difficulty_level("3-5 years"), "intermediate")
        self.assertEqual(experience_difficulty_level("5+ years"), "intermediate")
        self.assertEqual(experience_difficulty_level("6+ years"), "advanced")
        self.assertIsNone(experience_difficulty_level(None))

    def test_generation_prompt_calibrates_to_experience_requirement(self):
        context = SimpleNamespace(doc_name="engineering.pdf", chunk_id=0, text="Python")
        prompt = _build_user_prompt(
            "Backend Engineer",
            "Python, PostgreSQL",
            [context],
            2,
            "knowledge",
            experience_requirement="5+ years",
            difficulty_level="intermediate",
        )

        self.assertIn("requires 5+ years of experience", prompt)
        self.assertIn("Use both knowledge sub-types", prompt)

    def test_generation_without_experience_keeps_standard_guidance(self):
        context = SimpleNamespace(doc_name="engineering.pdf", chunk_id=0, text="Python")
        prompt = _build_user_prompt(
            "Backend Engineer",
            "Python",
            [context],
            2,
            "knowledge",
        )

        self.assertNotIn("Experience calibration:", prompt)
        self.assertIn("Mix the sub-types across the set", prompt)

    def test_generation_prompt_separates_foundational_and_intermediate_difficulty(self):
        context = SimpleNamespace(doc_name="engineering.pdf", chunk_id=0, text="Python")
        beginner_prompt = _build_user_prompt(
            "Backend Engineer", "Python", [context], 1, "skill",
            difficulty_level="beginner",
        )
        intermediate_prompt = _build_user_prompt(
            "Backend Engineer", "Python", [context], 1, "skill",
            difficulty_level="intermediate",
        )

        self.assertIn("DIFFICULTY: FOUNDATIONAL / EASY", beginner_prompt)
        self.assertIn("one straightforward action", beginner_prompt)
        self.assertIn("DIFFICULTY: INTERMEDIATE", intermediate_prompt)
        self.assertIn("one core concept", intermediate_prompt)
        self.assertIn("those are advanced", intermediate_prompt)
        self.assertIn("Use both apply and analyse skill sub-types", intermediate_prompt)
        self.assertIn("limited, practical reasoning", intermediate_prompt)

    def test_generation_prompt_assigns_balanced_subtypes_by_question_number(self):
        context = SimpleNamespace(doc_name="engineering.pdf", chunk_id=0, text="Python")
        prompt = _build_user_prompt(
            "Backend Engineer",
            "Python",
            [context],
            5,
            "knowledge",
        )

        self.assertIn("- Question 1: fundamentals", prompt)
        self.assertIn("- Question 2: understanding", prompt)
        self.assertIn("- Question 5: fundamentals", prompt)

    def test_offline_generation_uses_advanced_subtypes(self):
        contexts = [
            SimpleNamespace(text=f"Context passage about Python topic {i}.")
            for i in range(4)
        ]
        generated = OfflineProvider().generate(
            "Backend Engineer",
            "Python",
            contexts,
            4,
            "skill",
            difficulty_level="advanced",
        )

        self.assertEqual(
            [question.sub_type for question in generated],
            ["apply", "analyse", "apply", "analyse"],
        )

    def test_offline_generation_uses_intermediate_subtypes(self):
        contexts = [SimpleNamespace(text=f"Context passage about Python topic {i}.") for i in range(4)]
        generated = OfflineProvider().generate(
            "Backend Engineer",
            "Python",
            contexts,
            4,
            "knowledge",
            difficulty_level="intermediate",
        )

        self.assertEqual(
            [question.sub_type for question in generated],
            ["fundamentals", "understanding", "fundamentals", "understanding"],
        )

    def test_intermediate_skill_generation_keeps_bounded_analyse_questions(self):
        contexts = [SimpleNamespace(text=f"Context passage about Python topic {i}.") for i in range(6)]
        generated = OfflineProvider().generate(
            "Backend Engineer",
            "Python",
            contexts,
            6,
            "skill",
            difficulty_level="intermediate",
        )

        self.assertEqual({question.sub_type for question in generated}, {"apply", "analyse"})
        analyse_questions = [
            question.question for question in generated if question.sub_type == "analyse"
        ]
        self.assertTrue(all("routine" in question or "common" in question or "familiar" in question
                            for question in analyse_questions))

    def test_offline_generation_uses_beginner_subtypes(self):
        contexts = [SimpleNamespace(text=f"Context passage about Python topic {i}.") for i in range(4)]
        generated = OfflineProvider().generate(
            "Backend Engineer",
            "Python",
            contexts,
            4,
            "skill",
            difficulty_level="beginner",
        )

        self.assertEqual(
            [question.sub_type for question in generated],
            ["apply", "analyse", "apply", "analyse"],
        )

    def test_subtype_plan_balances_even_and_odd_counts(self):
        self.assertEqual(
            _balanced_subtype_plan("knowledge", 4),
            ["fundamentals", "understanding", "fundamentals", "understanding"],
        )
        self.assertEqual(
            _balanced_subtype_plan("knowledge", 5),
            ["fundamentals", "understanding", "fundamentals", "understanding", "fundamentals"],
        )
        self.assertEqual(
            _balanced_subtype_plan("skill", 5),
            ["apply", "analyse", "apply", "analyse", "apply"],
        )

    def test_offline_beginner_and_intermediate_questions_are_distinct(self):
        context = [SimpleNamespace(text="Python supports asynchronous programming.")]
        provider = OfflineProvider()

        beginner = provider.generate(
            "Backend Engineer", "Python", context, 1, "skill",
            difficulty_level="beginner",
        )[0]
        intermediate = provider.generate(
            "Backend Engineer", "Python", context, 1, "skill",
            difficulty_level="intermediate",
        )[0]

        self.assertEqual(beginner.sub_type, "apply")
        self.assertEqual(intermediate.sub_type, "apply")
        self.assertNotEqual(beginner.question, intermediate.question)

    def test_offline_intermediate_and_advanced_questions_are_distinct(self):
        context = [SimpleNamespace(text="Python supports asynchronous programming.")]
        provider = OfflineProvider()

        intermediate = provider.generate(
            "Backend Engineer", "Python", context, 1, "skill",
            difficulty_level="intermediate",
        )[0]
        advanced = provider.generate(
            "Backend Engineer", "Python", context, 1, "skill",
            difficulty_level="advanced",
        )[0]

        self.assertEqual(intermediate.sub_type, "apply")
        self.assertEqual(advanced.sub_type, "apply")
        self.assertNotEqual(intermediate.question, advanced.question)


if __name__ == "__main__":
    unittest.main()
