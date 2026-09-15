import { describe, it, expect, vi } from 'vitest';
import { requestSort, onSortRequest } from './commandBus.js';

describe('commandBus', () => {
  it('delivers a requested value to a subscribed handler', () => {
    const handler = vi.fn();
    const stop = onSortRequest(handler);
    requestSort('newest');
    expect(handler).toHaveBeenCalledWith('newest');
    stop();
  });

  it('stops delivering once unsubscribed', () => {
    const handler = vi.fn();
    const stop = onSortRequest(handler);
    stop();
    requestSort('oldest');
    expect(handler).not.toHaveBeenCalled();
  });

  it('hands back a no-op unsubscribe when there is no handler yet', () => {
    const stop = onSortRequest(undefined);
    expect(() => stop()).not.toThrow();
  });

  it('does not cross-talk between independent subscriptions', () => {
    const first = vi.fn();
    const second = vi.fn();
    const stopFirst = onSortRequest(first);
    const stopSecond = onSortRequest(second);
    requestSort('company');
    expect(first).toHaveBeenCalledWith('company');
    expect(second).toHaveBeenCalledWith('company');
    stopFirst();
    stopSecond();
  });
});
