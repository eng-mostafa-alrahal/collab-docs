from datetime import datetime, timezone
from app.domain.exceptions import ConflictError, NotFoundError, ValidationError
from app.domain.policies.document_policy import (
    DocumentRole,
    require_edit_access,
    require_owner_access,
    require_read_access,
    resolve_user_role,
)
from app.infrastructure.file_processing.html_sanitizer import sanitize_html
from app.infrastructure.models.document import DEFAULT_DOCUMENT_CONTENT, Document
from app.infrastructure.models.user import User
from app.infrastructure.repositories.document_repository import DocumentRepository
from app.infrastructure.repositories.sharing_repository import SharingRepository
from app.schemas.document import (
    DocumentContentUpdateRequest,
    DocumentCreateRequest,
    DocumentDetailResponse,
    DocumentListResponse,
    DocumentRenameRequest,
    DocumentSummary,
)
from app.schemas.sharing import ShareInfo


def _map_shares(document: Document) -> list[ShareInfo]:
    return [
        ShareInfo(
            user_id=share.user_id,
            name=share.user.name,
            email=share.user.email,
            avatar_color=share.user.avatar_color,
            role=share.role,  # type: ignore[arg-type]
        )
        for share in document.shares
        if share.user is not None
    ]


def to_document_summary(document: Document, role: DocumentRole) -> DocumentSummary:
    return DocumentSummary(
        id=document.id,
        title=document.title,
        owner_id=document.owner_id,
        owner_name=document.owner.name,
        owner_avatar_color=document.owner.avatar_color,
        role=role,
        source_filename=document.source_filename,
        updated_at=document.updated_at,
        shares=_map_shares(document),
    )


def to_document_detail(document: Document, role: DocumentRole) -> DocumentDetailResponse:
    return DocumentDetailResponse(
        id=document.id,
        title=document.title,
        owner_id=document.owner_id,
        owner_name=document.owner.name,
        owner_avatar_color=document.owner.avatar_color,
        role=role,
        source_filename=document.source_filename,
        updated_at=document.updated_at,
        shares=_map_shares(document),
        content_html=document.content_html,
        created_at=document.created_at,
        version=document.version,
    )


class DocumentService:
    def __init__(
        self,
        document_repo: DocumentRepository,
        sharing_repo: SharingRepository,
    ) -> None:
        self.document_repo = document_repo
        self.sharing_repo = sharing_repo

    def _get_document_or_404(self, document_id: int) -> Document:
        document = self.document_repo.get_by_id_with_relations(document_id)
        if document is None:
            raise NotFoundError("Document not found.")
        return document

    def _resolve_role(self, user_id: int, document: Document) -> DocumentRole | None:
        share = self.sharing_repo.get_share(document.id, user_id)
        return resolve_user_role(
            user_id=user_id,
            owner_id=document.owner_id,
            share_role=share.role if share else None,
        )

    def list_documents(self, user: User) -> DocumentListResponse:
        owned_docs = self.document_repo.list_owned(user.id)
        shared_docs = self.document_repo.list_shared_with_user(user.id)

        return DocumentListResponse(
            owned=[to_document_summary(doc, "owner") for doc in owned_docs],
            shared=[
                to_document_summary(doc, role)  # type: ignore[arg-type]
                for doc, role in shared_docs
            ],
        )

    def create_document(
        self,
        user: User,
        payload: DocumentCreateRequest,
    ) -> DocumentDetailResponse:
        title = payload.title.strip()
        if not title:
            raise ValidationError("Document title cannot be empty.")

        content_html = (
            sanitize_html(payload.content_html)
            if payload.content_html.strip()
            else DEFAULT_DOCUMENT_CONTENT
        )
        document = self.document_repo.create(
            owner_id=user.id,
            title=title,
            content_html=content_html,
        )
        return to_document_detail(document, "owner")

    def get_document(self, user: User, document_id: int) -> DocumentDetailResponse:
        document = self._get_document_or_404(document_id)
        role = require_read_access(self._resolve_role(user.id, document))
        return to_document_detail(document, role)

    def rename_document(
        self,
        user: User,
        document_id: int,
        payload: DocumentRenameRequest,
    ) -> DocumentDetailResponse:
        document = self._get_document_or_404(document_id)
        role = require_owner_access(self._resolve_role(user.id, document))

        title = payload.title.strip()
        if not title:
            raise ValidationError("Document title cannot be empty.")

        document.title = title
        document.updated_at = datetime.now(timezone.utc)
        saved = self.document_repo.save(document)
        return to_document_detail(saved, role)

    def update_content(
        self,
        user: User,
        document_id: int,
        payload: DocumentContentUpdateRequest,
    ) -> DocumentDetailResponse:
        document = self._get_document_or_404(document_id)
        role = require_edit_access(self._resolve_role(user.id, document))

        if payload.version != document.version:
            raise ConflictError(
                "Document has been modified since you loaded it. Reload to view the latest changes."
            )

        document.content_html = sanitize_html(payload.content_html)
        document.version += 1
        document.updated_at = datetime.now(timezone.utc)
        saved = self.document_repo.save(document)
        return to_document_detail(saved, role)

    def delete_document(self, user: User, document_id: int) -> None:
        document = self._get_document_or_404(document_id)
        require_owner_access(self._resolve_role(user.id, document))
        self.document_repo.delete(document)

