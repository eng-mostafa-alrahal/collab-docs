from contextlib import asynccontextmanager
import logging
from fastapi import Depends, FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session
from app.api.routes import documents, shares, users
from app.config import get_settings
from app.domain.exceptions import (
    ConflictError,
    ForbiddenError,
    NotFoundError,
    PayloadTooLargeError,
    ValidationError,
)
from app.infrastructure.database.session import SessionLocal, engine, get_db, seed_demo_users

logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    if settings.ENVIRONMENT != "test":
        try:
            inspector = inspect(engine)
            if inspector.has_table("users"):
                with SessionLocal() as db:
                    seed_demo_users(db)
        except Exception as exc:  # pragma: no cover - startup safety guard
            logger.warning("Skipping automatic user seeding during startup: %s", exc)
    yield


app = FastAPI(
    title="Ajaia Docs API",
    version="1.0.0",
    description="Lightweight collaborative document editor API (demo simulated identity).",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(NotFoundError)
async def not_found_handler(_: Request, exc: NotFoundError) -> JSONResponse:
    return JSONResponse(status_code=status.HTTP_404_NOT_FOUND, content={"detail": exc.message})


@app.exception_handler(ForbiddenError)
async def forbidden_handler(_: Request, exc: ForbiddenError) -> JSONResponse:
    return JSONResponse(status_code=status.HTTP_403_FORBIDDEN, content={"detail": exc.message})


@app.exception_handler(ConflictError)
async def conflict_handler(_: Request, exc: ConflictError) -> JSONResponse:
    return JSONResponse(status_code=status.HTTP_409_CONFLICT, content={"detail": exc.message})


@app.exception_handler(ValidationError)
async def validation_handler(_: Request, exc: ValidationError) -> JSONResponse:
    return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content={"detail": exc.message})


@app.exception_handler(PayloadTooLargeError)
async def payload_too_large_handler(_: Request, exc: PayloadTooLargeError) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_413_CONTENT_TOO_LARGE,
        content={"detail": exc.message},
    )


@app.get("/api/health", tags=["health"])
def health_check(db: Session = Depends(get_db)) -> dict[str, str]:
    db.execute(text("SELECT 1"))
    return {"status": "ok"}


app.include_router(users.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(shares.router, prefix="/api")
