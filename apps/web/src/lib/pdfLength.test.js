import { describe, it, expect } from 'vitest';
import { notePdfLength, overBy, pdfLength } from './pdfLength.js';

const headers = (map) => ({ get: (name) => map[name] ?? null });

describe('pdfLength', () => {
  it('keeps what the server measured beside the PDF it answered with', () => {
    const blob = new Blob(['%PDF']);
    expect(notePdfLength(blob, headers({ 'x-pdf-pages': '2', 'x-pdf-last-lines': '6' }))).toBe(blob);
    expect(pdfLength(blob)).toEqual({ pages: 2, lastLines: 6 });
  });

  it('is null for a PDF that came without a length, or with one that is no number', () => {
    const bare = notePdfLength(new Blob(['%PDF']), headers({}));
    const odd = notePdfLength(new Blob(['%PDF']), headers({ 'x-pdf-pages': 'many' }));
    expect(pdfLength(bare)).toBeNull();
    expect(pdfLength(odd)).toBeNull();
    expect(pdfLength(notePdfLength(new Blob(['%PDF']), undefined))).toBeNull();
    expect(pdfLength(null)).toBeNull();
  });

  it('takes a missing line count as none', () => {
    const blob = notePdfLength(new Blob(['%PDF']), headers({ 'x-pdf-pages': '1' }));
    expect(pdfLength(blob)).toEqual({ pages: 1, lastLines: 0 });
  });
});

describe('overBy', () => {
  it('says how much of a second page there is, and nothing for any other length', () => {
    expect(overBy({ pages: 2, lastLines: 6 })).toBe(', about 6 lines over');
    expect(overBy({ pages: 2, lastLines: 1 })).toBe(', about 1 line over');
    expect(overBy({ pages: 2, lastLines: 0 })).toBe('');
    expect(overBy({ pages: 3, lastLines: 9 })).toBe('');
    expect(overBy({ pages: 1, lastLines: 40 })).toBe('');
  });
});
