from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session
from app.application.services.document_service import DocumentService
from app.application.services.file_import_service import FileImportService
from app.application.services.sharing_service import SharingService
from app.config import Settings, get_settings
from app.infrastructure.database.session import get_db
from app.infrastructure.models.user import User
from app.infrastructure.repositories.document_repository import DocumentRepository
from app.infrastructure.repositories.sharing_repository import SharingRepository
from app.infrastructure.repositories.user_repository import UserRepository


def get_current_user(
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
    db: Session = Depends(get_db),
) -> User:
    if x_user_id is None or not x_user_id.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing X-User-Id header.",
        )
    try:
        user_id = int(x_user_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="X-User-Id must be a valid integer.",
        ) from exc

    user = UserRepository(db).get_by_id(user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated demo user does not exist.",
        )
    return user


def get_document_service(db: Session = Depends(get_db)) -> DocumentService:
    return DocumentService(
        document_repo=DocumentRepository(db),
        sharing_repo=SharingRepository(db),
    )


def get_sharing_service(db: Session = Depends(get_db)) -> SharingService:
    return SharingService(
        document_repo=DocumentRepository(db),
        sharing_repo=SharingRepository(db),
        user_repo=UserRepository(db),
    )


def get_file_import_service(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> FileImportService:
    return FileImportService(
        document_repo=DocumentRepository(db),
        max_upload_size=settings.MAX_UPLOAD_SIZE,
    )

