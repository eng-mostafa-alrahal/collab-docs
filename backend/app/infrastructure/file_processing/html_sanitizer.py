import nh3

ALLOWED_TAGS: set[str] = {
    "p",
    "br",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "h1",
    "h2",
    "h3",
    "ul",
    "ol",
    "li",
    "blockquote",
    "pre",
    "code",
    "a",
}

ALLOWED_ATTRIBUTES: dict[str, set[str]] = {
    "a": {"href", "title", "target"},
}

ALLOWED_URL_SCHEMES: set[str] = {"http", "https", "mailto"}


def sanitize_html(raw_html: str) -> str:
    """Sanitize editor or converted HTML using an allowlist."""
    if not raw_html:
        return ""
    return nh3.clean(
        raw_html,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRIBUTES,
        url_schemes=ALLOWED_URL_SCHEMES,
        strip_comments=True,
    )

