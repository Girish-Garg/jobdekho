import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSourceDraft } from './useSourceDraft.js';

const setup = (tex = 'v1') => renderHook(({ text }) => useSourceDraft(text), { initialProps: { text: tex } });

describe('useSourceDraft', () => {
  it('starts as the saved source, untouched', () => {
    const { result } = setup();
    expect(result.current.draft).toBe('v1');
    expect(result.current.dirty).toBe(false);
    expect(result.current.stale).toBe(false);
  });

  it('follows a new source while the draft is untouched', () => {
    const { result, rerender } = setup();
    rerender({ text: 'v2 from the chat' });
    expect(result.current.draft).toBe('v2 from the chat');
    expect(result.current.dirty).toBe(false);
  });

  // An applied proposal must never silently eat what the person typed.
  it('keeps an edited draft when the source changes under it, and says so', () => {
    const { result, rerender } = setup();
    act(() => result.current.setDraft('my edit'));
    rerender({ text: 'v2 from the chat' });
    expect(result.current.draft).toBe('my edit');
    expect(result.current.stale).toBe(true);
  });

  it('loads the new source on request, dropping the edit', () => {
    const { result, rerender } = setup();
    act(() => result.current.setDraft('my edit'));
    rerender({ text: 'v2' });
    act(() => result.current.load());
    expect(result.current.draft).toBe('v2');
    expect(result.current.dirty).toBe(false);
  });

  it('keeps editing on request, now measured against the new source', () => {
    const { result, rerender } = setup();
    act(() => result.current.setDraft('my edit'));
    rerender({ text: 'v2' });
    act(() => result.current.keep());
    expect(result.current.stale).toBe(false);
    expect(result.current.dirty).toBe(true);
    act(() => result.current.discard());
    expect(result.current.draft).toBe('v2');
  });

  it('takes a saved text as the new base, so the save does not read as a change under the editor', () => {
    const { result, rerender } = setup();
    act(() => result.current.setDraft('my edit'));
    act(() => result.current.saved('my edit'));
    rerender({ text: 'my edit' });
    expect(result.current.dirty).toBe(false);
    expect(result.current.stale).toBe(false);
  });
});
