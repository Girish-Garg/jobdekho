import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Tests run from the repo root or from apps/web; the web app's folder is
// found from either, since jsdom gives import.meta.url no file path to use.
const root = existsSync(join(process.cwd(), 'apps/web/index.html')) ? join(process.cwd(), 'apps/web') : process.cwd();
const web = (path) => join(root, path);
const html = readFileSync(web('index.html'), 'utf8');

// Each icon link as [file in public/, the ?v= fingerprint on its address].
const icons = () => [...html.matchAll(/<link rel="(?:icon|apple-touch-icon)" href="\/([^"?]+)(?:\?v=([0-9a-f]+))?"/g)]
  .map((m) => [m[1], m[2]]);

// Every icon the page names has to be a file in public/, which the build
// copies to the site's root; a missing one is a broken tab icon, not an error.
describe('the favicon', () => {
  it('names only icons that exist in public/', () => {
    const files = icons().map(([file]) => file);
    expect(files).toEqual(['favicon-32.png', 'favicon.svg', 'apple-touch-icon.png']);
    for (const file of files) expect(existsSync(web(`public/${file}`))).toBe(true);
  });

  // Browsers keep a favicon by its address, often for days after the file
  // changes, so the address carries the file's fingerprint: change an icon
  // and this fails until index.html carries the new one.
  it('gives each icon an address that changes with the file', () => {
    for (const [file, version] of icons()) {
      const sha = createHash('sha256').update(readFileSync(web(`public/${file}`))).digest('hex');
      expect(version, file).toBe(sha.slice(0, 8));
    }
  });

  // A favicon cannot load the site's fonts, so the letters are drawn shapes.
  it('draws its letters as shapes rather than type', () => {
    const svg = readFileSync(web('public/favicon.svg'), 'utf8');
    expect(svg).not.toContain('<text');
    expect(svg).toContain('<path');
  });
});
