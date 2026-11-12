from fastapi import APIRouter, Depends, Response, status
from app.api.dependencies import get_current_user, get_sharing_service
from app.application.services.sharing_service import SharingService
from app.infrastructure.models.user import User
from app.schemas.sharing import ShareInfo, ShareRequest

router = APIRouter(prefix="/documents", tags=["sharing"])


@router.post("/{document_id}/shares", response_model=ShareInfo)
def share_document(
    document_id: int,
    payload: ShareRequest,
    current_user: User = Depends(get_current_user),
    service: SharingService = Depends(get_sharing_service),
) -> ShareInfo:
    return service.share_document(current_user, document_id, payload)


@router.delete("/{document_id}/shares/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_access(
    document_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    service: SharingService = Depends(get_sharing_service),
) -> Response:
    service.revoke_access(current_user, document_id, user_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

