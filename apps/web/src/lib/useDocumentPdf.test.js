import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useDocumentPdf } from './useDocumentPdf.js';

vi.mock('../api.js', () => ({ compileDocument: vi.fn() }));

import { compileDocument } from '../api.js';

let made = 0;
beforeEach(() => {
  vi.clearAllMocks();
  made = 0;
  URL.createObjectURL = vi.fn(() => `blob:pdf-${(made += 1)}`);
  URL.revokeObjectURL = vi.fn();
});

const setup = (doc) => renderHook(({ d }) => useDocumentPdf(d), { initialProps: { d: doc } });

describe('useDocumentPdf', () => {
  it('compiles the document and shows it', async () => {
    const blob = new Blob(['%PDF']);
    compileDocument.mockResolvedValue(blob);
    const { result } = setup({ id: 'd1', tex: 'v1' });
    await waitFor(() => expect(result.current.url).toBe('blob:pdf-1'));
    expect(result.current.blob).toBe(blob);
    expect(result.current.busy).toBe(false);
    expect(compileDocument).toHaveBeenCalledWith('d1');
  });

  it('compiles again when the source changes, and releases the old PDF', async () => {
    compileDocument.mockResolvedValue(new Blob(['%PDF']));
    const { result, rerender } = setup({ id: 'd1', tex: 'v1' });
    await waitFor(() => expect(result.current.url).toBe('blob:pdf-1'));
    rerender({ d: { id: 'd1', tex: 'v2' } });
    await waitFor(() => expect(result.current.url).toBe('blob:pdf-2'));
    expect(compileDocument).toHaveBeenCalledTimes(2);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:pdf-1');
  });

  it('holds the refusal with its kind and problems, and clears the PDF', async () => {
    compileDocument.mockResolvedValueOnce(new Blob(['%PDF']));
    const { result, rerender } = setup({ id: 'd1', tex: 'v1' });
    await waitFor(() => expect(result.current.url).toBe('blob:pdf-1'));
    const refusal = Object.assign(new Error('Not allowed.'), { kind: 'unsafe', problems: ['\\input is not allowed'] });
    compileDocument.mockRejectedValueOnce(refusal);
    rerender({ d: { id: 'd1', tex: '\\input{x}' } });
    await waitFor(() => expect(result.current.failure).toBe(refusal));
    expect(result.current.url).toBeNull();
  });

  it('asks for nothing until there is a document', () => {
    const { result } = setup(undefined);
    expect(compileDocument).not.toHaveBeenCalled();
    expect(result.current.url).toBeNull();
  });

  it('asks again for the same source on retry, for a failure the source did not cause', async () => {
    compileDocument.mockRejectedValueOnce(Object.assign(new Error('No LaTeX installation was found.'), { kind: 'not_found' }));
    const { result } = setup({ id: 'd1', tex: 'v1' });
    await waitFor(() => expect(result.current.failure?.kind).toBe('not_found'));
    compileDocument.mockResolvedValueOnce(new Blob(['%PDF']));
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.url).toBe('blob:pdf-1'));
    expect(result.current.failure).toBeNull();
  });
});
