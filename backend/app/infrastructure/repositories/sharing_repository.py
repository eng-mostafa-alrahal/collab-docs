from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from app.infrastructure.models.document_share import DocumentShare


class SharingRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_share(self, document_id: int, user_id: int) -> DocumentShare | None:
        stmt = (
            select(DocumentShare)
            .where(
                DocumentShare.document_id == document_id,
                DocumentShare.user_id == user_id,
            )
            .options(selectinload(DocumentShare.user))
        )
        return self.db.scalar(stmt)

    def list_shares_for_document(self, document_id: int) -> list[DocumentShare]:
        stmt = (
            select(DocumentShare)
            .where(DocumentShare.document_id == document_id)
            .options(selectinload(DocumentShare.user))
            .order_by(DocumentShare.created_at.asc(), DocumentShare.id.asc())
        )
        return list(self.db.scalars(stmt).all())

    def upsert_share(self, document_id: int, user_id: int, role: str) -> DocumentShare:
        existing = self.get_share(document_id, user_id)
        if existing is not None:
            existing.role = role
            self.db.add(existing)
            self.db.commit()
            self.db.refresh(existing)
            return self.get_share(document_id, user_id)  # type: ignore[return-value]

        share = DocumentShare(
            document_id=document_id,
            user_id=user_id,
            role=role,
        )
        self.db.add(share)
        self.db.commit()
        return self.get_share(document_id, user_id)  # type: ignore[return-value]

    def delete_share(self, share: DocumentShare) -> None:
        self.db.delete(share)
        self.db.commit()

