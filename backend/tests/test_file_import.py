from fastapi.testclient import TestClient


ALICE_HEADERS = {"X-User-Id": "1"}


def test_markdown_file_upload_conversion(client: TestClient) -> None:
    md_content = "# Sprint Plan\n\n- Task A\n- Task B\n"
    response = client.post(
        "/api/documents/import",
        headers=ALICE_HEADERS,
        files={"file": ("sprint_plan.md", md_content.encode("utf-8"), "text/markdown")},
    )
    assert response.status_code == 201
    doc = response.json()
    assert doc["title"] == "sprint_plan"
    assert doc["source_filename"] == "sprint_plan.md"
    assert doc["owner_id"] == 1
    assert doc["role"] == "owner"
    assert "<h1>Sprint Plan</h1>" in doc["content_html"]
    assert "<ul>" in doc["content_html"]
    assert "<li>Task A</li>" in doc["content_html"]
    assert "<li>Task B</li>" in doc["content_html"]


def test_txt_file_upload_escapes_html(client: TestClient) -> None:
    txt_content = "Hello <script>alert(1)</script>\nLine two\n\nSecond paragraph"
    response = client.post(
        "/api/documents/import",
        headers=ALICE_HEADERS,
        files={"file": ("notes.txt", txt_content.encode("utf-8"), "text/plain")},
    )
    assert response.status_code == 201
    doc = response.json()
    assert doc["title"] == "notes"
    assert doc["source_filename"] == "notes.txt"
    assert "<script>" not in doc["content_html"]
    assert "&lt;script&gt;alert(1)&lt;/script&gt;" in doc["content_html"]
    assert "<br>" in doc["content_html"]
    assert "<p>Second paragraph</p>" in doc["content_html"]


def test_unsupported_file_upload_rejected(client: TestClient) -> None:
    response = client.post(
        "/api/documents/import",
        headers=ALICE_HEADERS,
        files={"file": ("malware.exe", b"MZ...", "application/octet-stream")},
    )
    assert response.status_code == 400


def test_file_upload_size_limit(client: TestClient) -> None:
    oversized = b"a" * (2 * 1024 * 1024 + 10)
    response = client.post(
        "/api/documents/import",
        headers=ALICE_HEADERS,
        files={"file": ("huge.txt", oversized, "text/plain")},
    )
    assert response.status_code == 413


def test_invalid_utf8_file_rejected(client: TestClient) -> None:
    response = client.post(
        "/api/documents/import",
        headers=ALICE_HEADERS,
        files={"file": ("bad.txt", b"\xff\xfe\x00\x01", "text/plain")},
    )
    assert response.status_code == 400

