import { describe, it, expect, vi } from 'vitest';
import { askAboutPosting, onAskAboutPosting, takeRequest } from './askAiSignal.js';

describe('askAiSignal', () => {
  it('carries the posting and the action to start, each ask with its own id', () => {
    const handler = vi.fn();
    const stop = onAskAboutPosting(handler);
    askAboutPosting({ id: 'p1' }, 'fake-check');
    askAboutPosting({ id: 'p2' });
    stop();
    const [first, second] = handler.mock.calls.map(([request]) => request);
    expect(first).toMatchObject({ posting: { id: 'p1' }, action: 'fake-check' });
    expect(second).toMatchObject({ posting: { id: 'p2' }, action: null });
    expect(second.id).toBeGreaterThan(first.id);
  });

  // A panel that remounts with the same request must not start the same
  // check a second time.
  it('lets each request be taken exactly once', () => {
    let request;
    const stop = onAskAboutPosting((r) => { request = r; });
    askAboutPosting({ id: 'p3' }, 'fake-check');
    stop();
    expect(takeRequest(request)).toBe(true);
    expect(takeRequest(request)).toBe(false);
    expect(takeRequest(null)).toBe(false);
  });
});
