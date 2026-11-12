from pydantic import BaseModel, ConfigDict


class UserRead(BaseModel):
    id: int
    name: str
    email: str
    avatar_color: str

    model_config = ConfigDict(from_attributes=True)

