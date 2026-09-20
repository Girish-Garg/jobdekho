import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCurrentSection } from './useCurrentSection.js';

const IDS = ['profile-basics', 'profile-experience', 'profile-projects'];

// jsdom lays nothing out, so each section's top is whatever the test says.
function placeSections(tops) {
  for (const [id, top] of Object.entries(tops)) {
    const el = document.createElement('section');
    el.id = id;
    el.getBoundingClientRect = () => ({ top });
    el.scrollIntoView = vi.fn();
    document.body.appendChild(el);
  }
}

const scroll = () => act(() => { document.dispatchEvent(new Event('scroll')); });

beforeEach(() => { window.innerHeight = 900; });
afterEach(() => { document.body.innerHTML = ''; });

describe('useCurrentSection', () => {
  it('starts on the first section, and on nothing when there are no sections', () => {
    expect(renderHook(() => useCurrentSection(IDS)).result.current[0]).toBe('profile-basics');
    expect(renderHook(() => useCurrentSection([])).result.current[0]).toBeNull();
  });

  it('marks the last section whose top has crossed a third of the window', () => {
    placeSections({ 'profile-basics': -400, 'profile-experience': 120, 'profile-projects': 700 });
    const { result } = renderHook(() => useCurrentSection(IDS));
    scroll();
    expect(result.current[0]).toBe('profile-experience');
  });

  it('keeps a tall section current until the next heading gets there', () => {
    placeSections({ 'profile-basics': -900, 'profile-experience': -500, 'profile-projects': 320 });
    const { result } = renderHook(() => useCurrentSection(IDS));
    scroll();
    expect(result.current[0]).toBe('profile-experience');
  });

  it('falls back to the first section when nothing has crossed the line yet', () => {
    placeSections({ 'profile-basics': 400, 'profile-experience': 800, 'profile-projects': 1200 });
    const { result } = renderHook(() => useCurrentSection(IDS));
    scroll();
    expect(result.current[0]).toBe('profile-basics');
  });

  it('jumps by scrolling the section to the top and marking it, ignoring the scroll that jump causes', () => {
    placeSections({ 'profile-basics': 0, 'profile-experience': 500, 'profile-projects': 1000 });
    const { result } = renderHook(() => useCurrentSection(IDS));
    act(() => result.current[1]('profile-projects'));
    expect(document.getElementById('profile-projects').scrollIntoView).toHaveBeenCalledWith({ block: 'start' });
    expect(result.current[0]).toBe('profile-projects');
    // The positions above still say Basics; the one scroll a jump fires
    // must not undo the click, but the next real scroll is read as usual.
    scroll();
    expect(result.current[0]).toBe('profile-projects');
    scroll();
    expect(result.current[0]).toBe('profile-basics');
  });

  it('follows the sections when the list changes and drops a current that vanished', () => {
    const { result, rerender } = renderHook(({ ids }) => useCurrentSection(ids), { initialProps: { ids: IDS } });
    act(() => result.current[1]('profile-projects'));
    rerender({ ids: ['profile-basics', 'profile-experience'] });
    expect(result.current[0]).toBe('profile-basics');
  });

  it('stops listening once unmounted', () => {
    const remove = vi.spyOn(document, 'removeEventListener');
    const { unmount } = renderHook(() => useCurrentSection(IDS));
    unmount();
    expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function), true);
    remove.mockRestore();
  });
});
