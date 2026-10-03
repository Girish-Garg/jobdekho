import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import AiChatPanel from './AiChatPanel.jsx';
import { announceOpenPosting } from '../lib/openPostingSignal.js';
import { onNotice } from '../lib/toast.js';
import { takeOpenRequest } from '../lib/openDocumentSignal.js';
import { fakeChats, jobChat, result, version, POSTINGS } from '../test/fixtures/chats.js';

vi.mock('../api.js', () => ({
  getProviders: vi.fn(),
  getProviderPreference: vi.fn(async () => ({ provider: 'auto' })),
  getChatPage: vi.fn(), listChats: vi.fn(), getChatsPending: vi.fn(), createChat: vi.fn(), markChatSeen: vi.fn(),
  clearChat: vi.fn(), deleteChat: vi.fn(), stopChat: vi.fn(), queueChatMessage: vi.fn(), changeChatItems: vi.fn(),
  sendChatMessage: vi.fn(), runPostingAction: vi.fn(), tailorForAll: vi.fn(), lettersForEach: vi.fn(),
  getPostingsPage: vi.fn(async () => ({ postings: [] })), listDocuments: vi.fn(async () => []), createDocument: vi.fn(),
}));

import * as api from '../api.js';

const CLAUDE = { id: 'claude', label: 'Claude Code', install: 'https://claude.ai/code', policies: ['none', 'web'], present: true, runs: true, error: null };
const NO_WEB = { ...CLAUDE, id: 'other', label: 'Other CLI', install: 'https://other.example', policies: ['none'] };
const at = (minute) => `2026-10-03T10:${String(minute).padStart(2, '0')}:00.000Z`;
const VERDICT = { verdict: 'probably_genuine', summary: 'Registered company.', stillOpen: true, redFlags: [], checks: [{ label: 'Company exists', ok: true, finding: 'Found on MCA.', sources: ['https://example.com/mca'] }] };
const LETTER = (text) => ({ letter: text, usedFromResume: ['Bosch project'], notClaimed: [] });
const PLAN = {
  sections: { experience: [{ id: 'e1', title: 'Engineer', organisation: 'Acme' }], projects: [], education: [], certifications: [], achievements: [] },
  factCheck: { flags: [{ type: 'number', value: '40%', context: 'Cut latency by 40%.' }], ok: false },
  coverage: { before: 3, after: 5, total: 8, gained: ['node.js'], missing: [] },
};

let server;
// What the server does with a job action: the version saved with the job,
// shown in the job's own chat, made by the action when it had none.
function answers(kind, value, instruction = '') {
  api.runPostingAction.mockImplementationOnce(async (postingId) => {
    if (!server.chats.some((chat) => chat.id === `c-${postingId}`)) server.chats.push(jobChat(postingId));
    const before = server.results[`c-${postingId}`]?.find((record) => record.kind === kind)?.versions ?? [];
    const versions = [...before, version(value, at(before.length + 1), `c-${postingId}`, instruction)];
    server.results[`c-${postingId}`] = [...(server.results[`c-${postingId}`] ?? []).filter((r) => r.kind !== kind), result(kind, postingId, versions)];
    return { kind, postingId, chatId: `c-${postingId}`, versions, result: value };
  });
}
const saved = (kind, value) => {
  server.chats.push(jobChat('p9'));
  server.results['c-p9'] = [result(kind, 'p9', [version(value, at(1), 'c-p9')])];
};

let nextRequest = 100;
const setup = (props = {}) => render(<AiChatPanel open onClose={() => {}} context={{ filters: {}, sort: 'match' }} apply={{}} {...props} />);
const actions = () => screen.findByRole('group', { name: 'Actions for this job' });

beforeEach(() => {
  vi.clearAllMocks();
  api.getProviders.mockResolvedValue([CLAUDE]);
  server = fakeChats(api, { chats: [] });
  announceOpenPosting(POSTINGS.p9);
});

