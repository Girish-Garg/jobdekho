import { describe, it, expect } from 'vitest';
import { makeEntry, makeGroup } from './newEntry.js';

describe('makeEntry', () => {
  it('gives every field EntryCard reads, blank, plus a fresh id', () => {
    const entry = makeEntry();
    expect(entry).toMatchObject({
      title: '', organisation: '', location: '', startDate: '', endDate: '',
      bullets: [], tech: [], link: '', pinned: false, weight: 0,
    });
    expect(entry.id).toBeTruthy();
  });

  it('mints a different id each time, so a list of new entries has stable keys', () => {
    expect(makeEntry().id).not.toBe(makeEntry().id);
  });
});

describe('makeGroup', () => {
  it('gives a blank group a name, no items and a fresh id', () => {
    expect(makeGroup()).toMatchObject({ name: '', items: [] });
    expect(makeGroup().id).toBeTruthy();
  });
});
