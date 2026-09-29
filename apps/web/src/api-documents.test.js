import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getDocumentTemplates, listDocuments, getDocument, createDocument, saveDocument, revertDocument, deleteDocument,
  compileDocument, applyProposal, discardProposal,
} from './api.js';

function mockFetch({ body, blob, status = 200 } = {}) {
  const fn = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    blob: async () => blob,
  });
  global.fetch = fn;
  return fn;
}

const call = (fetchMock) => {
  const [url, opts] = fetchMock.mock.calls[0];
  return { url, method: opts?.method ?? 'GET', body: opts?.body ? JSON.parse(opts.body) : undefined };
};

beforeEach(() => vi.restoreAllMocks());

describe('document api calls', () => {
  it('unwraps the templates and the document list', async () => {
    mockFetch({ body: { templates: [{ id: 'classic', kind: 'resume' }] } });
    expect(await getDocumentTemplates()).toEqual([{ id: 'classic', kind: 'resume' }]);
    mockFetch({ body: { documents: [{ id: 'd1' }] } });
    expect(await listDocuments()).toEqual([{ id: 'd1' }]);
  });

  it('asks for version bodies only when told to', async () => {
    let fetchMock = mockFetch({ body: { id: 'd1' } });
    await getDocument('d1');
    expect(call(fetchMock).url).toBe('/api/documents/d1');
    fetchMock = mockFetch({ body: { id: 'd1' } });
    await getDocument('d1', { bodies: true });
    expect(call(fetchMock).url).toBe('/api/documents/d1?bodies=1');
  });

  it('creates, saves, restores and deletes with the right verbs and bodies', async () => {
    let fetchMock = mockFetch({ body: { id: 'd2' }, status: 201 });
    await createDocument({ kind: 'resume', templateId: 'classic' });
    expect(call(fetchMock)).toEqual({ url: '/api/documents', method: 'POST', body: { kind: 'resume', templateId: 'classic' } });
    fetchMock = mockFetch({ body: { id: 'd2' } });
    await saveDocument('d2', { name: 'Mine' });
    expect(call(fetchMock)).toEqual({ url: '/api/documents/d2', method: 'PUT', body: { name: 'Mine' } });
    fetchMock = mockFetch({ body: { id: 'd2' } });
    await revertDocument('d2', '2026-09-30T10:00:00.000Z');
    expect(call(fetchMock)).toEqual({ url: '/api/documents/d2/revert', method: 'POST', body: { at: '2026-09-30T10:00:00.000Z' } });
    fetchMock = mockFetch({ status: 204 });
    expect(await deleteDocument('d2')).toBeNull();
    expect(call(fetchMock).method).toBe('DELETE');
  });

  it('returns the compiled PDF as a blob', async () => {
    const pdf = new Blob(['%PDF-fake']);
    const fetchMock = mockFetch({ blob: pdf });
    expect(await compileDocument('d1')).toBe(pdf);
    expect(call(fetchMock)).toMatchObject({ url: '/api/documents/d1/pdf', method: 'POST' });
  });

  // The guard's verdict is a sentence plus the lines it refused; the
  // workspace lists the lines under the sentence.
  it('carries the sentence, the kind and the guard problems of a refused compile', async () => {
    mockFetch({ body: { error: 'This document uses LaTeX that JobDekho does not allow.', kind: 'unsafe', problems: ['\\input is not allowed'] }, status: 422 });
    await expect(compileDocument('d1')).rejects.toMatchObject({
      message: 'This document uses LaTeX that JobDekho does not allow.', kind: 'unsafe', problems: ['\\input is not allowed'], status: 422,
    });
  });
});

describe('proposal api calls', () => {
  it('applies and discards by id with an empty JSON body', async () => {
    let fetchMock = mockFetch({ body: { proposal: { id: 'p/1', status: 'applied' } } });
    expect(await applyProposal('p/1')).toEqual({ proposal: { id: 'p/1', status: 'applied' } });
    expect(call(fetchMock)).toEqual({ url: '/api/chat/proposals/p%2F1/apply', method: 'POST', body: {} });
    expect(fetchMock.mock.calls[0][1].headers).toEqual({ 'content-type': 'application/json' });
    fetchMock = mockFetch({ status: 204 });
    expect(await discardProposal('p1')).toBeNull();
    expect(call(fetchMock)).toEqual({ url: '/api/chat/proposals/p1/discard', method: 'POST', body: {} });
  });

  it('says why an apply was refused, in the server\'s own words', async () => {
    mockFetch({ body: { error: 'This change was already applied.' }, status: 409 });
    await expect(applyProposal('p1')).rejects.toMatchObject({ message: 'This change was already applied.', status: 409 });
  });
});
