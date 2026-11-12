from app.domain.exceptions import NotFoundError, ValidationError
from app.domain.policies.document_policy import require_owner_access, resolve_user_role
from app.infrastructure.models.user import User
from app.infrastructure.repositories.document_repository import DocumentRepository
from app.infrastructure.repositories.sharing_repository import SharingRepository
from app.infrastructure.repositories.user_repository import UserRepository
from app.schemas.sharing import ShareInfo, ShareRequest


class SharingService:
    def __init__(
        self,
        document_repo: DocumentRepository,
        sharing_repo: SharingRepository,
        user_repo: UserRepository,
    ) -> None:
        self.document_repo = document_repo
        self.sharing_repo = sharing_repo
        self.user_repo = user_repo

    def share_document(
        self,
        user: User,
        document_id: int,
        payload: ShareRequest,
    ) -> ShareInfo:
        document = self.document_repo.get_by_id(document_id)
        if document is None:
            raise NotFoundError("Document not found.")

        role = resolve_user_role(user.id, document.owner_id, None)
        require_owner_access(role)

        if payload.target_user_id == document.owner_id:
            raise ValidationError("Cannot share a document with its owner.")

        target_user = self.user_repo.get_by_id(payload.target_user_id)
        if target_user is None:
            raise NotFoundError("Target user not found.")

        share = self.sharing_repo.upsert_share(
            document_id=document.id,
            user_id=target_user.id,
            role=payload.role,
        )
        return ShareInfo(
            user_id=target_user.id,
            name=target_user.name,
            email=target_user.email,
            avatar_color=target_user.avatar_color,
            role=share.role,  # type: ignore[arg-type]
        )

    def revoke_access(
        self,
        user: User,
        document_id: int,
        target_user_id: int,
    ) -> None:
        document = self.document_repo.get_by_id(document_id)
        if document is None:
            raise NotFoundError("Document not found.")

        role = resolve_user_role(user.id, document.owner_id, None)
        require_owner_access(role)

        share = self.sharing_repo.get_share(document.id, target_user_id)
        if share is None:
            raise NotFoundError("Share record not found.")

        self.sharing_repo.delete_share(share)

