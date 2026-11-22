# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Recruiters and hiring managers preparing role-specific interviews from company documents. Administrators manage users and system settings.

## Product Purpose

AssessIQ helps hiring teams prepare role-specific interview questions and answers from uploaded company materials. Success means questions are relevant to the role and answers remain connected to material the team can review.

## Positioning

AssessIQ combines document-grounded interview preparation and source traceability with host-side processing. The product is intended to make both evidence and data handling clear to its users.

## Operating Context

Recruiters create job profiles, upload company documents, generate interview question sets, review answers and source excerpts, rate questions, and export results. Administrators manage accounts and generation settings. The frontend can run in demo mode or with the FastAPI backend.

## Capabilities and Constraints

- Generated questions are classified as Knowledge or Skill questions.
- Answers include source references; out-of-scope requests are flagged rather than answered.
- Supported users are recruiters and administrators.
- UI work must not change backend behavior or product functionality unless explicitly requested.

## Brand Commitments

- Use the AssessIQ name and existing logo assets.
- The user-selected interface direction is The Interview Fieldbook: charcoal navigation (`#171411`), warm paper (`#F0E7D7`), ink (`#25201B`), rubric red (`#C45B3D`), and brass (`#D8B36E`).
- Illustrations should be familiar and understandable to non-technical users.
- Avoid generic, templated AI visual patterns; make choices specific to AssessIQ.

## Evidence on Hand

- Existing brand assets: `frontend/public/assessIQ logo.jpg` and `frontend/public/icon.png`.
- The repository includes sample documents and mock data for demonstration.
- No customer testimonials, external benchmarks, or independently verified performance claims are present; do not invent them.

## Product Principles

- Base interview questions and answers on the uploaded company materials.
- Keep answer sources reviewable and identify out-of-scope questions.
- Make privacy and host-side processing central to the product experience.
- Preserve existing functionality during visual redesigns.
