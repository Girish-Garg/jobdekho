import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSetup } from './useSetup.js';

vi.mock('../api.js', () => ({ getSetup: vi.fn() }));

import { getSetup } from '../api.js';

const OK = [{ id: 'ai', label: 'An AI to answer with', state: 'ok', detail: 'Claude Code runs here.', fix: null }];
const MISSING = [{ id: 'ai', label: 'An AI to answer with', state: 'missing', detail: 'No AI was found.', fix: 'Install one.' }];

beforeEach(() => {
  vi.clearAllMocks();
  getSetup.mockResolvedValue(OK);
});

describe('useSetup', () => {
  it('is undefined until the first answer, then holds the checks', async () => {
    const { result } = renderHook(() => useSetup());
    expect(result.current.checks).toBeUndefined();
    await waitFor(() => expect(result.current.checks).toEqual(OK));
    expect(getSetup).toHaveBeenCalledWith({ refresh: false });
  });

  it('is null when the check could not run', async () => {
    getSetup.mockRejectedValue(new Error('server down'));
    const { result } = renderHook(() => useSetup());
    await waitFor(() => expect(result.current.checks).toBeNull());
    expect(result.current.checking).toBe(false);
  });

  it('asks the server to probe again on refresh, and says it is checking meanwhile', async () => {
    const { result } = renderHook(() => useSetup());
    await waitFor(() => expect(result.current.checks).toEqual(OK));
    let finish;
    getSetup.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    act(() => { result.current.refresh(); });
    expect(result.current.checking).toBe(true);
    expect(getSetup).toHaveBeenLastCalledWith({ refresh: true });
    await act(async () => finish(MISSING));
    expect(result.current.checks).toEqual(MISSING);
    expect(result.current.checking).toBe(false);
  });
});
