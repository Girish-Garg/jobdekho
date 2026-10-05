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

  // A save used to fold every group skill into Best fit: skills appeared
  // that nobody added there, and one taken out came back.
  it('saves Best fit skills as typed, with no group skills folded in, and strips resumeName', async () => {
    getProfile.mockResolvedValue({ ...EMPTY_PROFILE, skills: ['node'], skillGroups: [{ id: 'g1', name: 'Languages', items: ['python'] }], resumeName: 'cv.pdf' });
    const { result } = renderHook(() => useProfileState());
    await waitFor(() => expect(result.current.profile).toBeDefined());
    await act(() => result.current.save());
    const [sent] = putProfile.mock.calls[0];
    expect(sent.resumeName).toBeUndefined();
    expect(sent.skills).toEqual(['node']);
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

  it('adopt stages certifications, achievements and skill groups, and addProposals merges them', async () => {
    getProfile.mockResolvedValue(EMPTY_PROFILE);
    const { result } = renderHook(() => useProfileState());
    await waitFor(() => expect(result.current.profile).toBeDefined());
    const found = {
      experience: [], projects: [], education: [],
      certifications: [{ title: 'Cloud Practitioner', organisation: 'Demo Cloud' }],
      achievements: [{ title: 'First place' }],
      skillGroups: [{ name: 'Languages', items: ['Rust'] }],
    };
    act(() => result.current.adopt({ ...EMPTY_PROFILE, proposed: found }));
    expect(result.current.proposed).toEqual(found);

    act(() => result.current.addProposals({ ...found, achievements: [] }));
    expect(result.current.profile.certifications).toMatchObject([{ title: 'Cloud Practitioner', organisation: 'Demo Cloud' }]);
    expect(result.current.profile.achievements).toEqual([]);
    expect(result.current.profile.skillGroups).toEqual([{ id: expect.any(String), name: 'Languages', items: ['Rust'] }]);
    expect(result.current.proposed).toBeNull();
  });

  // The server filled email and name because its saved copy had neither; the
  // name typed here but not saved yet stays, and so stays unsaved.
  it('adopt folds in the basics the server filled without overwriting one typed here', async () => {
    getProfile.mockResolvedValue(EMPTY_PROFILE);
    const { result } = renderHook(() => useProfileState());
    await waitFor(() => expect(result.current.profile).toBeDefined());
    act(() => result.current.setProfile((p) => ({ ...p, basics: { ...p.basics, name: 'Typed here' } })));
    act(() => result.current.adopt({
      ...EMPTY_PROFILE,
      basics: { ...EMPTY_PROFILE.basics, name: 'Demo Candidate', email: 'demo@example.com' },
      filledBasics: ['name', 'email'],
    }));
    expect(result.current.profile.basics).toMatchObject({ name: 'Typed here', email: 'demo@example.com' });
    expect(result.current.dirty).toBe(true);
    act(() => result.current.discard());
    expect(result.current.profile.basics).toMatchObject({ name: 'Demo Candidate', email: 'demo@example.com' });
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
    expect(result.current.dirty).toBe(false);
  });

  it('reset also drops what the deleted resume proposed', async () => {
    getProfile.mockResolvedValue(SAVED);
    const { result } = renderHook(() => useProfileState());
    await waitFor(() => expect(result.current.exists).toBe(true));
    act(() => result.current.adopt({
      ...SAVED,
      proposed: { experience: [{ title: 'Proposed role' }], projects: [], education: [] },
    }));
    expect(result.current.proposed).not.toBeNull();
    act(() => result.current.reset());
    expect(result.current.proposed).toBeNull();
  });

  // The save bar shows on `dirty` alone, so for a profile never saved it has
  // to be a comparison with the blank one: clean at first, unsaved on the
  // first thing entered, clean again when it is typed back out.
  it('a profile never saved is dirty only while it differs from the blank one', async () => {
    getProfile.mockResolvedValue(null);
    const { result } = renderHook(() => useProfileState());
    await waitFor(() => expect(result.current.profile).toBeDefined());
    expect(result.current.dirty).toBe(false);
    const named = (name) => (p) => ({ ...p, basics: { ...p.basics, name } });
    act(() => result.current.setProfile(named('Asha Rao')));
    expect(result.current.dirty).toBe(true);
    act(() => result.current.setProfile(named('')));
    expect(result.current.dirty).toBe(false);
  });

  // A blank record standing in for one that could not be read would be
  // saved over the real one, so a failed read leaves nothing to edit.
  it('a profile that could not be read is a failure to retry, never a blank record', async () => {
    getProfile.mockRejectedValueOnce(new Error('offline'));
    const { result } = renderHook(() => useProfileState());
    await waitFor(() => expect(result.current.failed).toBe(true));
    expect(result.current.profile).toBeUndefined();
    expect(result.current.dirty).toBe(false);
    getProfile.mockResolvedValueOnce(SAVED);
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.profile).toBeDefined());
    expect(result.current.failed).toBe(false);
    expect(result.current.exists).toBe(true);
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
