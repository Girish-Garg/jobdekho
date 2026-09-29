import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CHAT_WIDTH, clampWidth, maxWidth, opensDocked, readLayout, saveLayout } from './chatLayout.js';

const KEY = 'jobdekho-chat-layout';
const wideView = (matches) => ({ matchMedia: () => ({ matches }) });

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('chat width', () => {
  it('lets the panel grow to 720px on a big window, and to 60 percent of a smaller one', () => {
    expect(maxWidth(1920)).toBe(720);
    expect(maxWidth(1100)).toBe(660);
  });

  it('never lets the limit fall under the minimum width', () => {
    expect(maxWidth(300)).toBe(CHAT_WIDTH.min);
  });

  it('clamps a width between 320px and the limit, rounding a dragged fraction', () => {
    expect(clampWidth(100, 1440)).toBe(320);
    expect(clampWidth(5000, 1440)).toBe(720);
    expect(clampWidth(401.6, 1440)).toBe(402);
  });

  it('falls back to the default width for nonsense', () => {
    expect(clampWidth('wide', 1440)).toBe(CHAT_WIDTH.fallback);
    expect(clampWidth(undefined, 1440)).toBe(380);
  });
});

describe('saved layout', () => {
  it('starts floating, at the default width, closed', () => {
    expect(readLayout()).toEqual({ pinned: false, width: 380, open: false });
  });

  it('merges each save into what was saved before', () => {
    saveLayout({ pinned: true });
    saveLayout({ width: 500 });
    expect(readLayout()).toEqual({ pinned: true, width: 500, open: false });
  });

  it('reads a broken or foreign value as the defaults', () => {
    localStorage.setItem(KEY, '{not json');
    expect(readLayout().pinned).toBe(false);
    localStorage.setItem(KEY, JSON.stringify({ pinned: 'yes', width: -4 }));
    expect(readLayout()).toEqual({ pinned: false, width: 380, open: false });
  });

  it('survives storage that throws on every call', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(() => saveLayout({ pinned: true })).not.toThrow();
    expect(readLayout()).toEqual({ pinned: false, width: 380, open: false });
  });
});

describe('opensDocked', () => {
  it('reopens a pinned panel that was left open, on a wide window only', () => {
    saveLayout({ pinned: true, open: true });
    expect(opensDocked(wideView(true))).toBe(true);
    expect(opensDocked(wideView(false))).toBe(false);
  });

  it('keeps a floating panel, or a pinned one that was closed, closed', () => {
    saveLayout({ pinned: false, open: true });
    expect(opensDocked(wideView(true))).toBe(false);
    saveLayout({ pinned: true, open: false });
    expect(opensDocked(wideView(true))).toBe(false);
  });
});
