import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// The building blocks only keep the app consistent while nothing goes around
// them: a button spelled out by hand in a new file looks right the day it is
// written and drifts the first time buttons.css changes. This reads every
// component and names the hand-made ones, with the block that replaces each.

// Tests run from the repo root or from apps/web (see favicon.test.js).
const root = existsSync(join(process.cwd(), 'apps/web/index.html')) ? join(process.cwd(), 'apps/web') : process.cwd();
const dir = join(root, 'src/components');
const files = readdirSync(dir)
  .filter((name) => name.endsWith('.jsx') && !name.includes('.test.') && statSync(join(dir, name)).isFile())
  .map((name) => ({ name, source: readFileSync(join(dir, name), 'utf8') }));

// Each opening tag of an element, up to its closing > (attributes may hold
// braces and arrows), with the line it starts on.
function tags(source, element) {
  const found = [];
  const re = new RegExp(`<(${element})[\\s>]`, 'g');
  let match;
  while ((match = re.exec(source))) {
    let depth = 0;
    let end = match.index;
    for (; end < source.length; end++) {
      const c = source[end];
      if (c === '{') depth++;
      else if (c === '}') depth--;
      else if (c === '>' && depth === 0) break;
    }
    found.push({ line: source.slice(0, match.index).split('\n').length, text: source.slice(match.index, end + 1) });
  }
  return found;
}

const classOf = (tag) => (tag.match(/className=(?:"([^"]*)"|\{`([^`]*)`\}|\{'([^']*)'\})/) || []).slice(1).find(Boolean) || '';

const RULES = [
  {
    use: '<Button> (components/ui/Button.jsx)',
    element: 'button',
    hit: (cls) => /(^|\s)btn(\s|$)/.test(cls),
  },
  {
    use: '<Switch> (components/ui/Switch.jsx)',
    element: 'button',
    hit: (cls, tag) => /role="switch"/.test(tag),
  },
  {
    use: '<Card> (components/ui/Card.jsx)',
    element: 'div|section|aside|article|li|ul|form|p',
    hit: (cls) => /\bborder-line\b/.test(cls) && /\brounded-(?:xl|2xl)\b/.test(cls) && /\bbg-(?:panel|paper|overlay)\b/.test(cls),
  },
  {
    use: '<TextInput>, <TextArea> or <SearchField> (components/ui)',
    element: 'input|textarea',
    hit: (cls) => /\bborder-line\b/.test(cls) && /\brounded-(?:md|lg|full)\b/.test(cls),
    // The topbar's box is the app's one global search: it holds the "/" key
    // hint inside it and keeps the app's focus outline, which a menu's
    // SearchField drops on purpose.
    allow: ['Topbar.jsx'],
  },
  {
    use: '<Eyebrow> (components/ui/Eyebrow.jsx)',
    element: '[a-z][a-z0-9]*',
    hit: (cls) => /\buppercase\b/.test(cls) && /\btext-\[10px\]/.test(cls) && /\btracking-\[0\.1[48]em\]/.test(cls),
  },
  {
    use: '<CountBadge> (components/ui/CountBadge.jsx)',
    element: 'span',
    hit: (cls) => /\btnum\b/.test(cls) && /\brounded-full\b/.test(cls) && /\bbg-(?:select|primary)\b/.test(cls),
  },
  {
    use: '<PageTitle> (components/ui/PageTitle.jsx)',
    element: 'h1',
    hit: () => true,
  },
];

describe('components use the building blocks', () => {
  for (const rule of RULES) {
    it(`have no hand-made one where ${rule.use} belongs`, () => {
      const offenders = files
        .filter(({ name }) => !(rule.allow || []).includes(name))
        .flatMap(({ name, source }) => tags(source, rule.element)
          .filter((tag) => rule.hit(classOf(tag.text), tag.text))
          .map((tag) => `${name}:${tag.line}`));
      expect(offenders).toEqual([]);
    });
  }

  // A class string kept in a constant escapes the tag rules above, so the
  // button classes are looked for in any string. What cannot be a <button>
  // (a label, a download link) wears them through <Button as=...>.
  it('keep no button classes in a string for a hand-made button', () => {
    const offenders = files
      .flatMap(({ name, source }) => source.split('\n')
        .map((text, i) => (/['"`][^'"`]*\bbtn btn-[a-z]/.test(text) ? `${name}:${i + 1}` : null))
        .filter(Boolean));
    expect(offenders).toEqual([]);
  });
});
