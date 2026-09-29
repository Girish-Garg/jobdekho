import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAppliedProfile } from './useAppliedProfile.js';
import { announceApplied } from './proposalAppliedSignal.js';

const RECORD = { skills: ['go'], projects: [{ id: 'x1', title: 'CLI tool' }] };

function setup(dirty) {
  const state = { dirty, replace: vi.fn(), rebase: vi.fn() };
  const hook = renderHook((props) => useAppliedProfile(props), { initialProps: state });
  return { state, ...hook };
}

describe('useAppliedProfile', () => {
  it('shows the applied record straight away when nothing is unsaved', () => {
    const { state, result } = setup(false);
    act(() => announceApplied({ kind: 'profile', profile: RECORD }));
    expect(state.replace).toHaveBeenCalledWith(RECORD);
    expect(state.rebase).not.toHaveBeenCalled();
    expect(result.current.incoming).toBeNull();
  });

  // Unsaved edits are never overwritten silently.
  it('keeps unsaved edits on screen and holds the applied record for the person to choose', () => {
    const { state, result } = setup(true);
    act(() => announceApplied({ kind: 'profile', profile: RECORD }));
    expect(state.replace).not.toHaveBeenCalled();
    expect(state.rebase).toHaveBeenCalledWith(RECORD);
    expect(result.current.incoming).toBe(RECORD);
  });

  it('loads the applied record on request, dropping the edits', () => {
    const { state, result } = setup(true);
    act(() => announceApplied({ kind: 'profile', profile: RECORD }));
    act(() => result.current.load());
    expect(state.replace).toHaveBeenCalledWith(RECORD);
    expect(result.current.incoming).toBeNull();
  });

  it('lets the person keep editing, which only clears the question', () => {
    const { state, result } = setup(true);
    act(() => announceApplied({ kind: 'profile', profile: RECORD }));
    act(() => result.current.keep());
    expect(state.replace).not.toHaveBeenCalled();
    expect(result.current.incoming).toBeNull();
  });

  it('decides on the page as it is when the change lands, not as it was', () => {
    const { state, rerender } = setup(true);
    const clean = { ...state, dirty: false };
    rerender(clean);
    act(() => announceApplied({ kind: 'profile', profile: RECORD }));
    expect(clean.replace).toHaveBeenCalledWith(RECORD);
  });

  it('ignores a document applied elsewhere', () => {
    const { state } = setup(false);
    act(() => announceApplied({ kind: 'document', document: { id: 'd1' } }));
    expect(state.replace).not.toHaveBeenCalled();
  });
});
