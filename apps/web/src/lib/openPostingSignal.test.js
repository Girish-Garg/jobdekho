import { describe, it, expect, vi } from 'vitest';
import { announceOpenPosting, currentOpenPostingId, onOpenPostingChange } from './openPostingSignal.js';

describe('openPostingSignal', () => {
  it('starts with nothing open', () => {
    announceOpenPosting(null);
    expect(currentOpenPostingId()).toBeNull();
  });

  it('remembers the last id announced, for a listener that starts after it changed', () => {
    announceOpenPosting('p1');
    expect(currentOpenPostingId()).toBe('p1');
  });

  it('tells a listener about a later change', () => {
    const handler = vi.fn();
    const stop = onOpenPostingChange(handler);
    announceOpenPosting('p2');
    expect(handler).toHaveBeenCalledWith('p2');
    stop();
    announceOpenPosting('p3');
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
