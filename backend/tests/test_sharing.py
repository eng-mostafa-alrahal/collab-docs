from fastapi.testclient import TestClient


ALICE_HEADERS = {"X-User-Id": "1"}
BOB_HEADERS = {"X-User-Id": "2"}
CHARLIE_HEADERS = {"X-User-Id": "3"}


def test_sharing_viewer_vs_editor(client: TestClient) -> None:
    create_resp = client.post(
        "/api/documents",
        headers=ALICE_HEADERS,
        json={"title": "Shared Spec", "content_html": "<p>Start</p>"},
    )
    doc_id = create_resp.json()["id"]

    share_viewer = client.post(
        f"/api/documents/{doc_id}/shares",
        headers=ALICE_HEADERS,
        json={"target_user_id": 2, "role": "viewer"},
    )
    assert share_viewer.status_code == 200
    assert share_viewer.json()["role"] == "viewer"

    bob_get = client.get(f"/api/documents/{doc_id}", headers=BOB_HEADERS)
    assert bob_get.status_code == 200
    assert bob_get.json()["role"] == "viewer"

    bob_edit_denied = client.put(
        f"/api/documents/{doc_id}/content",
        headers=BOB_HEADERS,
        json={"content_html": "<p>Should fail</p>", "version": 1},
    )
    assert bob_edit_denied.status_code == 403

    share_editor = client.post(
        f"/api/documents/{doc_id}/shares",
        headers=ALICE_HEADERS,
        json={"target_user_id": 2, "role": "editor"},
    )
    assert share_editor.status_code == 200
    assert share_editor.json()["role"] == "editor"

    bob_edit_ok = client.put(
        f"/api/documents/{doc_id}/content",
        headers=BOB_HEADERS,
        json={"content_html": "<p>Updated by Bob</p>", "version": 1},
    )
    assert bob_edit_ok.status_code == 200
    assert bob_edit_ok.json()["content_html"] == "<p>Updated by Bob</p>"
    assert bob_edit_ok.json()["version"] == 2

    bob_list = client.get("/api/documents", headers=BOB_HEADERS).json()
    assert len(bob_list["owned"]) == 0
    assert len(bob_list["shared"]) == 1
    assert bob_list["shared"][0]["role"] == "editor"


def test_owner_can_revoke_access(client: TestClient) -> None:
    create_resp = client.post(
        "/api/documents",
        headers=ALICE_HEADERS,
        json={"title": "Revoke Test", "content_html": "<p>Content</p>"},
    )
    doc_id = create_resp.json()["id"]

    client.post(
        f"/api/documents/{doc_id}/shares",
        headers=ALICE_HEADERS,
        json={"target_user_id": 2, "role": "editor"},
    )
    assert client.get(f"/api/documents/{doc_id}", headers=BOB_HEADERS).status_code == 200

    revoke_resp = client.delete(f"/api/documents/{doc_id}/shares/2", headers=ALICE_HEADERS)
    assert revoke_resp.status_code == 204

    assert client.get(f"/api/documents/{doc_id}", headers=BOB_HEADERS).status_code == 403


def test_cannot_share_with_owner_or_as_non_owner(client: TestClient) -> None:
    create_resp = client.post(
        "/api/documents",
        headers=ALICE_HEADERS,
        json={"title": "Owner Guard", "content_html": "<p>Content</p>"},
    )
    doc_id = create_resp.json()["id"]

    self_share = client.post(
        f"/api/documents/{doc_id}/shares",
        headers=ALICE_HEADERS,
        json={"target_user_id": 1, "role": "editor"},
    )
    assert self_share.status_code == 400

    non_owner_share = client.post(
        f"/api/documents/{doc_id}/shares",
        headers=CHARLIE_HEADERS,
        json={"target_user_id": 2, "role": "viewer"},
    )
    assert non_owner_share.status_code == 403

