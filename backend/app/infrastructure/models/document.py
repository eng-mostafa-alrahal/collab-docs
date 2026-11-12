from datetime import datetime, timezone
from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.infrastructure.database.base import Base

DEFAULT_DOCUMENT_TITLE = "Untitled Document"
DEFAULT_DOCUMENT_CONTENT = "<p>Start writing your document here...</p>"


class Document(Base):
    __tablename__ = "documents"
    __table_args__ = (
        Index("ix_documents_owner_id", "owner_id"),
        Index("ix_documents_updated_at", "updated_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        default=DEFAULT_DOCUMENT_TITLE,
    )
    content_html: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default=DEFAULT_DOCUMENT_CONTENT,
    )
    owner_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    source_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    owner = relationship("User", back_populates="owned_documents")
    shares = relationship(
        "DocumentShare",
        back_populates="document",
        cascade="all, delete-orphan",
    )

