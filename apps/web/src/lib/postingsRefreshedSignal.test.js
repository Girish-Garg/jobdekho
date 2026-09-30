import { describe, it, expect, vi } from 'vitest';
import { announceRefreshed, onRefreshed } from './postingsRefreshedSignal.js';

describe('postingsRefreshedSignal', () => {
  it('hands what the refresh found to every listener, until it stops listening', () => {
    const handler = vi.fn();
    const stop = onRefreshed(handler);
    announceRefreshed({ fresh: 37, total: 900, tooOld: 0, removed: 2, failed: [] });
    stop();
    announceRefreshed({ fresh: 1 });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ fresh: 37, total: 900, tooOld: 0, removed: 2, failed: [] });
  });

  it('says null for a refresh that did not finish, so a listener still reads again', () => {
    const handler = vi.fn();
    const stop = onRefreshed(handler);
    announceRefreshed(undefined);
    stop();
    expect(handler).toHaveBeenCalledWith(null);
  });
});
