import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { applyProposal, discardProposal, editMailDraft, getMail, listDocuments } from '../api.js';
import { holdMail, stopMail, sendMail, mailState, resetMailDrafts, HOLD_MS } from './mailDrafts.js';
import { startMail, isFresh } from './mailStart.js';
import { resetMailAccount } from './mailAccount.js';
import { answerAsk, currentAsk, resetQuestionDock, stopAsking } from './questionDock.js';

vi.mock('../api.js', () => ({
  applyProposal: vi.fn(), discardProposal: vi.fn(), editMailDraft: vi.fn(), getMail: vi.fn(), listDocuments: vi.fn(),
}));

const CONNECTED = { connected: true, address: 'jane@example.com', keptIn: 'windows', sentToday: 0, cap: 20 };
const RESUMES = [
  { id: 'd1', name: 'Jane Doe Resume', kind: 'resume', updatedAt: '2026-10-13T10:00:00.000Z' },
  { id: 'd2', name: 'Cover letter', kind: 'cover-letter', updatedAt: '2026-10-12T10:00:00.000Z' },
];
let n = 0;
const mail = (extra = {}) => ({ id: `m${(n += 1)}`, to: 'priya@acme.example', name: 'Priya', subject: 'Hi', body: 'Hello', attach: null, mailedBefore: null, status: 'pending', ...extra });
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  vi.clearAllMocks();
  resetMailDrafts();
  resetQuestionDock();
  resetMailAccount();
  getMail.mockResolvedValue(CONNECTED);
  listDocuments.mockResolvedValue(RESUMES);
  applyProposal.mockResolvedValue({ proposal: { status: 'applied', sentAt: '2026-10-15T10:00:00.000Z', from: 'jane@example.com' } });
  editMailDraft.mockImplementation(async (id, patch) => ({ proposal: { id, ...patch, attachName: patch.attach === 'd1' ? 'Jane Doe Resume' : null } }));
  discardProposal.mockResolvedValue(null);
});
afterEach(() => vi.useRealTimers());

describe('the hold before a mail goes', () => {
  it('sends when it runs out, once', async () => {
    vi.useFakeTimers();
    holdMail('a', 'chat1');
    expect(mailState('a')).toMatchObject({ phase: 'holding' });
    vi.advanceTimersByTime(HOLD_MS - 1);
    expect(applyProposal).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(applyProposal).toHaveBeenCalledWith('a');
    expect(mailState('a')).toMatchObject({ phase: 'done', status: 'applied', from: 'jane@example.com' });
    await sendMail('a');
    expect(applyProposal).toHaveBeenCalledTimes(1);
  });

  it('sends nothing once stopped', async () => {
    vi.useFakeTimers();
    holdMail('b', 'chat1');
    stopMail('b');
    await vi.advanceTimersByTimeAsync(HOLD_MS * 2);
    expect(applyProposal).not.toHaveBeenCalled();
    expect(mailState('b').phase).toBe('stopped');
  });

  it('stops the older mail in the same chat when a newer one starts, and leaves other chats alone', async () => {
    vi.useFakeTimers();
    holdMail('old', 'chat1');
    holdMail('other', 'chat2');
    holdMail('new', 'chat1');
    expect(mailState('old').phase).toBe('stopped');
    await vi.advanceTimersByTimeAsync(HOLD_MS);
    expect(applyProposal.mock.calls.map(([id]) => id).sort()).toEqual(['new', 'other']);
  });

  it('keeps the server refusal and waits for the person', async () => {
    applyProposal.mockRejectedValueOnce(new Error('Connect Gmail in Settings first. Nothing was sent.'));
    await sendMail('c');
    expect(mailState('c')).toMatchObject({ phase: 'stopped', error: 'Connect Gmail in Settings first. Nothing was sent.' });
  });
});

describe('a mail that just arrived', () => {
  it('asks which resume goes with it, saves the pick, then counts down', async () => {
    const one = mail();
    startMail('chat1', one);
    await vi.waitFor(() => expect(currentAsk('chat1')).not.toBeNull());
    const ask = currentAsk('chat1');
    expect(ask.questions[0].options.map((o) => o.label)).toEqual(['Jane Doe Resume', 'No attachment']);
    answerAsk('chat1', ask.id, [['d1']]);
    await vi.waitFor(() => expect(mailState(one.id)?.phase).toBe('holding'));
    expect(editMailDraft).toHaveBeenCalledWith(one.id, { attach: 'd1' });
    expect(mailState(one.id).draft).toMatchObject({ attach: 'd1', attachName: 'Jane Doe Resume' });
  });

  it('does not count down when the person stops the question, nor twice for one mail', async () => {
    const one = mail();
    startMail('chat1', one);
    await vi.waitFor(() => expect(currentAsk('chat1')).not.toBeNull());
    stopAsking('chat1');
    await settle();
    expect(mailState(one.id).phase).toBe('stopped');
    startMail('chat1', one);
    await settle();
    expect(currentAsk('chat1')).toBeNull();
  });

  it('asks nothing with no resume, and waits for Send to an address mailed before', async () => {
    listDocuments.mockResolvedValue([]);
    const before = mail({ mailedBefore: '2026-10-01T00:00:00.000Z' });
    await startMail('chat1', before);
    expect(editMailDraft).toHaveBeenCalledWith(before.id, { attach: 'none' });
    expect(mailState(before.id).phase).toBe('stopped');
  });

  it('never counts down without Gmail connected', async () => {
    getMail.mockResolvedValue({ connected: false });
    const one = mail({ attach: 'none' });
    await startMail('chat1', one);
    expect(mailState(one.id).phase).toBe('stopped');
    expect(listDocuments).not.toHaveBeenCalled();
  });

  it('is one made after the page opened', () => {
    expect(isFresh(new Date(Date.now() + 1000).toISOString())).toBe(true);
    expect(isFresh('2026-01-01T00:00:00.000Z')).toBe(false);
  });
});
