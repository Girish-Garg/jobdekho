import { describe, it, expect, vi } from 'vitest';
import {
  announceOpenPosting, currentOpenPosting, onOpenPostingChange, requestOpenPosting, onOpenPostingRequest,
} from './openPostingSignal.js';

const P1 = { id: 'p1', title: 'Frontend Intern', company: 'Acme' };

describe('openPostingSignal', () => {
  it('starts with nothing open', () => {
    announceOpenPosting(null);
    expect(currentOpenPosting()).toBeNull();
  });

  it('remembers the last posting announced, for a listener that starts after it changed', () => {
    announceOpenPosting(P1);
    expect(currentOpenPosting()).toBe(P1);
  });

  it('tells a listener about a later change, posting and all', () => {
    const handler = vi.fn();
    const stop = onOpenPostingChange(handler);
    announceOpenPosting({ id: 'p2' });
    expect(handler).toHaveBeenCalledWith({ id: 'p2' });
    stop();
    announceOpenPosting({ id: 'p3' });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('carries a request to open a posting to whoever listens for one', () => {
    const handler = vi.fn();
    const stop = onOpenPostingRequest(handler);
    requestOpenPosting('p7');
    expect(handler).toHaveBeenCalledWith('p7');
    stop();
    requestOpenPosting('p8');
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
