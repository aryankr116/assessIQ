import asyncio
from io import BytesIO
import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch

from fastapi import HTTPException
from starlette.datastructures import UploadFile

from backend.api import main
from backend.api.schemas import GenerateRequest


class JobDescriptionApiTests(unittest.TestCase):
    def test_profile_creation_extracts_and_persists_requirements(self):
        stored_profiles = {}
        stored_descriptions = {}
        store = SimpleNamespace(
            upsert_job_profile=lambda profile: stored_profiles.update(
                {profile["id"]: profile}
            ),
            upsert_job_description=lambda profile_id, text: stored_descriptions.update(
                {profile_id: text}
            ),
        )
        upload = UploadFile(
            filename="backend-role.pdf",
            file=BytesIO(b"%PDF-1.7 test"),
        )

        with (
            patch.object(main, "get_store", return_value=store),
            patch.object(
                main,
                "extract_text_from_file",
                return_value=(
                    "Backend Engineer skills include Python, PostgreSQL, and Docker. "
                    "Requires 5+ years of professional experience."
                ),
            ),
        ):
            profile = asyncio.run(
                main.create_job_profile_with_description(
                    name="Backend Engineer",
                    job_description=upload,
                    _={},
                )
            )

        self.assertEqual(profile["skills"], ["Python", "PostgreSQL", "Docker"])
        self.assertEqual(profile["experienceRequirement"], "5+ years")
        self.assertEqual(profile["difficultyLevel"], "intermediate")
        self.assertEqual(profile["jobDescriptionName"], "backend-role.pdf")
        self.assertEqual(profile["jobDescriptionWordCount"], 14)
        self.assertNotIn("jobDescriptionText", profile)
        self.assertIn(profile["id"], stored_descriptions)
        self.assertIn("Python, PostgreSQL, and Docker", stored_descriptions[profile["id"]])

    def test_job_description_can_be_replaced_after_profile_creation(self):
        stored_profiles = {
            "jp_1": {
                "id": "jp_1",
                "name": "Backend Engineer",
                "createdAt": "2026-01-01T00:00:00+00:00",
                "skills": ["Java"],
                "experienceRequirement": "2 years",
                "difficultyLevel": "beginner",
                "jobDescriptionName": "old-role.pdf",
                "jobDescriptionWordCount": 20,
            }
        }
        stored_descriptions = {}
        store = SimpleNamespace(
            job_profiles=stored_profiles,
            upsert_job_profile=lambda profile: stored_profiles.update(
                {profile["id"]: profile}
            ),
            upsert_job_description=lambda profile_id, text: stored_descriptions.update(
                {profile_id: text}
            ),
        )
        upload = UploadFile(
            filename="updated-role.pdf",
            file=BytesIO(b"%PDF-1.7 test"),
        )

        with (
            patch.object(main, "get_store", return_value=store),
            patch.object(
                main,
                "extract_text_from_file",
                return_value=(
                    "Senior Engineer skills include Python, PostgreSQL, and Docker. "
                    "Requires 5+ years of professional experience."
                ),
            ),
        ):
            profile = asyncio.run(
                main.update_job_description("jp_1", upload, _={})
            )

        self.assertEqual(profile["jobDescriptionName"], "updated-role.pdf")
        self.assertEqual(profile["skills"], ["Python", "PostgreSQL", "Docker"])
        self.assertEqual(profile["experienceRequirement"], "5+ years")
        self.assertEqual(profile["difficultyLevel"], "intermediate")
        self.assertEqual(profile["jobDescriptionWordCount"], 14)
        self.assertIn("Requires 5+ years", stored_descriptions["jp_1"])

    def test_job_description_detail_returns_saved_text_and_metadata(self):
        profile = {
            "id": "jp_1",
            "name": "Backend Engineer",
            "jobDescriptionName": "backend-role.pdf",
            "jobDescriptionWordCount": 8,
            "skills": ["Python"],
            "experienceRequirement": "3-5 years",
            "difficultyLevel": "intermediate",
        }
        store = SimpleNamespace(
            job_profiles={"jp_1": profile},
            get_job_description_text=lambda profile_id: (
                "Backend engineer using Python with 3-5 years experience."
            ),
        )

        with patch.object(main, "get_store", return_value=store):
            description = main.get_job_description("jp_1", _={})

        self.assertEqual(description["name"], "backend-role.pdf")
        self.assertEqual(description["wordCount"], 8)
        self.assertEqual(description["skills"], ["Python"])
        self.assertIn("using Python", description["text"])

    def test_job_description_can_be_removed_from_a_profile(self):
        stored_profiles = {
            "jp_1": {
                "id": "jp_1",
                "name": "Backend Engineer",
                "skills": ["Python"],
                "experienceRequirement": "3-5 years",
                "difficultyLevel": "intermediate",
                "jobDescriptionName": "backend-role.pdf",
                "jobDescriptionWordCount": 8,
            }
        }
        deleted_descriptions = []
        store = SimpleNamespace(
            job_profiles=stored_profiles,
            upsert_job_profile=lambda profile: stored_profiles.update(
                {profile["id"]: profile}
            ),
            delete_job_description=deleted_descriptions.append,
        )

        with patch.object(main, "get_store", return_value=store):
            result = main.delete_job_description("jp_1", _={})

        self.assertIsNone(result)
        self.assertIsNone(stored_profiles["jp_1"]["jobDescriptionName"])
        self.assertEqual(stored_profiles["jp_1"]["skills"], [])
        self.assertEqual(deleted_descriptions, ["jp_1"])

    def test_generation_uses_saved_profile_skills_and_experience(self):
        pipeline = Mock()
        pipeline.generate_qa.return_value = SimpleNamespace(questions=[])
        store = SimpleNamespace(
            job_profiles={
                "jp_1": {
                    "id": "jp_1",
                    "name": "Backend Engineer",
                    "skills": ["Python", "PostgreSQL"],
                    "experienceRequirement": "5+ years",
                    "difficultyLevel": "advanced",
                }
            },
            pipeline=pipeline,
        )
        request = GenerateRequest.model_validate(
            {
                "jobRole": "Incorrect client role",
                "jobProfileId": "jp_1",
                "prompt": "Ignore the saved profile",
                "documentIds": ["doc_1"],
                "numQuestions": 2,
                "questionType": "skill",
            }
        )

        with patch.object(main, "get_store", return_value=store):
            with self.assertRaises(HTTPException) as raised:
                main.generate_qa(request, {})

        self.assertEqual(raised.exception.status_code, 422)
        kwargs = pipeline.generate_qa.call_args.kwargs
        self.assertEqual(kwargs["job_role"], "Backend Engineer")
        self.assertEqual(kwargs["prompt"], "Python, PostgreSQL")
        self.assertEqual(kwargs["experience_requirement"], "5+ years")
        self.assertEqual(kwargs["difficulty_level"], "intermediate")

    def test_profile_listing_corrects_stale_saved_difficulty(self):
        store = SimpleNamespace(
            list_job_profiles=lambda: [
                {
                    "id": "jp_1",
                    "name": "Instructor - DSA",
                    "experienceRequirement": "3-5 years",
                    "difficultyLevel": "advanced",
                }
            ]
        )

        with patch.object(main, "get_store", return_value=store):
            profiles = main.list_job_profiles()

        self.assertEqual(profiles[0]["difficultyLevel"], "intermediate")

    def test_profile_creation_rejects_a_description_without_recognized_skills(self):
        store = SimpleNamespace(upsert_job_profile=Mock())
        upload = UploadFile(
            filename="role.pdf",
            file=BytesIO(b"%PDF-1.7 test"),
        )

        with (
            patch.object(main, "get_store", return_value=store),
            patch.object(
                main,
                "extract_text_from_file",
                return_value="A role description with no recognized skill terms.",
            ),
        ):
            with self.assertRaises(HTTPException) as raised:
                asyncio.run(
                    main.create_job_profile_with_description(
                        name="General Role",
                        job_description=upload,
                        _={},
                    )
                )

        self.assertEqual(raised.exception.status_code, 422)
        store.upsert_job_profile.assert_not_called()

    def test_job_description_reports_unreadable_pdf_instead_of_saving_placeholder(self):
        upload = UploadFile(
            filename="scanned-role.pdf",
            file=BytesIO(b"%PDF-1.7 test"),
        )

        with patch.object(main, "extract_text_from_file", return_value=""):
            with self.assertRaises(HTTPException) as raised:
                asyncio.run(main._extract_job_description(upload))

        self.assertEqual(raised.exception.status_code, 422)
        self.assertIn("No readable text", raised.exception.detail)


if __name__ == "__main__":
    unittest.main()
