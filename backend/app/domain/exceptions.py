class DomainError(Exception):
    """Base class for domain and application errors."""

    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


class NotFoundError(DomainError):
    """Raised when a requested resource does not exist."""


class ForbiddenError(DomainError):
    """Raised when the current user lacks permission for an action."""


class ConflictError(DomainError):
    """Raised on optimistic concurrency version conflicts."""


class ValidationError(DomainError):
    """Raised when business or file validation fails."""


class PayloadTooLargeError(DomainError):
    """Raised when an uploaded file exceeds the size limit."""

