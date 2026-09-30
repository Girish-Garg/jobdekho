import { describe, it, expect, vi } from 'vitest';
import { installDither } from './dither.js';

describe('installDither', () => {
  it('does nothing where the Paint API is missing, leaving the plain hovers', () => {
    expect(installDither({ CSS: {}, document })).toBe(false);
  });

  it('loads the worklet where the Paint API exists', () => {
    const addModule = vi.fn();
    expect(installDither({ CSS: { paintWorklet: { addModule } }, document })).toBe(true);
    expect(addModule).toHaveBeenCalledWith(expect.stringContaining('ditherWorklet'));
  });
});
