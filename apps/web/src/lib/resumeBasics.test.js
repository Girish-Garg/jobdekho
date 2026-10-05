import { describe, it, expect } from 'vitest';
import { basicsRows } from './resumeBasics.js';

const BASICS = {
  name: 'Demo C.', headline: '', email: '  ', phone: '+91 90000 00000', location: '',
  links: { github: 'https://github.com/typed-by-hand', linkedin: '', portfolio: '' },
};
const FOUND = {
  name: 'Demo Candidate', headline: 'Backend engineer', email: 'demo@example.com', phone: '', location: 'Pune',
  links: { github: 'https://github.com/demo-candidate', linkedin: '', portfolio: 'https://demo.dev' },
};
const brief = (rows) => rows.map((row) => [row.field, row.kind, row.value, row.ticked]);

describe('basicsRows with Smart add', () => {
  it('fills only the basics the person left empty, ticked, whatever else the resume says', () => {
    expect(brief(basicsRows(BASICS, FOUND, 'smart'))).toEqual([
      ['headline', 'new', 'Backend engineer', true],
      ['email', 'new', 'demo@example.com', true],
      ['location', 'new', 'Pune', true],
      ['links.portfolio', 'new', 'https://demo.dev', true],
    ]);
  });

  it('offers nothing when the resume showed nothing, and fills a profile with no basics yet', () => {
    expect(basicsRows({ name: '' }, {})).toEqual([]);
    expect(basicsRows(undefined, { name: 'Demo Candidate' })).toMatchObject([{ field: 'name', kind: 'new', value: 'Demo Candidate' }]);
  });
});

describe('basicsRows with Overwrite', () => {
  it('also offers the resume\'s value where the person\'s differs, unticked, with theirs beside it', () => {
    expect(brief(basicsRows(BASICS, FOUND, 'overwrite'))).toEqual([
      ['name', 'changed', 'Demo Candidate', false],
      ['headline', 'new', 'Backend engineer', true],
      ['email', 'new', 'demo@example.com', true],
      ['location', 'new', 'Pune', true],
      ['links.github', 'changed', 'https://github.com/demo-candidate', false],
      ['links.portfolio', 'new', 'https://demo.dev', true],
    ]);
    expect(basicsRows(BASICS, FOUND, 'overwrite')[0].before).toBe('Demo C.');
  });

  it('takes one value written two ways as the same: case, spacing, a link\'s scheme or slash, a phone\'s spacing', () => {
    const mine = { name: 'Demo  Candidate', email: 'Demo@Example.com', phone: '+91 90000 00000', links: { github: 'github.com/demo/' } };
    const theirs = { name: 'demo candidate', email: 'demo@example.com', phone: '+919000000000', links: { github: 'https://github.com/demo' } };
    expect(basicsRows(mine, theirs, 'overwrite')).toEqual([]);
  });
});
