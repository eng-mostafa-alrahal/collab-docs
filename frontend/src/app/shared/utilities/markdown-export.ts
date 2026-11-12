function serializeInline(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? '';
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  const inner = Array.from(el.childNodes).map(serializeInline).join('');

  switch (tag) {
    case 'br':
      return '  \n';
    case 'strong':
    case 'b':
      return inner.trim() ? `**${inner}**` : '';
    case 'em':
    case 'i':
      return inner.trim() ? `*${inner}*` : '';
    case 'u':
      return inner.trim() ? `<u>${inner}</u>` : '';
    case 'code':
      return `\`${inner}\``;
    case 'a': {
      const href = el.getAttribute('href') ?? '';
      return href ? `[${inner}](${href})` : inner;
    }
    default:
      return inner;
  }
}

function serializeBlock(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return (node.textContent ?? '').trim();
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();

  switch (tag) {
    case 'h1':
      return `# ${Array.from(el.childNodes).map(serializeInline).join('').trim()}`;
    case 'h2':
      return `## ${Array.from(el.childNodes).map(serializeInline).join('').trim()}`;
    case 'h3':
      return `### ${Array.from(el.childNodes).map(serializeInline).join('').trim()}`;
    case 'p':
      return Array.from(el.childNodes).map(serializeInline).join('').trim();
    case 'blockquote': {
      const text = Array.from(el.childNodes).map(serializeBlock).filter(Boolean).join('\n');
      return text
        .split('\n')
        .map((line) => `> ${line}`)
        .join('\n');
    }
    case 'pre':
      return `\`\`\`\n${el.textContent ?? ''}\n\`\`\``;
    case 'ul':
      return Array.from(el.children)
        .filter((child) => child.tagName.toLowerCase() === 'li')
        .map((li) => `- ${Array.from(li.childNodes).map(serializeInline).join('').trim()}`)
        .join('\n');
    case 'ol':
      return Array.from(el.children)
        .filter((child) => child.tagName.toLowerCase() === 'li')
        .map(
          (li, index) =>
            `${index + 1}. ${Array.from(li.childNodes).map(serializeInline).join('').trim()}`,
        )
        .join('\n');
    default:
      return Array.from(el.childNodes).map(serializeInline).join('').trim();
  }
}

export function htmlToMarkdown(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const blocks = Array.from(doc.body.childNodes)
    .map(serializeBlock)
    .filter((block) => block.length > 0);
  return blocks.join('\n\n') + '\n';
}

export function downloadMarkdownFile(title: string, html: string): void {
  const markdown = htmlToMarkdown(html);
  const safeBaseName =
    title
      .trim()
      .replace(/[\\/:*?"<>|]+/g, '-')
      .replace(/\s+/g, '_') || 'document';
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${safeBaseName}.md`;
  anchor.click();
  URL.revokeObjectURL(url);
}

