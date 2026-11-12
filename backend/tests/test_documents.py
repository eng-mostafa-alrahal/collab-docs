from fastapi.testclient import TestClient


ALICE_HEADERS = {"X-User-Id": "1"}
BOB_HEADERS = {"X-User-Id": "2"}
CHARLIE_HEADERS = {"X-User-Id": "3"}


def test_list_demo_users(client: TestClient) -> None:
    response = client.get("/api/users")
    assert response.status_code == 200
    users = response.json()
    assert [u["email"] for u in users] == [
        "alice@ajaia.dev",
        "bob@ajaia.dev",
        "charlie@ajaia.dev",
    ]


def test_missing_or_invalid_identity_returns_401(client: TestClient) -> None:
    assert client.get("/api/documents").status_code == 401
    assert client.get("/api/documents", headers={"X-User-Id": "abc"}).status_code == 401
    assert client.get("/api/documents", headers={"X-User-Id": "999"}).status_code == 401


def test_create_and_fetch_document(client: TestClient) -> None:
    create_resp = client.post(
        "/api/documents",
        headers=ALICE_HEADERS,
        json={"title": "Project Plan", "content_html": "<p>Initial draft</p>"},
    )
    assert create_resp.status_code == 201
    created = create_resp.json()
    assert created["title"] == "Project Plan"
    assert created["content_html"] == "<p>Initial draft</p>"
    assert created["role"] == "owner"
    assert created["version"] == 1

    fetch_resp = client.get(f"/api/documents/{created['id']}", headers=ALICE_HEADERS)
    assert fetch_resp.status_code == 200
    fetched = fetch_resp.json()
    assert fetched["title"] == "Project Plan"
    assert fetched["content_html"] == "<p>Initial draft</p>"
    assert fetched["role"] == "owner"


def test_document_preserves_rich_text(client: TestClient) -> None:
    rich_html = (
        "<h1>Project Plan</h1>"
        "<p><strong>Important</strong> content with <em>emphasis</em> and <u>underline</u>.</p>"
        "<ul><li>Task A</li><li>Task B</li></ul>"
    )
    create_resp = client.post(
        "/api/documents",
        headers=ALICE_HEADERS,
        json={"title": "Rich Doc", "content_html": rich_html},
    )
    assert create_resp.status_code == 201
    doc_id = create_resp.json()["id"]

    fetch_resp = client.get(f"/api/documents/{doc_id}", headers=ALICE_HEADERS)
    assert fetch_resp.status_code == 200
    html = fetch_resp.json()["content_html"]
    assert "<h1>Project Plan</h1>" in html
    assert "<strong>Important</strong>" in html
    assert "<em>emphasis</em>" in html
    assert "<u>underline</u>" in html
    assert "<ul><li>Task A</li><li>Task B</li></ul>" in html


def test_unauthorized_user_gets_403(client: TestClient) -> None:
    create_resp = client.post(
        "/api/documents",
        headers=ALICE_HEADERS,
        json={"title": "Private Notes", "content_html": "<p>Secret</p>"},
    )
    doc_id = create_resp.json()["id"]

    get_resp = client.get(f"/api/documents/{doc_id}", headers=CHARLIE_HEADERS)
    assert get_resp.status_code == 403

    put_resp = client.put(
        f"/api/documents/{doc_id}/content",
        headers=CHARLIE_HEADERS,
        json={"content_html": "<p>Hacked</p>", "version": 1},
    )
    assert put_resp.status_code == 403


def test_document_content_is_sanitized(client: TestClient) -> None:
    create_resp = client.post(
        "/api/documents",
        headers=ALICE_HEADERS,
        json={"title": "Sanitization Test", "content_html": "<p>Clean</p>"},
    )
    doc_id = create_resp.json()["id"]

    dirty_html = (
        '<h1>Safe Heading</h1>'
        '<p onclick="alert(1)">Hello <strong>world</strong></p>'
        '<script>alert("xss")</script>'
        '<a href="javascript:alert(2)">Bad link</a>'
        '<a href="https://example.com">Good link</a>'
    )
    update_resp = client.put(
        f"/api/documents/{doc_id}/content",
        headers=ALICE_HEADERS,
        json={"content_html": dirty_html, "version": 1},
    )
    assert update_resp.status_code == 200
    sanitized = update_resp.json()["content_html"]
    assert "<script>" not in sanitized
    assert "onclick" not in sanitized
    assert "javascript:" not in sanitized
    assert "<h1>Safe Heading</h1>" in sanitized
    assert "<strong>world</strong>" in sanitized
    assert "https://example.com" in sanitized


def test_stale_document_version_returns_conflict(client: TestClient) -> None:
    create_resp = client.post(
        "/api/documents",
        headers=ALICE_HEADERS,
        json={"title": "Concurrent Doc", "content_html": "<p>v1</p>"},
    )
    doc = create_resp.json()
    doc_id = doc["id"]
    assert doc["version"] == 1

    client.post(
        f"/api/documents/{doc_id}/shares",
        headers=ALICE_HEADERS,
        json={"target_user_id": 2, "role": "editor"},
    )

    alice_save = client.put(
        f"/api/documents/{doc_id}/content",
        headers=ALICE_HEADERS,
        json={"content_html": "<p>v2 by Alice</p>", "version": 1},
    )
    assert alice_save.status_code == 200
    assert alice_save.json()["version"] == 2

    bob_stale_save = client.put(
        f"/api/documents/{doc_id}/content",
        headers=BOB_HEADERS,
        json={"content_html": "<p>stale edit by Bob</p>", "version": 1},
    )
    assert bob_stale_save.status_code == 409


def test_rename_and_delete_require_owner(client: TestClient) -> None:
    create_resp = client.post(
        "/api/documents",
        headers=ALICE_HEADERS,
        json={"title": "Original Title", "content_html": "<p>Body</p>"},
    )
    doc_id = create_resp.json()["id"]

    client.post(
        f"/api/documents/{doc_id}/shares",
        headers=ALICE_HEADERS,
        json={"target_user_id": 2, "role": "editor"},
    )

    assert (
        client.patch(
            f"/api/documents/{doc_id}",
            headers=BOB_HEADERS,
            json={"title": "Bob Rename"},
        ).status_code
        == 403
    )
    assert (
        client.delete(f"/api/documents/{doc_id}", headers=BOB_HEADERS).status_code == 403
    )

    rename_resp = client.patch(
        f"/api/documents/{doc_id}",
        headers=ALICE_HEADERS,
        json={"title": "Renamed Title"},
    )
    assert rename_resp.status_code == 200
    assert rename_resp.json()["title"] == "Renamed Title"

    delete_resp = client.delete(f"/api/documents/{doc_id}", headers=ALICE_HEADERS)
    assert delete_resp.status_code == 204
    assert client.get(f"/api/documents/{doc_id}", headers=ALICE_HEADERS).status_code == 404

