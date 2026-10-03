import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { draftOf, moveDraft, setDraft, useDraft } from './chatDrafts.js';

const saved = () => JSON.parse(localStorage.getItem('jobdekho-chat-drafts') ?? 'null');

describe('chatDrafts', () => {
  it('keeps each chat\'s draft apart, under one key in the browser', () => {
    setDraft('c1', 'about the first');
    setDraft('job:pB', 'about job B');
    expect(draftOf('c1')).toBe('about the first');
    expect(draftOf('job:pB')).toBe('about job B');
    expect(draftOf('c2')).toBe('');
    expect(saved()).toEqual({ c1: 'about the first', 'job:pB': 'about job B' });
  });

  it('drops a chat from the map once its draft is empty, so the map only holds typing', () => {
    setDraft('c1', 'typing');
    setDraft('c1', '');
    expect(saved()).toEqual({});
  });

  it('moves a placeholder\'s draft to the chat once it is made, leaving the others alone', () => {
    setDraft('job:pA', 'half a question');
    setDraft('c9', 'another chat\'s');
    moveDraft('job:pA', 'c-pA');
    expect(draftOf('job:pA')).toBe('');
    expect(draftOf('c-pA')).toBe('half a question');
    expect(draftOf('c9')).toBe('another chat\'s');
  });

  it('reads what an earlier page left in the browser', () => {
    localStorage.setItem('jobdekho-chat-drafts', JSON.stringify({ c3: 'from before the reload' }));
    expect(draftOf('c3')).toBe('from before the reload');
  });

  it('gives a hook that follows a chat\'s draft as it changes from elsewhere', () => {
    const { result, rerender } = renderHook(({ id }) => useDraft(id), { initialProps: { id: 'c1' } });
    act(() => result.current[1]('typed here'));
    expect(result.current[0]).toBe('typed here');
    act(() => setDraft('c1', 'put back by Edit question'));
    expect(result.current[0]).toBe('put back by Edit question');
    rerender({ id: 'c2' });
    expect(result.current[0]).toBe('');
  });
});
