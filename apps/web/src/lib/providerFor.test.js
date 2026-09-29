import { describe, it, expect } from 'vitest';
import { providerFor } from './providerFor.js';

const claude = (over = {}) => ({ id: 'claude', label: 'Claude Code', policies: ['none', 'web'], present: true, runs: true, ...over });
const agy = (over = {}) => ({ id: 'agy', label: 'Antigravity', policies: ['none', 'web'], present: true, runs: true, ...over });
const noWeb = (over = {}) => ({ id: 'other', label: 'Other CLI', policies: ['none'], present: true, runs: true, ...over });
const absent = { present: false, runs: false };

describe('providerFor', () => {
  it('takes the first CLI that is installed, runs and honours the policy', () => {
    expect(providerFor([claude(), agy()], 'none').id).toBe('claude');
    expect(providerFor([claude(absent), agy()], 'none').id).toBe('agy');
    expect(providerFor([claude({ runs: false }), agy()], 'none').id).toBe('agy');
  });

  it('offers Antigravity for a web action when Claude Code is not there', () => {
    expect(providerFor([claude(), agy()], 'web').id).toBe('claude');
    expect(providerFor([claude(absent), agy()], 'web').id).toBe('agy');
  });

  it('never offers a CLI for a policy it does not honour', () => {
    expect(providerFor([claude(absent), noWeb()], 'web')).toBeNull();
  });

  it('is null when nothing fits, including an empty list', () => {
    expect(providerFor([], 'none')).toBeNull();
    expect(providerFor([claude(absent), agy(absent)], 'none')).toBeNull();
  });
});
