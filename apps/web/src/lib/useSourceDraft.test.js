import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSourceDraft } from './useSourceDraft.js';
import { draftFor, keepDraft } from './sourceDrafts.js';

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

  it('keeps an edited draft for its document after the editor goes, and picks it up again', () => {
    const first = renderHook(({ text }) => useSourceDraft(text, 'd1'), { initialProps: { text: 'v1' } });
    act(() => first.result.current.setDraft('my edit'));
    first.unmount();
    expect(draftFor('d1')).toEqual({ draft: 'my edit', base: 'v1' });
    const again = renderHook(({ text }) => useSourceDraft(text, 'd1'), { initialProps: { text: undefined } });
    again.rerender({ text: 'v1' });
    expect(again.result.current.draft).toBe('my edit');
    expect(again.result.current.dirty).toBe(true);
    expect(again.result.current.stale).toBe(false);
  });

  it('says so when the document changed while another one was open', () => {
    keepDraft('d1', 'my edit', 'v1');
    const { result } = renderHook(({ text }) => useSourceDraft(text, 'd1'), { initialProps: { text: 'v2 from the chat' } });
    expect(result.current.draft).toBe('my edit');
    expect(result.current.stale).toBe(true);
  });

  it('forgets the kept draft once it is saved or discarded', () => {
    const { result } = renderHook(({ text }) => useSourceDraft(text, 'd1'), { initialProps: { text: 'v1' } });
    act(() => result.current.setDraft('my edit'));
    act(() => result.current.discard());
    expect(draftFor('d1')).toBeNull();
    act(() => result.current.setDraft('again'));
    act(() => result.current.saved('again'));
    expect(draftFor('d1')).toBeNull();
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
