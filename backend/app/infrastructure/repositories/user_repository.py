from sqlalchemy import select
from sqlalchemy.orm import Session
from app.infrastructure.models.user import User


class UserRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_all(self) -> list[User]:
        return list(self.db.scalars(select(User).order_by(User.id)).all())

    def get_by_id(self, user_id: int) -> User | None:
        return self.db.get(User, user_id)

