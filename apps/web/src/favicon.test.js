import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Tests run from the repo root or from apps/web; the web app's folder is
// found from either, since jsdom gives import.meta.url no file path to use.
const root = existsSync(join(process.cwd(), 'apps/web/index.html')) ? join(process.cwd(), 'apps/web') : process.cwd();
const web = (path) => join(root, path);
const html = readFileSync(web('index.html'), 'utf8');

// Every icon the page names has to be a file in public/, which the build
// copies to the site's root; a missing one is a broken tab icon, not an error.
describe('the favicon', () => {
  it('names only icons that exist in public/', () => {
    const hrefs = [...html.matchAll(/<link rel="(?:icon|apple-touch-icon)" href="\/([^"]+)"/g)].map((m) => m[1]);
    expect(hrefs).toEqual(['favicon-32.png', 'favicon.svg', 'apple-touch-icon.png']);
    for (const href of hrefs) expect(existsSync(web(`public/${href}`))).toBe(true);
  });

  it('follows the browser scheme in the SVG, since it never sees the page theme', () => {
    expect(readFileSync(web('public/favicon.svg'), 'utf8')).toContain('@media (prefers-color-scheme: dark)');
  });
});
