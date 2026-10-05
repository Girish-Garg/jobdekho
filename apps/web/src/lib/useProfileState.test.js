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

  // An upload changes only the file's name on the server, so a section,
  // Best fit or a basics field edited here but not saved yet survives it.
  it('adopt takes only the file name an upload returns, keeping every unsaved edit', async () => {
    getProfile.mockResolvedValue(EMPTY_PROFILE);
    const { result } = renderHook(() => useProfileState());
    await waitFor(() => expect(result.current.profile).toBeDefined());
    act(() => result.current.setProfile((p) => ({ ...p, experience: SAVED.experience, skills: ['go'] })));
    act(() => result.current.adopt({ ...EMPTY_PROFILE, skills: ['node'], resumeName: 'cv.pdf' }));
    expect(result.current.profile.experience).toEqual(SAVED.experience);
    expect(result.current.profile.skills).toEqual(['go']);
    expect(result.current.profile.resumeName).toBe('cv.pdf');
    expect(result.current.exists).toBe(true);
  });

  // The heart of "nothing is saved until the person keeps it": what the
  // resume says waits beside the record, and only the rows kept reach it,
  // as an unsaved edit like any other.
  describe('a review of what the resume says', () => {
    const FOUND = {
      ranking: { skills: ['react', 'node'] },
      basics: { name: 'Demo Candidate' },
      proposed: { experience: [{ title: 'Engineer', organisation: 'Acme', bullets: ['Built the billing service'] }, { title: 'Proposed role', organisation: 'Globex' }] },
    };

    async function loaded() {
      getProfile.mockResolvedValue(SAVED);
      const hook = renderHook(() => useProfileState());
      await waitFor(() => expect(hook.result.current.exists).toBe(true));
      return hook.result;
    }

    it('is built against the record as it is now and changes nothing until kept', async () => {
      const result = await loaded();
      act(() => result.current.setProfile((p) => ({ ...p, basics: { ...p.basics, name: 'Typed here' } })));
      let built;
      act(() => { built = result.current.reviewResume(FOUND, 'smart'); });
      expect(built.rows.map((row) => row.id)).toEqual(['experience:newer:e1', 'experience:new:1', 'fit:skills:new:node']);
      expect(result.current.review).toMatchObject({ mode: 'smart', rows: built.rows });
      expect(result.current.profile.experience).toEqual(SAVED.experience);
    });

    it('applies only the rows kept, as unsaved changes, and goes', async () => {
      const result = await loaded();
      act(() => { result.current.reviewResume(FOUND, 'smart'); });
      const kept = result.current.review.rows.filter((row) => row.kind === 'new');
      act(() => result.current.applyChanges(kept));
      expect(result.current.review).toBeNull();
      expect(result.current.profile.experience.map((e) => [e.title, e.endDate])).toEqual([['Engineer', ''], ['Proposed role', '']]);
      expect(result.current.profile.skills).toEqual(['react', 'node']);
      expect(result.current.dirty).toBe(true);
      expect(putProfile).not.toHaveBeenCalled();
    });

    it('is discarded without touching the record', async () => {
      const result = await loaded();
      act(() => { result.current.reviewResume(FOUND, 'overwrite'); });
      act(() => result.current.discardReview());
      expect(result.current.review).toBeNull();
      expect(result.current.dirty).toBe(false);
    });

    it('is not opened when the resume would change nothing', async () => {
      const result = await loaded();
      act(() => { result.current.reviewResume({ ranking: { skills: ['react'] }, proposed: {} }, 'smart'); });
      expect(result.current.review).toBeNull();
    });

    it('goes when a new resume is uploaded', async () => {
      const result = await loaded();
      act(() => { result.current.reviewResume(FOUND, 'smart'); });
      act(() => result.current.adopt({ ...SAVED, resumeName: 'new.pdf' }));
      expect(result.current.review).toBeNull();
    });
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

  it('reset also drops the review of the deleted resume', async () => {
    getProfile.mockResolvedValue(SAVED);
    const { result } = renderHook(() => useProfileState());
    await waitFor(() => expect(result.current.exists).toBe(true));
    act(() => { result.current.reviewResume({ proposed: { experience: [{ title: 'Proposed role' }] } }, 'smart'); });
    expect(result.current.review).not.toBeNull();
    act(() => result.current.reset());
    expect(result.current.review).toBeNull();
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
