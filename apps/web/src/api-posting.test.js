import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPosting } from './api.js';

beforeEach(() => vi.restoreAllMocks());

describe('getPosting', () => {
  it('asks for one posting by id and unwraps it', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ posting: { id: 'a/b', descriptionText: 'Full' } }) });
    global.fetch = fetchMock;
    expect(await getPosting('a/b')).toEqual({ id: 'a/b', descriptionText: 'Full' });
    expect(fetchMock.mock.calls[0][0]).toBe('/api/postings/a%2Fb');
  });
});
