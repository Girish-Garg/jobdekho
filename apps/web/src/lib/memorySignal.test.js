import { describe, it, expect, vi } from 'vitest';
import { announceMemoryChanged, onMemoryChanged } from './memorySignal.js';

// That an answer which saved a memory announces it is tested where answers
// land (see chatCall.test.js).
describe('memorySignal', () => {
  it('tells every listener, until it stops listening', () => {
    const heard = vi.fn();
    const stop = onMemoryChanged(heard);
    announceMemoryChanged();
    stop();
    announceMemoryChanged();
    expect(heard).toHaveBeenCalledTimes(1);
  });
});
