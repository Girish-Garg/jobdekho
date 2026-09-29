import { describe, it, expect, vi } from 'vitest';
import { announceApplied, onApplied } from './proposalAppliedSignal.js';

describe('proposalAppliedSignal', () => {
  it('hands what the server saved to every listener, until it stops listening', () => {
    const handler = vi.fn();
    const stop = onApplied(handler);
    announceApplied({ kind: 'profile', profile: { skills: ['go'] } });
    stop();
    announceApplied({ kind: 'document', document: { id: 'd1' } });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ kind: 'profile', profile: { skills: ['go'] } });
  });
});
