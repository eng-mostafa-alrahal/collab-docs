from fastapi import APIRouter, Depends, File, Response, UploadFile, status
from app.api.dependencies import (
    get_current_user,
    get_document_service,
    get_file_import_service,
)
from app.application.services.document_service import DocumentService
from app.application.services.file_import_service import FileImportService
from app.infrastructure.models.user import User
from app.schemas.document import (
    DocumentContentUpdateRequest,
    DocumentCreateRequest,
    DocumentDetailResponse,
    DocumentListResponse,
    DocumentRenameRequest,
)

router = APIRouter(prefix="/documents", tags=["documents"])


@router.get("", response_model=DocumentListResponse)
def list_documents(
    current_user: User = Depends(get_current_user),
    service: DocumentService = Depends(get_document_service),
) -> DocumentListResponse:
    return service.list_documents(current_user)


@router.post("", response_model=DocumentDetailResponse, status_code=status.HTTP_201_CREATED)
def create_document(
    payload: DocumentCreateRequest,
    current_user: User = Depends(get_current_user),
    service: DocumentService = Depends(get_document_service),
) -> DocumentDetailResponse:
    return service.create_document(current_user, payload)


@router.post("/import", response_model=DocumentDetailResponse, status_code=status.HTTP_201_CREATED)
async def import_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    service: FileImportService = Depends(get_file_import_service),
) -> DocumentDetailResponse:
    return await service.import_file(current_user, file)


@router.get("/{document_id}", response_model=DocumentDetailResponse)
def get_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    service: DocumentService = Depends(get_document_service),
) -> DocumentDetailResponse:
    return service.get_document(current_user, document_id)


@router.patch("/{document_id}", response_model=DocumentDetailResponse)
def rename_document(
    document_id: int,
    payload: DocumentRenameRequest,
    current_user: User = Depends(get_current_user),
    service: DocumentService = Depends(get_document_service),
) -> DocumentDetailResponse:
    return service.rename_document(current_user, document_id, payload)


@router.put("/{document_id}/content", response_model=DocumentDetailResponse)
def update_document_content(
    document_id: int,
    payload: DocumentContentUpdateRequest,
    current_user: User = Depends(get_current_user),
    service: DocumentService = Depends(get_document_service),
) -> DocumentDetailResponse:
    return service.update_content(current_user, document_id, payload)


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    service: DocumentService = Depends(get_document_service),
) -> Response:
    service.delete_document(current_user, document_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

