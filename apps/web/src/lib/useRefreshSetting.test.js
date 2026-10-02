import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useRefreshSetting } from './useRefreshSetting.js';
import { onNotice } from './toast.js';

vi.mock('../api.js', () => ({ getScrapeSettings: vi.fn(), putScrapeSettings: vi.fn() }));

import { getScrapeSettings, putScrapeSettings } from '../api.js';

beforeEach(() => {
  vi.clearAllMocks();
  getScrapeSettings.mockResolvedValue({ autoRefresh: true, linkedin: true });
  putScrapeSettings.mockResolvedValue(null);
});

describe('useRefreshSetting', () => {
  it('reads the saved switches, and is not ready to flip until it has', async () => {
    getScrapeSettings.mockResolvedValue({ autoRefresh: false, linkedin: false });
    const { result } = renderHook(() => useRefreshSetting());
    expect(result.current.ready).toBe(false);
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.autoRefresh).toBe(false);
    expect(result.current.linkedin).toBe(false);
  });

  // A server from before the LinkedIn switch existed says nothing about it.
  // The server's own defaults: the daily refresh on, LinkedIn off.
  it('reads a switch the server did not mention as its default', async () => {
    getScrapeSettings.mockResolvedValue({ autoRefresh: false });
    const { result } = renderHook(() => useRefreshSetting());
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.linkedin).toBe(false);
    getScrapeSettings.mockResolvedValue({ linkedin: true });
    const again = renderHook(() => useRefreshSetting()).result;
    await waitFor(() => expect(again.current.ready).toBe(true));
    expect(again.current.autoRefresh).toBe(true);
  });

  it('saves Include LinkedIn on its own as it is flipped, leaving the other switch alone', async () => {
    const { result } = renderHook(() => useRefreshSetting());
    await waitFor(() => expect(result.current.ready).toBe(true));
    await act(() => result.current.toggleLinkedin(false));
    expect(putScrapeSettings).toHaveBeenCalledWith({ linkedin: false });
    expect(result.current.linkedin).toBe(false);
    expect(result.current.autoRefresh).toBe(true);
    expect(result.current.saved).toBe('saved');
  });

  it('flips only LinkedIn back when its save fails', async () => {
    const notices = vi.fn();
    const stop = onNotice(notices);
    const { result } = renderHook(() => useRefreshSetting());
    await waitFor(() => expect(result.current.ready).toBe(true));
    await act(() => result.current.toggle(false));
    putScrapeSettings.mockRejectedValue(new Error('disk full'));
    await act(() => result.current.toggleLinkedin(false));
    stop();
    expect(result.current.linkedin).toBe(true);
    expect(result.current.autoRefresh).toBe(false);
    expect(notices).toHaveBeenCalledWith(expect.objectContaining({ title: 'Could not save the LinkedIn setting' }));
  });

  it('saves a flip as it is made', async () => {
    const { result } = renderHook(() => useRefreshSetting());
    await waitFor(() => expect(result.current.ready).toBe(true));
    await act(() => result.current.toggle(false));
    expect(putScrapeSettings).toHaveBeenCalledWith({ autoRefresh: false });
    expect(result.current.autoRefresh).toBe(false);
    expect(result.current.saved).toBe('saved');
  });

  it('flips back and says so when the save fails', async () => {
    const notices = vi.fn();
    const stop = onNotice(notices);
    putScrapeSettings.mockRejectedValue(new Error('disk full'));
    const { result } = renderHook(() => useRefreshSetting());
    await waitFor(() => expect(result.current.ready).toBe(true));
    await act(() => result.current.toggle(false));
    stop();
    expect(result.current.autoRefresh).toBe(true);
    expect(result.current.saved).toBe('error');
    expect(notices).toHaveBeenCalledWith(expect.objectContaining({ title: 'Could not save the refresh setting' }));
  });

  it('stays on, and usable, when the setting could not be read', async () => {
    getScrapeSettings.mockRejectedValue(new Error('down'));
    const { result } = renderHook(() => useRefreshSetting());
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.autoRefresh).toBe(true);
  });

  it('does not save a flip to the value it already holds', async () => {
    const { result } = renderHook(() => useRefreshSetting());
    await waitFor(() => expect(result.current.ready).toBe(true));
    await act(() => result.current.toggle(true));
    expect(putScrapeSettings).not.toHaveBeenCalled();
  });
});
