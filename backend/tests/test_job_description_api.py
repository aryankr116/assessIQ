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
        store = SimpleNamespace(
            upsert_job_profile=lambda profile: stored_profiles.update(
                {profile["id"]: profile}
            )
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
        self.assertNotIn("jobDescriptionText", profile)

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


if __name__ == "__main__":
    unittest.main()
