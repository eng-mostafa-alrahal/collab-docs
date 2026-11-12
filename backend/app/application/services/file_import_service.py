from pathlib import Path
from fastapi import UploadFile
from app.application.services.document_service import to_document_detail
from app.domain.exceptions import PayloadTooLargeError, ValidationError
from app.infrastructure.file_processing.html_sanitizer import sanitize_html
from app.infrastructure.file_processing.markdown_parser import (
    markdown_to_html,
    plain_text_to_html,
)
from app.infrastructure.models.user import User
from app.infrastructure.repositories.document_repository import DocumentRepository
from app.schemas.document import DocumentDetailResponse

ALLOWED_EXTENSIONS = {".txt", ".md"}
CHUNK_SIZE = 64 * 1024  # 64 KB


class FileImportService:
    def __init__(self, document_repo: DocumentRepository, max_upload_size: int) -> None:
        self.document_repo = document_repo
        self.max_upload_size = max_upload_size

    async def import_file(self, user: User, file: UploadFile) -> DocumentDetailResponse:
        raw_filename = (file.filename or "").strip()
        normalized_filename = Path(raw_filename).name
        if not normalized_filename:
            raise ValidationError("Uploaded file must have a valid filename.")

        extension = Path(normalized_filename).suffix.lower()
        if extension not in ALLOWED_EXTENSIONS:
            raise ValidationError(
                "Unsupported file format. Only .txt and .md files are supported."
            )

        chunks: list[bytes] = []
        total_size = 0
        while True:
            chunk = await file.read(CHUNK_SIZE)
            if not chunk:
                break
            total_size += len(chunk)
            if total_size > self.max_upload_size:
                raise PayloadTooLargeError(
                    f"File exceeds the maximum allowed size of {self.max_upload_size // (1024 * 1024)} MB."
                )
            chunks.append(chunk)

        raw_bytes = b"".join(chunks)
        try:
            text_content = raw_bytes.decode("utf-8")
        except UnicodeDecodeError as exc:
            raise ValidationError("File content must be valid UTF-8 text.") from exc

        if extension == ".md":
            raw_html = markdown_to_html(text_content)
        else:
            raw_html = plain_text_to_html(text_content)

        sanitized_html = sanitize_html(raw_html) or "<p></p>"
        title = (Path(normalized_filename).stem.strip() or "Untitled Document")[:255]
        stored_filename = normalized_filename[:255]

        document = self.document_repo.create(
            owner_id=user.id,
            title=title,
            content_html=sanitized_html,
            source_filename=stored_filename,
        )
        return to_document_detail(document, "owner")

