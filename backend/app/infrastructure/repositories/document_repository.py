from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from app.infrastructure.models.document import Document
from app.infrastructure.models.document_share import DocumentShare


class DocumentRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(
        self,
        owner_id: int,
        title: str,
        content_html: str,
        source_filename: str | None = None,
    ) -> Document:
        document = Document(
            owner_id=owner_id,
            title=title,
            content_html=content_html,
            source_filename=source_filename,
        )
        self.db.add(document)
        self.db.commit()
        return self.get_by_id_with_relations(document.id)  # type: ignore[return-value]

    def get_by_id(self, document_id: int) -> Document | None:
        return self.db.get(Document, document_id)

    def get_by_id_with_relations(self, document_id: int) -> Document | None:
        stmt = (
            select(Document)
            .where(Document.id == document_id)
            .options(
                selectinload(Document.owner),
                selectinload(Document.shares).selectinload(DocumentShare.user),
            )
        )
        return self.db.scalar(stmt)

    def list_owned(self, owner_id: int) -> list[Document]:
        stmt = (
            select(Document)
            .where(Document.owner_id == owner_id)
            .options(
                selectinload(Document.owner),
                selectinload(Document.shares).selectinload(DocumentShare.user),
            )
            .order_by(Document.updated_at.desc(), Document.id.desc())
        )
        return list(self.db.scalars(stmt).all())

    def list_shared_with_user(self, user_id: int) -> list[tuple[Document, str]]:
        stmt = (
            select(Document, DocumentShare.role)
            .join(DocumentShare, DocumentShare.document_id == Document.id)
            .where(DocumentShare.user_id == user_id)
            .options(
                selectinload(Document.owner),
                selectinload(Document.shares).selectinload(DocumentShare.user),
            )
            .order_by(Document.updated_at.desc(), Document.id.desc())
        )
        return [(row[0], row[1]) for row in self.db.execute(stmt).all()]

    def save(self, document: Document) -> Document:
        self.db.add(document)
        self.db.commit()
        self.db.refresh(document)
        return document

    def delete(self, document: Document) -> None:
        self.db.delete(document)
        self.db.commit()

