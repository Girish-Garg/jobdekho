import { describe, it, expect, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChatScope } from './useChatScope.js';
import { announceOpenPosting } from './openPostingSignal.js';
import { announceBlocked } from './blockedSignal.js';

afterEach(() => announceOpenPosting(null));

const job = { id: 'p1', title: 'Engineer', company: 'Acme Foundation' };

describe('useChatScope', () => {
  it('follows the job opened in the pane, and keeps it when the pane closes', () => {
    const { result } = renderHook(() => useChatScope());
    act(() => announceOpenPosting(job));
    act(() => announceOpenPosting(null));
    expect(result.current.posting).toEqual(job);
  });

  // A job the person never wants to see again is not one to keep asking about.
  it('lets go of the job when its company is blocked, and of no other', () => {
    const { result } = renderHook(() => useChatScope());
    act(() => announceOpenPosting(job));
    act(() => announceBlocked(['Beta']));
    expect(result.current.posting).toEqual(job);
    act(() => announceBlocked(['Acme Foundation']));
    expect(result.current.posting).toBeNull();
  });
});
