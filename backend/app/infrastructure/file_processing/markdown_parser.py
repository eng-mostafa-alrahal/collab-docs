import html
import re
import markdown


def markdown_to_html(markdown_text: str) -> str:
    """Convert Markdown text into semantic HTML."""
    return markdown.markdown(
        markdown_text,
        extensions=["fenced_code", "tables", "nl2br"],
    )


def plain_text_to_html(plain_text: str) -> str:
    """Escape plain text and convert paragraphs and line breaks to HTML."""
    normalized = plain_text.replace("\r\n", "\n").replace("\r", "\n").strip()
    if not normalized:
        return "<p></p>"

    paragraphs = re.split(r"\n\s*\n", normalized)
    html_paragraphs: list[str] = []
    for paragraph in paragraphs:
        escaped = html.escape(paragraph.strip(), quote=True)
        with_breaks = escaped.replace("\n", "<br>")
        html_paragraphs.append(f"<p>{with_breaks}</p>")
    return "\n".join(html_paragraphs)

