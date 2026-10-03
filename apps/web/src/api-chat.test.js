import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  listChats, getChatPage, getChatsPending, createChat, changeChatItems, markChatSeen, clearChat, deleteChat,
  stopChat, queueChatMessage, getMadeByAi,
} from './api.js';

function mockFetch({ body, status = 200 } = {}) {
  const fn = vi.fn().mockResolvedValue({ ok: status >= 200 && status < 300, status, json: async () => body });
  global.fetch = fn;
  return fn;
}

const call = (fetchMock) => {
  const [url, opts] = fetchMock.mock.calls[0];
  return { url, method: opts?.method ?? 'GET', body: opts?.body ? JSON.parse(opts.body) : undefined };
};

beforeEach(() => vi.restoreAllMocks());

describe('chat api calls', () => {
  it('reads the list, a chat by its id or its placeholder, and what is running', async () => {
    let fetchMock = mockFetch({ body: { chats: [{ id: 'c1' }] } });
    expect(await listChats()).toEqual([{ id: 'c1' }]);
    expect(call(fetchMock).url).toBe('/api/chats');
    fetchMock = mockFetch({ body: { chat: { id: 'job:p1' }, turns: [], dropped: false, results: [] } });
    await getChatPage('job:p1');
    expect(call(fetchMock).url).toBe('/api/chats/job%3Ap1/messages');
    fetchMock = mockFetch({ body: { busy: null, waiting: {}, failed: {} } });
    expect(await getChatsPending()).toEqual({ busy: null, waiting: {}, failed: {} });
    expect(call(fetchMock).url).toBe('/api/chats/pending');
  });

  it('makes a chat and changes what it holds, unwrapping the view', async () => {
    let fetchMock = mockFetch({ body: { chat: { id: 'c2' } }, status: 201 });
    expect(await createChat({ kind: 'compare', jobs: ['p1', 'p2'] })).toEqual({ id: 'c2' });
    expect(call(fetchMock)).toEqual({ url: '/api/chats', method: 'POST', body: { kind: 'compare', jobs: ['p1', 'p2'] } });
    fetchMock = mockFetch({ body: { chat: { id: 'c3' } } });
    expect(await changeChatItems('c1', { action: 'add', type: 'job', id: 'p2' })).toEqual({ id: 'c3' });
    expect(call(fetchMock)).toEqual({ url: '/api/chats/c1/items', method: 'POST', body: { action: 'add', type: 'job', id: 'p2' } });
  });

  it('marks a chat seen, clears it, deletes it and stops its call, each by its encoded id', async () => {
    let fetchMock = mockFetch({ body: { chat: { id: 'c 1' } } });
    await markChatSeen('c 1');
    expect(call(fetchMock)).toEqual({ url: '/api/chats/c%201/seen', method: 'POST', body: {} });
    fetchMock = mockFetch({ body: { chat: { id: 'c1' } } });
    await clearChat('c1');
    expect(call(fetchMock).url).toBe('/api/chats/c1/clear');
    fetchMock = mockFetch({ status: 204 });
    expect(await deleteChat('c1')).toBeNull();
    expect(call(fetchMock)).toEqual({ url: '/api/chats/c1', method: 'DELETE', body: undefined });
    fetchMock = mockFetch({ body: { stopped: true } });
    expect(await stopChat('c1')).toEqual({ stopped: true });
    expect(call(fetchMock).url).toBe('/api/chats/c1/stop');
  });

  it('keeps a follow-up with the page it was asked from', async () => {
    const fetchMock = mockFetch({ body: { waiting: { message: 'and pay?', at: 'x' } } });
    await queueChatMessage('c1', { message: 'and pay?', page: 'postings' });
    expect(call(fetchMock)).toEqual({ url: '/api/chats/c1/queue', method: 'POST', body: { message: 'and pay?', page: 'postings' } });
  });

  it('carries which chat is busy on a refusal', async () => {
    mockFetch({ body: { error: 'JobDekho is still working in "Razorpay" (Is it real?).', busy: { chatId: 'c9', label: 'Is it real?' } }, status: 409 });
    await expect(queueChatMessage('c1', { message: 'hi' })).rejects.toMatchObject({ status: 409, busy: { chatId: 'c9' } });
  });

  it('unwraps what the AI made', async () => {
    const fetchMock = mockFetch({ body: { items: [{ kind: 'profile' }] } });
    expect(await getMadeByAi()).toEqual([{ kind: 'profile' }]);
    expect(call(fetchMock).url).toBe('/api/chat/made-by-ai');
  });
});
