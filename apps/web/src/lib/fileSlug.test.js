import { describe, it, expect } from 'vitest';
import { fileSlug } from './fileSlug.js';

describe('fileSlug', () => {
  it('keeps plain letters and turns spaces into dashes', () => {
    expect(fileSlug('Resume for Backend Engineer at Acme')).toBe('Resume-for-Backend-Engineer-at-Acme');
  });

  it('drops anything that could break out of a file name', () => {
    expect(fileSlug('../"evil"/name\\x')).toBe('evilnamex');
    expect(fileSlug('..hidden')).toBe('hidden');
  });

  it('falls back to "document" when nothing is left', () => {
    expect(fileSlug('')).toBe('document');
    expect(fileSlug(null)).toBe('document');
    expect(fileSlug('???')).toBe('document');
  });
});
