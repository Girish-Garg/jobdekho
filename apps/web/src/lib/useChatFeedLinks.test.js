import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChatFeedLinks } from './useChatFeedLinks.js';
import { onOpenPostingRequest } from './openPostingSignal.js';

const FILTERS = { workModes: [], q: 'react' };
const applyFns = () => ({ setFilters: vi.fn(), setSort: vi.fn(), setView: vi.fn() });

afterEach(() => vi.useRealTimers());

describe('useChatFeedLinks', () => {
  it('applies a filter or a sort on the feed without leaving it', () => {
    const apply = applyFns();
    const { result } = renderHook(() => useChatFeedLinks({ onFeed: true, filters: FILTERS, apply }));
    result.current.onApply({ type: 'filters', patch: { workModes: ['remote'] } });
    result.current.onApply({ type: 'sort', value: 'newest' });
    expect(apply.setFilters).toHaveBeenCalledWith({ workModes: ['remote'], q: 'react' });
    expect(apply.setSort).toHaveBeenCalledWith('newest');
    expect(apply.setView).not.toHaveBeenCalled();
  });

  // A kept conversation's button still carries the number it was made with.
  it('applies a kept Fit button at today\'s floor for the letter it showed', () => {
    const apply = applyFns();
    const { result } = renderHook(() => useChatFeedLinks({ onFeed: true, filters: FILTERS, apply }));
    result.current.onApply({ type: 'filters', patch: { minFit: '50' }, label: 'Show grade B or better' });
    expect(apply.setFilters).toHaveBeenCalledWith({ workModes: [], q: 'react', minFit: '40' });
  });

  it('opens a named job straight away on the feed', () => {
    const opened = vi.fn();
    const stop = onOpenPostingRequest(opened);
    const { result } = renderHook(() => useChatFeedLinks({ onFeed: true, filters: FILTERS, apply: applyFns() }));
    result.current.onOpenRef('p1');
    expect(opened).toHaveBeenCalledWith('p1');
    stop();
  });

  it('from another page, goes to the feed first and asks for the job once it is there', () => {
    vi.useFakeTimers();
    const opened = vi.fn();
    const stop = onOpenPostingRequest(opened);
    const apply = applyFns();
    const { result, rerender } = renderHook(({ onFeed }) => useChatFeedLinks({ onFeed, filters: FILTERS, apply }), { initialProps: { onFeed: false } });
    act(() => result.current.onOpenRef('p7'));
    expect(apply.setView).toHaveBeenCalledWith('postings');
    expect(opened).not.toHaveBeenCalled();
    rerender({ onFeed: true });
    expect(opened).not.toHaveBeenCalled();
    act(() => vi.runAllTimers());
    expect(opened).toHaveBeenCalledTimes(1);
    expect(opened).toHaveBeenCalledWith('p7');
    rerender({ onFeed: false });
    rerender({ onFeed: true });
    act(() => vi.runAllTimers());
    expect(opened).toHaveBeenCalledTimes(1);
    stop();
  });

  it('from another page, applies an offered filter and goes to the feed to show it', () => {
    const apply = applyFns();
    const { result } = renderHook(() => useChatFeedLinks({ onFeed: false, filters: FILTERS, apply }));
    result.current.onApply({ type: 'filters', patch: { workModes: ['remote'] } });
    expect(apply.setFilters).toHaveBeenCalled();
    expect(apply.setView).toHaveBeenCalledWith('postings');
  });
});
