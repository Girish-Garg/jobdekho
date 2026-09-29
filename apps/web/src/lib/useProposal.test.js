import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProposal } from './useProposal.js';
import { onApplied } from './proposalAppliedSignal.js';

vi.mock('../api.js', () => ({ applyProposal: vi.fn(), discardProposal: vi.fn() }));

import { applyProposal, discardProposal } from '../api.js';

const PENDING = { id: 'p1', kind: 'profile', status: 'pending', appliedAt: null };
const refused = (message, extra = {}) => Object.assign(new Error(message), extra);

beforeEach(() => vi.clearAllMocks());

describe('useProposal', () => {
  it('starts from the status the turn was saved with', () => {
    const { result } = renderHook(() => useProposal({ ...PENDING, status: 'applied', appliedAt: '2026-09-30T10:00:00.000Z' }));
    expect(result.current.status).toBe('applied');
    expect(result.current.appliedAt).toBe('2026-09-30T10:00:00.000Z');
  });

  it('marks the card applied with the server\'s time and broadcasts the saved record', async () => {
    const heard = vi.fn();
    const stop = onApplied(heard);
    applyProposal.mockResolvedValue({ proposal: { id: 'p1', status: 'applied', appliedAt: '2026-09-30T11:00:00.000Z' }, profile: { skills: ['go'] } });
    const { result } = renderHook(() => useProposal(PENDING));
    await act(() => result.current.apply());
    stop();
    expect(applyProposal).toHaveBeenCalledWith('p1');
    expect(result.current.status).toBe('applied');
    expect(result.current.appliedAt).toBe('2026-09-30T11:00:00.000Z');
    expect(heard).toHaveBeenCalledWith({ kind: 'profile', profile: { skills: ['go'] } });
  });

  it('broadcasts a document an apply saved', async () => {
    const heard = vi.fn();
    const stop = onApplied(heard);
    applyProposal.mockResolvedValue({ proposal: { id: 'p1', status: 'applied' }, document: { id: 'd1', tex: 'x' } });
    const { result } = renderHook(() => useProposal({ ...PENDING, kind: 'document' }));
    await act(() => result.current.apply());
    stop();
    expect(heard).toHaveBeenCalledWith({ kind: 'document', document: { id: 'd1', tex: 'x' } });
  });

  it('keeps the card pending and holds the server\'s sentence and problems when it refuses', async () => {
    applyProposal.mockRejectedValue(refused('This version uses LaTeX that JobDekho does not allow.', { status: 422, problems: ['\\input is not allowed'] }));
    const { result } = renderHook(() => useProposal(PENDING));
    await act(() => result.current.apply());
    expect(result.current.status).toBe('pending');
    expect(result.current.error).toEqual({ message: 'This version uses LaTeX that JobDekho does not allow.', problems: ['\\input is not allowed'] });
    expect(result.current.busy).toBeNull();
  });

  it('discards, and says why when the server will not', async () => {
    discardProposal.mockResolvedValueOnce(null);
    const { result } = renderHook(() => useProposal(PENDING));
    await act(() => result.current.discard());
    expect(result.current.status).toBe('discarded');
    discardProposal.mockRejectedValueOnce(refused('This change was already applied, so it cannot be discarded.'));
    const second = renderHook(() => useProposal(PENDING)).result;
    await act(() => second.current.discard());
    expect(second.current.status).toBe('pending');
    expect(second.current.error.message).toBe('This change was already applied, so it cannot be discarded.');
  });

  it('ignores a second press while the first is in flight', async () => {
    let finish;
    applyProposal.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const { result } = renderHook(() => useProposal(PENDING));
    let first;
    act(() => { first = result.current.apply(); });
    expect(result.current.busy).toBe('apply');
    await act(() => result.current.apply());
    finish({ proposal: { status: 'applied' } });
    await act(() => first);
    expect(applyProposal).toHaveBeenCalledTimes(1);
  });
});