describe('quick actions in a job\'s chat', () => {
  it('offers the three actions once the chat\'s answers are known', async () => {
    setup();
    const group = await actions();
    await waitFor(() => expect(within(group).getByRole('button', { name: 'Is it real?' })).toBeEnabled());
    expect(within(group).getByRole('button', { name: 'Write a cover letter' })).toBeInTheDocument();
    expect(within(group).getByRole('button', { name: 'Tailor my resume' })).toBeInTheDocument();
  });

  it('runs the fake check on this job and shows its verdict, checks and sources as a card', async () => {
    answers('fake-check', VERDICT);
    setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Is it real?' }));
    const card = await screen.findByRole('region', { name: 'Is it real?' });
    expect(api.runPostingAction).toHaveBeenCalledWith('p9', 'fake-check', expect.objectContaining({ onEvent: expect.any(Function) }));
    expect(within(card).getByText('Probably genuine')).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: 'example.com/mca' })).toHaveAttribute('href', 'https://example.com/mca');
    expect(await within(await actions()).findByRole('button', { name: 'Check again' })).toBeInTheDocument();
  });

  it('writes a cover letter as an editable card with Copy', async () => {
    answers('cover-letter', LETTER('Dear Initech,'));
    setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Write a cover letter' }));
    const card = await screen.findByRole('region', { name: 'Cover letter' });
    expect(within(card).getByRole('textbox')).toHaveValue('Dear Initech,');
    expect(within(card).getByRole('button', { name: 'Copy' })).toBeInTheDocument();
  });

  it('tailors the resume, leads the card with the fact check, and makes a resume document from it on request', async () => {
    answers('resume-tailor', PLAN);
    api.createDocument.mockResolvedValue({ id: 'd7', name: 'Resume for Staff Engineer at Initech' });
    const apply = { setView: vi.fn() };
    setup({ apply });
    fireEvent.click(await screen.findByRole('button', { name: 'Tailor my resume' }));
    const card = await screen.findByRole('region', { name: 'Tailored resume' });
    expect(within(card).getByText('Check these before using it')).toBeInTheDocument();
    expect(api.createDocument).not.toHaveBeenCalled();
    fireEvent.click(within(card).getByRole('button', { name: 'Make a resume from this' }));
    await waitFor(() => expect(apply.setView).toHaveBeenCalledWith('resume'));
    expect(api.createDocument).toHaveBeenCalledWith({ kind: 'resume', templateId: 'classic', postingId: 'p9', fromPlan: true });
    expect(takeOpenRequest()).toBe('d7');
  });

  it('stays put and says why when the resume cannot be made', async () => {
    saved('resume-tailor', PLAN);
    api.createDocument.mockRejectedValue(new Error('Tailor your resume for this job first.'));
    const apply = { setView: vi.fn() };
    const heard = vi.fn();
    const stop = onNotice(heard);
    setup({ apply });
    fireEvent.click(within(await screen.findByRole('region', { name: 'Tailored resume' })).getByRole('button', { name: 'Make a resume from this' }));
    await waitFor(() => expect(heard).toHaveBeenCalledWith(expect.objectContaining({ detail: 'Tailor your resume for this job first.' })));
    stop();
    expect(apply.setView).not.toHaveBeenCalled();
  });

  it('shows the answers already saved in the job\'s chat as soon as it opens, without asking again', async () => {
    saved('cover-letter', LETTER('Saved letter'));
    setup();
    expect(within(await screen.findByRole('region', { name: 'Cover letter' })).getByRole('textbox')).toHaveValue('Saved letter');
    expect(within(await actions()).getByRole('button', { name: 'Write again' })).toBeInTheDocument();
    expect(api.runPostingAction).not.toHaveBeenCalled();
  });

  it('keeps the saved answer and says why, verbatim, when a run fails', async () => {
    saved('cover-letter', LETTER('Saved letter'));
    api.runPostingAction.mockRejectedValueOnce(Object.assign(new Error('Upload a resume first.'), { kind: undefined }));
    setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Write again' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Upload a resume first.');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Cover letter' })).getByRole('textbox')).toHaveValue('Saved letter');
  });

  it('shows the web check\'s own install hint instead of running it when no installed CLI can search', async () => {
    api.getProviders.mockResolvedValue([{ ...CLAUDE, present: false, runs: false }, NO_WEB]);
    setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Is it real?' }));
    expect(await screen.findByText(/^Checking whether a job is real asks an AI CLI/)).toBeInTheDocument();
    expect(api.runPostingAction).not.toHaveBeenCalled();
  });
});

