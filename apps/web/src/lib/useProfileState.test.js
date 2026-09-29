import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useProfileState } from './useProfileState.js';
import { EMPTY_PROFILE } from './emptyProfile.js';

vi.mock('../api.js', () => ({
  getProfile: vi.fn(async () => null),
  putProfile: vi.fn(async (p) => ({ ...EMPTY_PROFILE, ...p, resumeName: null })),
}));

import { getProfile, putProfile } from '../api.js';

const SAVED = {
  ...EMPTY_PROFILE, skills: ['react'], resumeName: 'cv.pdf',
  experience: [{ id: 'e1', title: 'Engineer', organisation: 'Acme', location: '', startDate: '', endDate: '', bullets: [], tech: [], link: '', pinned: false, weight: 0 }],
};

beforeEach(() => vi.clearAllMocks());

describe('useProfileState', () => {
  it('starts undefined while loading, then a full-shaped profile either way', async () => {
    getProfile.mockResolvedValue(null);
    const { result } = renderHook(() => useProfileState());
    expect(result.current.profile).toBeUndefined();
    await waitFor(() => expect(result.current.profile).toEqual(EMPTY_PROFILE));
    expect(result.current.exists).toBe(false);
  });

  it('derives skills from skill groups and strips resumeName on save', async () => {
    getProfile.mockResolvedValue({ ...EMPTY_PROFILE, skills: ['node'], skillGroups: [{ id: 'g1', name: 'Languages', items: ['python'] }], resumeName: 'cv.pdf' });
    const { result } = renderHook(() => useProfileState());
    await waitFor(() => expect(result.current.profile).toBeDefined());
    await act(() => result.current.save());
    const [sent] = putProfile.mock.calls[0];
    expect(sent.resumeName).toBeUndefined();
    expect(sent.skills).toEqual(expect.arrayContaining(['node', 'python']));
  });

  // The heart of "extraction never silently overwrites a hand-typed entry":
  // adopt() only folds in the fields upload/extract actually change on the
  // server, so a section edited locally but not yet saved survives it.
  it('adopt keeps an unsaved local section instead of reverting it to the last-saved copy', async () => {
    getProfile.mockResolvedValue(EMPTY_PROFILE);
    const { result } = renderHook(() => useProfileState());
    await waitFor(() => expect(result.current.profile).toBeDefined());
    act(() => result.current.setProfile((p) => ({ ...p, experience: SAVED.experience })));
    act(() => result.current.adopt({ ...EMPTY_PROFILE, skills: ['node'], resumeName: 'cv.pdf' }));
    expect(result.current.profile.experience).toEqual(SAVED.experience);
    expect(result.current.profile.skills).toEqual(['node']);
  });

  it('adopt stages non-empty proposals and leaves them for addProposals to merge', async () => {
    getProfile.mockResolvedValue(EMPTY_PROFILE);
    const { result } = renderHook(() => useProfileState());
    await waitFor(() => expect(result.current.profile).toBeDefined());
    act(() => result.current.adopt({
      ...EMPTY_PROFILE,
      proposed: { experience: [{ title: 'Proposed role' }], projects: [], education: [] },
    }));
    expect(result.current.proposed.experience).toEqual([{ title: 'Proposed role' }]);
    expect(result.current.profile.experience).toEqual([]);

    act(() => result.current.addProposals({ experience: [{ title: 'Proposed role' }], projects: [], education: [] }));
    expect(result.current.profile.experience).toMatchObject([{ title: 'Proposed role' }]);
    expect(result.current.proposed).toBeNull();
  });

  it('adopt leaves proposed null when extraction found nothing structured', async () => {
    getProfile.mockResolvedValue(EMPTY_PROFILE);
    const { result } = renderHook(() => useProfileState());
    await waitFor(() => expect(result.current.profile).toBeDefined());
    act(() => result.current.adopt({ ...EMPTY_PROFILE, proposed: { experience: [], projects: [], education: [] } }));
    expect(result.current.proposed).toBeNull();
  });

  it('reset returns to the blank profile and exists=false', async () => {
    getProfile.mockResolvedValue(SAVED);
    const { result } = renderHook(() => useProfileState());
    await waitFor(() => expect(result.current.exists).toBe(true));
    act(() => result.current.reset());
    expect(result.current.profile).toEqual(EMPTY_PROFILE);
    expect(result.current.exists).toBe(false);
  });

  it('replace shows a record the server already saved, as saved', async () => {
    getProfile.mockResolvedValue(null);
    const { result } = renderHook(() => useProfileState());
    await waitFor(() => expect(result.current.profile).toBeDefined());
    act(() => result.current.replace({ ...EMPTY_PROFILE, skills: ['go'] }));
    expect(result.current.profile.skills).toEqual(['go']);
    expect(result.current.exists).toBe(true);
    expect(result.current.dirty).toBe(false);
  });

  it('rebase keeps unsaved edits on screen, measured against the new saved copy', async () => {
    getProfile.mockResolvedValue(SAVED);
    const { result } = renderHook(() => useProfileState());
    await waitFor(() => expect(result.current.exists).toBe(true));
    act(() => result.current.setProfile((p) => ({ ...p, years: 5 })));
    act(() => result.current.rebase({ ...SAVED, skills: ['go'] }));
    expect(result.current.profile.years).toBe(5);
    expect(result.current.dirty).toBe(true);
    act(() => result.current.discard());
    expect(result.current.profile.skills).toEqual(['go']);
    expect(result.current.dirty).toBe(false);
  });
});
