from typing import Literal
from app.domain.exceptions import ForbiddenError

DocumentRole = Literal["owner", "editor", "viewer"]


def resolve_user_role(
    user_id: int,
    owner_id: int,
    share_role: str | None,
) -> DocumentRole | None:
    """Resolve the effective role of a user on a document."""
    if user_id == owner_id:
        return "owner"
    if share_role in ("editor", "viewer"):
        return share_role  # type: ignore[return-value]
    return None


def require_read_access(role: DocumentRole | None) -> DocumentRole:
    if role is None:
        raise ForbiddenError("You do not have permission to access this document.")
    return role


def require_edit_access(role: DocumentRole | None) -> DocumentRole:
    if role not in ("owner", "editor"):
        raise ForbiddenError("You do not have permission to edit this document.")
    return role  # type: ignore[return-value]


def require_owner_access(role: DocumentRole | None) -> DocumentRole:
    if role != "owner":
        raise ForbiddenError("Only the document owner can perform this action.")
    return "owner"

