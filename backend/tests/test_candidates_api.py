from fastapi.testclient import TestClient

from backend.api.main import app
from backend.api.store import get_store

client = TestClient(app)


def test_candidate_crud_round_trip():
    store = get_store()
    store.candidates.clear()
    store.persist()

    payload = {
        "name": "Alice Example",
        "email": "alice@example.com",
        "targetRole": "Frontend Engineer",
        "resumeName": "alice_resume.pdf",
        "resumeExt": ".pdf",
        "resumeSizeBytes": 2048,
        "skills": ["React", "TypeScript"],
        "experienceYears": 4,
        "summary": "Strong frontend engineer.",
    }

    create_response = client.post("/api/candidates", json=payload)
    assert create_response.status_code == 200, create_response.text
    created = create_response.json()
    assert created["name"] == payload["name"]
    assert created["email"] == payload["email"]
    assert created["targetRole"] == payload["targetRole"]

    list_response = client.get("/api/candidates")
    assert list_response.status_code == 200, list_response.text
    data = list_response.json()
    assert any(item["id"] == created["id"] for item in data)

    delete_response = client.delete(f"/api/candidates/{created['id']}")
    assert delete_response.status_code == 204, delete_response.text

    remaining = client.get("/api/candidates")
    assert remaining.status_code == 200, remaining.text
    assert all(item["id"] != created["id"] for item in remaining.json())

    repeat_delete_response = client.delete(f"/api/candidates/{created['id']}")
    assert repeat_delete_response.status_code == 204, repeat_delete_response.text


def test_delete_document_is_idempotent():
    store = get_store()
    store.documents.clear()
    store.persist()

    doc_id = "doc_missing"
    doc = {
        "id": doc_id,
        "name": "ghost.pdf",
        "ext": ".pdf",
        "sizeBytes": 1,
        "status": "indexed",
        "uploadedAt": "2026-08-30T00:00:00Z",
        "excerpt": "",
    }
    store.documents[doc_id] = doc
    store.persist()

    first = client.delete(f"/api/documents/{doc_id}")
    assert first.status_code == 204, first.text

    second = client.delete(f"/api/documents/{doc_id}")
    assert second.status_code == 204, second.text
