from collections.abc import Generator
from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import Session, sessionmaker
from app.config import get_settings
from app.infrastructure.models.user import User

DEMO_USERS = [
    {
        "id": 1,
        "name": "Alice Johnson",
        "email": "alice@ajaia.dev",
        "avatar_color": "#2563EB",
    },
    {
        "id": 2,
        "name": "Bob Smith",
        "email": "bob@ajaia.dev",
        "avatar_color": "#16A34A",
    },
    {
        "id": 3,
        "name": "Charlie Davis",
        "email": "charlie@ajaia.dev",
        "avatar_color": "#9333EA",
    },
]

settings = get_settings()

connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(settings.DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def seed_demo_users(db: Session) -> list[User]:
    """Idempotently seed deterministic demo accounts checked by unique email."""
    seeded: list[User] = []
    inserted = False

    for account in DEMO_USERS:
        existing = db.scalar(select(User).where(User.email == account["email"]))
        if existing is not None:
            seeded.append(existing)
            continue

        user = User(
            id=account["id"],
            name=account["name"],
            email=account["email"],
            avatar_color=account["avatar_color"],
        )
        db.add(user)
        seeded.append(user)
        inserted = True

    if inserted:
        db.commit()
        for user in seeded:
            db.refresh(user)
        if db.bind is not None and db.bind.dialect.name == "postgresql":
            db.execute(
                text(
                    "SELECT setval(pg_get_serial_sequence('users', 'id'), "
                    "COALESCE((SELECT MAX(id) FROM users), 1), true)"
                )
            )
            db.commit()

    return seeded

