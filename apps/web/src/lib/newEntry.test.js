import { describe, it, expect } from 'vitest';
import { copyEntry, makeEntry, makeGroup } from './newEntry.js';

describe('makeEntry', () => {
  it('gives every field EntryCard reads, blank, plus a fresh id', () => {
    const entry = makeEntry();
    expect(entry).toMatchObject({
      title: '', organisation: '', location: '', startDate: '', endDate: '',
      bullets: [], tech: [], pinned: false, weight: 0,
    });
    expect(entry.id).toBeTruthy();
  });

  // An empty list would win over the single link a resume proposal merged
  // over a blank entry still carries, and the store would drop that link.
  it('starts with no links list, so an old single link merged over it still counts', () => {
    expect(makeEntry()).not.toHaveProperty('links');
    expect(makeEntry()).not.toHaveProperty('link');
  });

  it('mints a different id each time, so a list of new entries has stable keys', () => {
    expect(makeEntry().id).not.toBe(makeEntry().id);
  });
});

describe('copyEntry', () => {
  it('copies every field under a new id', () => {
    const entry = { ...makeEntry(), title: 'Intern', links: [{ kind: 'code', url: 'https://github.com/demo/x', label: '' }] };
    const copy = copyEntry(entry);
    expect(copy).toEqual({ ...entry, id: copy.id });
    expect(copy.id).not.toBe(entry.id);
  });
});

describe('makeGroup', () => {
  it('gives a blank group a name, no items and a fresh id', () => {
    expect(makeGroup()).toMatchObject({ name: '', items: [] });
    expect(makeGroup().id).toBeTruthy();
  });
});
