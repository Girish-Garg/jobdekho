import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  startNewConversation, listConversations, getConversation, continueConversation, deleteConversation, getMadeByAi,
} from './api.js';

function mockFetch({ body, status = 200 } = {}) {
  const fn = vi.fn().mockResolvedValue({ ok: status >= 200 && status < 300, status, json: async () => body });
  global.fetch = fn;
  return fn;
}

const call = (fetchMock) => {
  const [url, opts] = fetchMock.mock.calls[0];
  return { url, method: opts?.method ?? 'GET' };
};

beforeEach(() => vi.restoreAllMocks());

describe('chat history api calls', () => {
  it('files the conversation away with a POST, and answers the fresh one', async () => {
    const fetchMock = mockFetch({ body: { id: 'c2', turns: [], filed: null } });
    expect(await startNewConversation()).toEqual({ id: 'c2', turns: [], filed: null });
    expect(call(fetchMock)).toEqual({ url: '/api/chat/conversations', method: 'POST' });
  });

  it('lists, opens, continues and deletes a filed conversation by its encoded id', async () => {
    let fetchMock = mockFetch({ body: { conversations: [{ id: 'c1' }] } });
    expect(await listConversations()).toEqual([{ id: 'c1' }]);
    fetchMock = mockFetch({ body: { id: 'c 1', turns: [] } });
    await getConversation('c 1');
    expect(call(fetchMock).url).toBe('/api/chat/conversations/c%201');
    fetchMock = mockFetch({ body: { id: 'c1', turns: [] } });
    await continueConversation('c1');
    expect(call(fetchMock)).toEqual({ url: '/api/chat/conversations/c1/continue', method: 'POST' });
    fetchMock = mockFetch({ status: 204 });
    expect(await deleteConversation('c1')).toBeNull();
    expect(call(fetchMock)).toEqual({ url: '/api/chat/conversations/c1', method: 'DELETE' });
  });

  it('unwraps what the AI made', async () => {
    const fetchMock = mockFetch({ body: { items: [{ kind: 'profile' }] } });
    expect(await getMadeByAi()).toEqual([{ kind: 'profile' }]);
    expect(call(fetchMock).url).toBe('/api/chat/made-by-ai');
  });
});
