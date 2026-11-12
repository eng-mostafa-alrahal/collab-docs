from typing import Literal
from pydantic import BaseModel, ConfigDict


class ShareRequest(BaseModel):
    target_user_id: int
    role: Literal["editor", "viewer"]


class ShareInfo(BaseModel):
    user_id: int
    name: str
    email: str
    avatar_color: str
    role: Literal["editor", "viewer"]

    model_config = ConfigDict(from_attributes=True)

