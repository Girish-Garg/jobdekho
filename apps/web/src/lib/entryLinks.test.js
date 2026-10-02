import { describe, it, expect } from 'vitest';
import { blankLink, kindFor, linksOf, withLinks } from './entryLinks.js';

const CODE = { kind: 'code', url: 'https://github.com/demo/cli', label: '' };

describe('linksOf', () => {
  it('reads the list, and an old single link with no list as a one-link list', () => {
    expect(linksOf({ links: [CODE] })).toEqual([CODE]);
    expect(linksOf({ link: 'youtu.be/abc' })).toEqual([{ kind: 'video', url: 'youtu.be/abc', label: '' }]);
    expect(linksOf({ links: [], link: 'https://github.com/x' })).toEqual([]);
    expect(linksOf({})).toEqual([]);
  });
});

describe('withLinks', () => {
  it('writes the list and keeps the old field equal to the first address', () => {
    const entry = withLinks({ id: '1', link: 'old' }, [blankLink('video'), { ...CODE, url: ' https://github.com/demo/cli ' }]);
    expect(entry.links).toHaveLength(2);
    expect(entry.link).toBe('https://github.com/demo/cli');
    expect(withLinks({ link: 'old' }, []).link).toBe('');
  });
});

describe('kindFor', () => {
  it('follows the address while the kind is the one the address gave', () => {
    expect(kindFor(blankLink(), 'https://github.com/demo')).toBe('code');
    expect(kindFor(CODE, 'https://www.youtube.com/watch?v=x')).toBe('video');
  });

  it('keeps a kind the person picked, by hand or with a kind\'s own button', () => {
    expect(kindFor({ kind: 'video', url: 'https://drive.google.com/file/d/x' }, 'https://drive.google.com/file/d/y')).toBe('video');
    expect(kindFor(blankLink('video'), 'https://drive.google.com/file/d/x')).toBe('video');
  });
});
