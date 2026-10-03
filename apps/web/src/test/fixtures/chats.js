// Chats as the server shows them (see apps/server/src/chat/chat-view.js),
// and a small stand-in for the server's chat routes, for the tests that
// mount the chat panel with '../api.js' mocked. Each test file mocks the
// api with vi.fn()s and hands them to `fakeChats`, which answers them from
// one in-memory state the test can change as it goes.
export const AT = '2026-10-03T10:00:00.000Z';

const base = { createdAt: AT, updatedAt: AT, seenAt: AT, listed: true, unseen: false, busy: false, waiting: false, failed: false, placeholder: false };

export const POSTINGS = {
  pA: { id: 'pA', title: 'Job A Engineer', company: 'AlphaCo' },
  pB: { id: 'pB', title: 'Job B Analyst', company: 'BetaCo' },
  p9: { id: 'p9', title: 'Staff Engineer', company: 'Initech' },
};

export const DOCUMENTS = {
  d1: { id: 'd1', name: 'Classic resume', kind: 'resume' },
  d2: { id: 'd2', name: 'Letter for Initech', kind: 'cover-letter' },
};

export const jobChat = (postingId, over = {}) => {
  const job = POSTINGS[postingId] ?? { id: postingId, title: 'A job', company: 'Acme' };
  return { ...base, id: `c-${postingId}`, kind: 'job', title: `${job.title} · ${job.company}`, jobs: [{ ...job, listed: true }], documents: [], ...over };
};

export const generalChat = (id, title = 'New chat', over = {}) => ({ ...base, id, kind: 'general', title, jobs: [], documents: [], ...over });

export const compareChat = (id, postingIds, over = {}) => ({
  ...base, id, kind: 'compare', title: postingIds.map((p) => POSTINGS[p]?.company ?? p).join(' vs '),
  jobs: postingIds.map((p) => ({ ...POSTINGS[p], listed: true })), documents: [], ...over,
});

export const documentChat = (docId, name, over = {}) => ({
  ...base, id: `c-${docId}`, kind: 'document', title: name, jobs: [], documents: [{ id: docId, name, kind: 'resume', exists: true }], ...over,
});

export const turn = (question, answer, over = {}) => ({
  id: `t-${question}`, question, answer, actions: [], refs: [], proposals: [], memory: [], provider: 'claude',
  createdAt: '2026-10-03T10:05:00.000Z', items: { jobs: [], documents: [] }, ...over,
});

export const result = (kind, postingId, versions) => ({ kind, postingId, dropped: false, versions });
export const version = (value, createdAt, chatId, instruction = '') => ({ instruction, provider: 'claude', createdAt, result: value, chatId });

function placeholder(type, itemId) {
  const job = type === 'job' ? POSTINGS[itemId] ?? { id: itemId, title: 'A job', company: 'Acme' } : null;
  return {
    ...base, id: `${type}:${itemId}`, kind: type, title: '', createdAt: null, updatedAt: null, seenAt: null, placeholder: true,
    jobs: job ? [{ ...job, listed: true }] : [],
    documents: type === 'document' ? [{ name: 'A document', kind: 'resume', ...DOCUMENTS[itemId], id: itemId, exists: true }] : [],
  };
}

// The routes the panel reads, answered from `server`: { chats, turns,
// results, pending }. A placeholder id finds the job's or the document's
// chat once there is one, as the server's chat-lookup.js does.
// A test's api mock lists only what that test needs, and reading an export
// it left out throws, so each route is answered only when it is there.
function routesOf(mocked) {
  return new Proxy({}, {
    get(_, name) {
      try {
        return mocked[name] ?? { mockImplementation() {} };
      } catch {
        return { mockImplementation() {} };
      }
    },
  });
}

export function fakeChats(mocked, { chats = [], turns = {}, results = {}, pending = {} } = {}) {
  const api = routesOf(mocked);
  const server = { chats: [...chats], turns: { ...turns }, results: { ...results }, pending: { busy: null, waiting: {}, failed: {}, ...pending } };
  const find = (id) => {
    const [type, itemId] = id.includes(':') ? id.split(/:(.*)/s) : [null, null];
    if (!type) return server.chats.find((chat) => chat.id === id) ?? null;
    const key = type === 'job' ? 'jobs' : 'documents';
    return server.chats.find((chat) => chat.kind === type && chat[key][0]?.id === itemId) ?? placeholder(type, itemId);
  };
  const pageOf = (chat) => ({ chat, turns: server.turns[chat.id] ?? [], results: server.results[chat.id] ?? [], dropped: false });
  api.getChatPage.mockImplementation(async (id) => {
    const chat = find(id);
    if (!chat) throw Object.assign(new Error('That chat is not there any more.'), { status: 404 });
    return pageOf(chat);
  });
  api.listChats.mockImplementation(async () => server.chats.filter((chat) => server.turns[chat.id]?.length || server.results[chat.id]?.length));
  api.getChatsPending.mockImplementation(async () => server.pending);
  api.createChat.mockImplementation(async ({ kind, jobs = [] }) => {
    const chat = kind === 'compare' ? compareChat(`c-compare-${jobs.join('-')}`, jobs) : generalChat(`c-general-${server.chats.length + 1}`);
    const twin = server.chats.find((one) => one.id === chat.id);
    if (!twin) server.chats.push(chat);
    return twin ?? chat;
  });
  api.markChatSeen.mockImplementation(async (id) => ({ ...find(id), unseen: false }));
  api.clearChat.mockImplementation(async (id) => {
    server.turns[find(id).id] = [];
    return find(id);
  });
  api.deleteChat.mockImplementation(async (id) => {
    server.chats = server.chats.filter((chat) => chat.id !== id);
    return null;
  });
  api.stopChat.mockImplementation(async () => ({ stopped: true }));
  api.queueChatMessage.mockImplementation(async (id, { message }) => ({ waiting: message ? { message, at: AT } : null }));
  // A turn saved as the server saves it: a job's or a document's chat is
  // made by its first question. Resolves the body the browser gets.
  server.reply = (id, saved) => {
    let chat = find(id);
    if (chat?.placeholder) {
      const [doc] = chat.documents;
      chat = chat.kind === 'job' ? jobChat(chat.jobs[0].id) : documentChat(doc.id, doc.name, { documents: [doc] });
      server.chats.push(chat);
    }
    server.turns[chat.id] = [...(server.turns[chat.id] ?? []), saved];
    return { ...saved, chatId: chat.id };
  };
  server.answers = {};
  api.sendChatMessage.mockImplementation(async (id, { message }) => server.reply(id, turn(message, server.answers[message] ?? 'An answer.')));
  return server;
}

// A promise the test resolves or rejects when it chooses.
export function held() {
  let release;
  let fail;
  const gate = new Promise((resolve, reject) => {
    release = resolve;
    fail = reject;
  });
  return { gate, release: (value) => release(value), fail: (err) => fail(err) };
}
