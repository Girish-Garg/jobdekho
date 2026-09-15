import { describe, it, expect, vi } from 'vitest';
import { KEY, readChoice, writeChoice, resolve, applyTheme, watchSystem } from './theme.js';

const storage = (value) => ({ getItem: () => value, setItem: vi.fn() });
const view = (matches, media = {}) => ({ matchMedia: () => ({ matches, ...media }) });

describe('readChoice', () => {
  it('reads a stored choice and falls back to following the system', () => {
    expect(readChoice(storage('dark'))).toBe('dark');
    expect(readChoice(storage(null))).toBe('system');
    expect(readChoice(storage('chartreuse'))).toBe('system');
  });

  // A browser set to block site data throws on access rather than returning
  // null, and a theme is not worth failing a render over.
  it('survives storage that throws', () => {
    expect(readChoice({ getItem: () => { throw new Error('blocked'); } })).toBe('system');
    expect(() => writeChoice('dark', { setItem: () => { throw new Error('blocked'); } })).not.toThrow();
  });

  it('writes under the key the pre-paint script reads', () => {
    const store = storage(null);
    writeChoice('light', store);
    expect(store.setItem).toHaveBeenCalledWith(KEY, 'light');
  });
});

describe('resolve', () => {
  it('follows the system only when the choice is to', () => {
    expect(resolve('system', true)).toBe('dark');
    expect(resolve('system', false)).toBe('light');
    expect(resolve('light', true)).toBe('light');
    expect(resolve('dark', false)).toBe('dark');
  });
});

describe('applyTheme', () => {
  // Light is the absence of the attribute, so a page that never runs this
  // still renders in the default theme.
  it('marks the root for dark and unmarks it for light', () => {
    const root = document.createElement('div');
    expect(applyTheme('dark', { root, view: view(false) })).toBe('dark');
    expect(root.getAttribute('data-theme')).toBe('dark');
    expect(applyTheme('light', { root, view: view(true) })).toBe('light');
    expect(root.hasAttribute('data-theme')).toBe(false);
    applyTheme('system', { root, view: view(true) });
    expect(root.getAttribute('data-theme')).toBe('dark');
  });
});

describe('watchSystem', () => {
  it('subscribes and hands back an unsubscribe', () => {
    const addEventListener = vi.fn();
    const removeEventListener = vi.fn();
    const stop = watchSystem(() => {}, view(false, { addEventListener, removeEventListener }));
    expect(addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    stop();
    expect(removeEventListener).toHaveBeenCalled();
  });

  it('is a no-op where matchMedia is not available', () => {
    expect(() => watchSystem(() => {}, {})()).not.toThrow();
  });
});
