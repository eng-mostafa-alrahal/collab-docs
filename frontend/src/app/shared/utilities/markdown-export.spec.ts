import { htmlToMarkdown } from './markdown-export';

describe('htmlToMarkdown', () => {
  it('converts headings, emphasis, and lists into Markdown', () => {
    const html =
      '<h1>Sprint Plan</h1><p>This is <strong>important</strong> and <em>clear</em>.</p><ul><li>Item 1</li><li>Item 2</li></ul>';
    const md = htmlToMarkdown(html);
    expect(md).toContain('# Sprint Plan');
    expect(md).toContain('This is **important** and *clear*.');
    expect(md).toContain('- Item 1');
    expect(md).toContain('- Item 2');
  });
});

