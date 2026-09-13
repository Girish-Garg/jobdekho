import { describe, it, expect, beforeEach, vi } from 'vitest';
import { streamedPost } from './aiCall.js';

// The client checks the content type before reading lines, so these mocks
// are real Responses: they carry headers and give the stream a body.
function mockResponse(body, headers, status = 200) {
  const fn = vi.fn().mockResolvedValue(new Response(body, { status, headers }));
  global.fetch = fn;
  return fn;
}
const ndjson = (...objs) => mockResponse(objs.map((o) => JSON.stringify(o)).join('\n') + '\n', { 'content-type': 'application/x-ndjson' });

const RECORD = { kind: 'fake-check', postingId: 'p1', provider: 'claude', createdAt: 'x', result: { verdict: 'genuine' } };
const START = { event: 'start', provider: 'claude', path: 'C:\\npm\\claude.cmd' };
const WAIT = { event: 'progress', stage: 'wait', elapsedMs: 5000 };

beforeEach(() => vi.restoreAllMocks());

describe('streamedPost', () => {
  it('asks for the stream with a bodyless POST that carries the cookie', async () => {
    const fetchMock = ndjson(RECORD);
    await streamedPost('/api/postings/p1/ai/fake-check');
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/postings/p1/ai/fake-check');
    expect(opts.method).toBe('POST');
    expect(opts.credentials).toBe('include');
    // Only accept: a content-type on a bodyless POST is a 400 at the server.
    expect(opts.headers).toEqual({ accept: 'application/x-ndjson' });
  });

  it('reports each event as it lands and resolves with the last line', async () => {
    ndjson(START, WAIT, RECORD);
    const onEvent = vi.fn();
    expect(await streamedPost('/x', { onEvent })).toEqual(RECORD);
    expect(onEvent.mock.calls.map(([e]) => e)).toEqual([START, WAIT]);
  });

  it('rejects an { error, kind } last line with the sentence and the kind', async () => {
    const error = 'Claude Code is not signed in (Not logged in). Open a terminal, run "claude", finish signing in, then try again.';
    ndjson(START, { error, kind: 'login' });
    await expect(streamedPost('/x')).rejects.toMatchObject({ message: error, kind: 'login' });
  });

  it('rejects a plain-JSON 4xx the same way, before reading any lines', async () => {
    mockResponse(JSON.stringify({ error: 'no such posting' }), { 'content-type': 'application/json' }, 404);
    const onEvent = vi.fn();
    await expect(streamedPost('/x', { onEvent })).rejects.toMatchObject({ message: 'no such posting', status: 404 });
    expect(onEvent).not.toHaveBeenCalled();
  });

  it('takes a plain JSON 200 as the same object the stream ends with', async () => {
    mockResponse(JSON.stringify(RECORD), { 'content-type': 'application/json' });
    expect(await streamedPost('/x')).toEqual(RECORD);
  });

  it('rejects a stream that ends before the result line', async () => {
    ndjson(START, WAIT);
    await expect(streamedPost('/x')).rejects.toThrow(/connection dropped/);
  });
});
