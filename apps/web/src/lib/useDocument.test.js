import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDocument } from './useDocument.js';
import { announceApplied } from './proposalAppliedSignal.js';

vi.mock('../api.js', () => ({ getDocument: vi.fn(), saveDocument: vi.fn(), revertDocument: vi.fn() }));

import { getDocument, saveDocument, revertDocument } from '../api.js';

const DOC = { id: 'd1', name: 'Classic resume', kind: 'resume', tex: 'v1', versions: [{ at: 't1', by: 'template' }] };

beforeEach(() => {
  vi.clearAllMocks();
  getDocument.mockResolvedValue(DOC);
});

describe('useDocument', () => {
  it('loads the document, and reads one that is gone as null', async () => {
    const { result } = renderHook(() => useDocument('d1'));
    expect(result.current.doc).toBeUndefined();
    await waitFor(() => expect(result.current.doc).toEqual(DOC));
    getDocument.mockRejectedValue(new Error('That document is not there any more.'));
    const gone = renderHook(() => useDocument('d9')).result;
    await waitFor(() => expect(gone.current.doc).toBeNull());
  });

  it('takes the saved document a chat proposal was applied to, and ignores another one', async () => {
    const { result } = renderHook(() => useDocument('d1'));
    await waitFor(() => expect(result.current.doc).toEqual(DOC));
    act(() => announceApplied({ kind: 'document', document: { ...DOC, id: 'd2', tex: 'other' } }));
    expect(result.current.doc.tex).toBe('v1');
    act(() => announceApplied({ kind: 'document', document: { ...DOC, tex: 'v2 by ai' } }));
    expect(result.current.doc.tex).toBe('v2 by ai');
  });

  it('saves and restores, holding what the server answered', async () => {
    const { result } = renderHook(() => useDocument('d1'));
    await waitFor(() => expect(result.current.doc).toEqual(DOC));
    saveDocument.mockResolvedValue({ ...DOC, tex: 'mine' });
    await act(() => result.current.save({ tex: 'mine' }));
    expect(saveDocument).toHaveBeenCalledWith('d1', { tex: 'mine' });
    expect(result.current.doc.tex).toBe('mine');
    revertDocument.mockResolvedValue({ ...DOC, tex: 'v1 again' });
    await act(() => result.current.restore('t1'));
    expect(revertDocument).toHaveBeenCalledWith('d1', 't1');
    expect(result.current.doc.tex).toBe('v1 again');
  });

  it('takes a document another call already saved, as it is', async () => {
    const { result } = renderHook(() => useDocument('d1'));
    await waitFor(() => expect(result.current.doc).toEqual(DOC));
    act(() => result.current.replace({ ...DOC, tex: 'v2 from profile', profileHeader: null }));
    expect(result.current.doc).toEqual({ ...DOC, tex: 'v2 from profile', profileHeader: null });
    expect(saveDocument).not.toHaveBeenCalled();
  });
});
