from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.sharing import ShareInfo


class DocumentCreateRequest(BaseModel):
    title: str = Field(default="Untitled Document", min_length=1, max_length=255)
    content_html: str = ""


class DocumentRenameRequest(BaseModel):
    title: str = Field(min_length=1, max_length=255)


class DocumentContentUpdateRequest(BaseModel):
    content_html: str
    version: int = Field(ge=1)


class DocumentSummary(BaseModel):
    id: int
    title: str
    owner_id: int
    owner_name: str
    owner_avatar_color: str
    role: Literal["owner", "editor", "viewer"]
    source_filename: str | None = None
    updated_at: datetime
    shares: list[ShareInfo] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class DocumentDetailResponse(DocumentSummary):
    content_html: str
    created_at: datetime
    version: int


class DocumentListResponse(BaseModel):
    owned: list[DocumentSummary] = Field(default_factory=list)
    shared: list[DocumentSummary] = Field(default_factory=list)