describe('refine by reply', () => {
  it('sends the next message as the card\'s refine instruction, and the new version lands as a reply', async () => {
    saved('cover-letter', LETTER('A long letter.'));
    answers('cover-letter', LETTER('Short.'), 'make it shorter');
    setup();
    fireEvent.click(within(await screen.findByRole('region', { name: 'Cover letter' })).getByRole('button', { name: 'Change this' }));
    expect(screen.getByText('Changing: Cover letter')).toBeInTheDocument();
    const box = screen.getByPlaceholderText('What should change in the letter?');
    expect(box).toHaveFocus();
    fireEvent.change(box, { target: { value: 'make it shorter' } });
    fireEvent.keyDown(box, { key: 'Enter' });
    await waitFor(() => expect(api.runPostingAction).toHaveBeenCalledWith('p9', 'cover-letter', expect.objectContaining({ instruction: 'make it shorter' })));
    expect(api.sendChatMessage).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getAllByRole('region', { name: 'Cover letter' })).toHaveLength(2));
    const cards = screen.getAllByRole('region', { name: 'Cover letter' });
    expect(within(cards[1]).getByRole('textbox')).toHaveValue('Short.');
    expect(within(cards[0]).queryByRole('button', { name: 'Change this' })).not.toBeInTheDocument();
  });

  it('makes a card the target when the card itself is clicked, and goes back to plain chat when the chip is cleared', async () => {
    saved('cover-letter', LETTER('A long letter.'));
    setup();
    fireEvent.click(within(await screen.findByRole('region', { name: 'Cover letter' })).getByText('Draws on'));
    expect(screen.getByText('Changing: Cover letter')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Stop changing it, back to plain chat' }));
    expect(screen.getByPlaceholderText('Ask about what is on screen')).toBeInTheDocument();
  });
});

describe('asked from the job pane', () => {
  it('starts the fake check on arrival for a doubtful job, in the job\'s own chat', async () => {
    answers('fake-check', VERDICT);
    setup({ request: { id: (nextRequest += 1), posting: { ...POSTINGS.p9, legitimacy: 'suspicious' }, action: 'fake-check' } });
    await screen.findByRole('region', { name: 'Is it real?' });
    expect(api.runPostingAction).toHaveBeenCalledTimes(1);
  });

  it('shows the saved verdict instead of paying for a second one', async () => {
    saved('fake-check', VERDICT);
    setup({ request: { id: (nextRequest += 1), posting: POSTINGS.p9, action: 'fake-check' } });
    await screen.findByRole('region', { name: 'Is it real?' });
    await within(await actions()).findByRole('button', { name: 'Check again' });
    expect(api.runPostingAction).not.toHaveBeenCalled();
  });

  it('does not start the same check again when the panel remounts with the same request', async () => {
    const request = { id: (nextRequest += 1), posting: POSTINGS.p9, action: 'fake-check' };
    answers('fake-check', VERDICT);
    const { unmount } = setup({ request });
    await screen.findByRole('region', { name: 'Is it real?' });
    unmount();
    setup({ request });
    await screen.findByRole('region', { name: 'Is it real?' });
    expect(api.runPostingAction).toHaveBeenCalledTimes(1);
  });
});
