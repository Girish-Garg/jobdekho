import { describe, it, expect } from 'vitest';
import { isLowEnd, resolveEffects, readEffectsChoice, writeEffectsChoice, applyEffects } from './effects.js';

const memory = () => {
  const data = {};
  return { getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v; } };
};

describe('isLowEnd', () => {
  it('counts four cores or fewer, 4 GB or less, or a data-saving connection', () => {
    expect(isLowEnd({ hardwareConcurrency: 4 })).toBe(true);
    expect(isLowEnd({ deviceMemory: 2, hardwareConcurrency: 8 })).toBe(true);
    expect(isLowEnd({ hardwareConcurrency: 16, connection: { saveData: true } })).toBe(true);
    expect(isLowEnd({ hardwareConcurrency: 16, deviceMemory: 8 })).toBe(false);
  });

  // null, not undefined: undefined takes the default, the real navigator,
  // whose core count is the test machine's own, and a 4-core CI runner is
  // exactly what counts as low end.
  it('takes no navigator at all for a computer that is not low end', () => {
    expect(isLowEnd(null)).toBe(false);
    expect(isLowEnd({})).toBe(false);
  });
});

describe('resolveEffects', () => {
  it('honours a pick, and on automatic suits the computer', () => {
    expect(resolveEffects('light', { low: false })).toBe('light');
    expect(resolveEffects('auto', { low: false })).toBe('full');
    expect(resolveEffects('auto', { low: true })).toBe('light');
    expect(resolveEffects('auto', { reduce: true, low: false })).toBe('off');
  });
});

describe('the stored choice', () => {
  it('is automatic until something valid is saved', () => {
    const storage = memory();
    expect(readEffectsChoice(storage)).toBe('auto');
    writeEffectsChoice('light', storage);
    expect(readEffectsChoice(storage)).toBe('light');
    storage.setItem('jobdekho-effects', 'sparkly');
    expect(readEffectsChoice(storage)).toBe('auto');
  });
});

describe('applyEffects', () => {
  it('puts the level on <html> and returns it', () => {
    const win = { document, navigator: { hardwareConcurrency: 2 }, matchMedia: () => ({ matches: false }) };
    expect(applyEffects('auto', win)).toBe('light');
    expect(document.documentElement.dataset.effects).toBe('light');
    expect(applyEffects('full', win)).toBe('full');
    expect(document.documentElement.dataset.effects).toBe('full');
  });
});
