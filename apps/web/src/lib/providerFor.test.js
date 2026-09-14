import { describe, it, expect } from 'vitest';
import { providerFor } from './providerFor.js';

const claude = (over = {}) => ({ id: 'claude', label: 'Claude Code', policies: ['none', 'web'], present: true, runs: true, ...over });
const agy = (over = {}) => ({ id: 'agy', label: 'Antigravity', policies: ['none'], present: true, runs: true, ...over });
const absent = { present: false, runs: false };

describe('providerFor', () => {
  it('takes the first CLI that is installed, runs and honours the policy', () => {
    expect(providerFor([claude(), agy()], 'none').id).toBe('claude');
    expect(providerFor([claude(absent), agy()], 'none').id).toBe('agy');
    expect(providerFor([claude({ runs: false }), agy()], 'none').id).toBe('agy');
  });

  // Antigravity honours no-tools by having every tool denied; a browser is
  // not something it can be handed, so the fake check never names it.
  it('never offers Antigravity for a web action', () => {
    expect(providerFor([claude(), agy()], 'web').id).toBe('claude');
    expect(providerFor([claude(absent), agy()], 'web')).toBeNull();
  });

  it('is null when nothing fits, including an empty list', () => {
    expect(providerFor([], 'none')).toBeNull();
    expect(providerFor([claude(absent), agy(absent)], 'none')).toBeNull();
  });
});
