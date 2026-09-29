import { describe, it, expect } from 'vitest';
import { chatAnswerer, providerLabel } from './chatAnswerer.js';

const CLAUDE = { id: 'claude', label: 'Claude Code', policies: ['none', 'web'], present: true, runs: true };
const AGY = { id: 'agy', label: 'Antigravity', policies: ['none', 'web'], present: true, runs: true };

describe('chatAnswerer', () => {
  it('names the preferred CLI when it can answer', () => {
    expect(chatAnswerer([CLAUDE, AGY], 'agy')).toBe(AGY);
  });

  it('falls back to the first usable CLI for auto, no preference, or a preferred one that cannot run', () => {
    expect(chatAnswerer([CLAUDE, AGY], 'auto')).toBe(CLAUDE);
    expect(chatAnswerer([CLAUDE, AGY], null)).toBe(CLAUDE);
    expect(chatAnswerer([CLAUDE, { ...AGY, runs: false }], 'agy')).toBe(CLAUDE);
  });

  it('skips CLIs that are missing or cannot take a plain call', () => {
    expect(chatAnswerer([{ ...CLAUDE, present: false }, AGY], null)).toBe(AGY);
    expect(chatAnswerer([{ ...CLAUDE, policies: ['web'] }], null)).toBeNull();
  });

  it('knows nothing while the probe is still out', () => {
    expect(chatAnswerer(undefined, 'agy')).toBeNull();
  });
});

describe('providerLabel', () => {
  it('names a CLI by its label, and anything unknown as AI', () => {
    expect(providerLabel([CLAUDE, AGY], 'agy')).toBe('Antigravity');
    expect(providerLabel([CLAUDE], 'other')).toBe('AI');
    expect(providerLabel(undefined, 'claude')).toBe('AI');
    expect(providerLabel([CLAUDE], null)).toBe('AI');
  });
});
