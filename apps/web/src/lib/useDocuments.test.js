import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDocuments } from './useDocuments.js';
import { announceApplied } from './proposalAppliedSignal.js';
import { requestOpenDocument } from './openDocumentSignal.js';

vi.mock('../api.js', () => ({ listDocuments: vi.fn(), createDocument: vi.fn(), deleteDocument: vi.fn() }));

import { listDocuments, createDocument, deleteDocument } from '../api.js';

const D1 = { id: 'd1', name: 'Classic resume', kind: 'resume', updatedAt: '2026-09-30T10:00:00.000Z' };
const D2 = { id: 'd2', name: 'Cover letter', kind: 'cover-letter', updatedAt: '2026-09-29T10:00:00.000Z' };

beforeEach(() => {
  vi.clearAllMocks();
  listDocuments.mockResolvedValue([D1, D2]);
});

describe('useDocuments', () => {
  it('opens the newest document once the list is read', async () => {
    const { result } = renderHook(() => useDocuments());
    expect(result.current.documents).toBeUndefined();
    await waitFor(() => expect(result.current.selected).toEqual(D1));
  });

  it('opens a document the chat asked for before the workspace existed', async () => {
    requestOpenDocument('d2');
    const { result } = renderHook(() => useDocuments());
    await waitFor(() => expect(result.current.selected?.id).toBe('d2'));
  });

  it('opens a document the chat asks for while the workspace is up', async () => {
    const { result } = renderHook(() => useDocuments());
    await waitFor(() => expect(result.current.selected?.id).toBe('d1'));
    act(() => requestOpenDocument('d2'));
    await waitFor(() => expect(result.current.selected?.id).toBe('d2'));
  });

  it('reads the list again and opens the document a chat proposal was applied to, new or not', async () => {
    const { result } = renderHook(() => useDocuments());
    await waitFor(() => expect(result.current.selected?.id).toBe('d1'));
    const D3 = { id: 'd3', name: 'Letter for Acme', kind: 'cover-letter' };
    listDocuments.mockResolvedValue([D3, D1, D2]);
    act(() => announceApplied({ kind: 'document', document: D3 }));
    await waitFor(() => expect(result.current.selected?.id).toBe('d3'));
    expect(result.current.documents).toHaveLength(3);
  });

  it('creates from a template and opens the new document', async () => {
    const { result } = renderHook(() => useDocuments());
    await waitFor(() => expect(result.current.documents).toBeDefined());
    createDocument.mockResolvedValue({ id: 'd4' });
    listDocuments.mockResolvedValue([{ id: 'd4', name: 'Compact resume', kind: 'resume' }, D1, D2]);
    await act(() => result.current.create({ id: 'compact', kind: 'resume' }));
    expect(createDocument).toHaveBeenCalledWith({ kind: 'resume', templateId: 'compact' });
    expect(result.current.selected?.id).toBe('d4');
  });

  it('opens the newest remaining document after a delete', async () => {
    const { result } = renderHook(() => useDocuments());
    await waitFor(() => expect(result.current.selected?.id).toBe('d1'));
    deleteDocument.mockResolvedValue(null);
    listDocuments.mockResolvedValue([D2]);
    await act(() => result.current.remove('d1'));
    expect(deleteDocument).toHaveBeenCalledWith('d1');
    expect(result.current.selected?.id).toBe('d2');
  });

  it('reads a list that did not load as empty rather than loading forever', async () => {
    listDocuments.mockRejectedValue(new Error('down'));
    const { result } = renderHook(() => useDocuments());
    await waitFor(() => expect(result.current.documents).toEqual([]));
    expect(result.current.selected).toBeNull();
  });
});
