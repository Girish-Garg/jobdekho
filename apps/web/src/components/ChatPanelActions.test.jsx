import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import AiChatPanel from './AiChatPanel.jsx';
import { announceOpenPosting } from '../lib/openPostingSignal.js';

vi.mock('../api.js', () => ({
  getProviders: vi.fn(),
  getProviderPreference: vi.fn(async () => ({ provider: 'auto' })),
  getChatHistory: vi.fn(async () => ({ turns: [] })),
  sendChatMessage: vi.fn(),
  clearChatHistory: vi.fn(async () => null),
  getPostingAiResults: vi.fn(),
  runPostingAction: vi.fn(),
  // The builder the tailoring opens loads these; left pending, it only has
  // to be there, not finish.
  getProfile: vi.fn(() => new Promise(() => {})),
  getResumeTemplates: vi.fn(() => new Promise(() => {})),
  getResumeSelection: vi.fn(() => new Promise(() => {})),
  putResumeSelection: vi.fn(),
  getResumePdf: vi.fn(),
  getResumeTex: vi.fn(),
}));

import { getProviders, sendChatMessage, getPostingAiResults, runPostingAction } from '../api.js';

const CLAUDE = { id: 'claude', label: 'Claude Code', install: 'https://claude.ai/code', policies: ['none', 'web'], present: true, runs: true, error: null };
const AGY = { id: 'agy', label: 'Antigravity', install: 'https://antigravity.google', policies: ['none', 'web'], present: true, runs: true, error: null };
// A CLI that takes plain calls but cannot search, as a later one might.
const NO_WEB = { ...AGY, id: 'other', label: 'Other CLI', install: 'https://other.example', policies: ['none'] };
const JOB = { id: 'p9', title: 'Staff Engineer', company: 'Initech', legitimacy: 'high' };
const at = (minute) => `2026-09-29T10:${String(minute).padStart(2, '0')}:00.000Z`;
const version = (result, minute, instruction = '') => ({ instruction, provider: 'claude', createdAt: at(minute), result });
const record = (kind, versions) => ({ kind, postingId: 'p9', provider: 'claude', createdAt: versions.at(-1).createdAt, result: versions.at(-1).result, versions, dropped: false });

const VERDICT = { verdict: 'probably_genuine', summary: 'Registered company, role on its own site.', stillOpen: true, redFlags: [], checks: [{ label: 'Company exists', ok: true, finding: 'Found on MCA.', sources: ['https://example.com/mca'] }] };
const LETTER = (text) => ({ letter: text, usedFromResume: ['Bosch project'], notClaimed: [] });
const PLAN = {
  sections: { experience: [{ id: 'e1', title: 'Engineer', organisation: 'Acme' }], projects: [], education: [], certifications: [], achievements: [] },
  factCheck: { flags: [{ type: 'number', value: '40%', context: 'Cut latency by 40%.' }], ok: false },
  coverage: { before: 3, after: 5, total: 8, gained: ['node.js'], missing: [] },
};

let nextRequest = 1;
function setup(props = {}) {
  return render(<AiChatPanel open onClose={() => {}} context={{ filters: {}, sort: 'match' }} apply={{}} {...props} />);
}
const actions = () => screen.findByRole('group', { name: 'Actions for this job' });

beforeEach(() => {
  vi.clearAllMocks();
  getProviders.mockResolvedValue([CLAUDE]);
  getPostingAiResults.mockResolvedValue([]);
  announceOpenPosting(JOB);
});

describe('quick actions', () => {
  it('offers the three actions once the job\'s saved answers are known', async () => {
    setup();
    const group = await actions();
    await waitFor(() => expect(within(group).getByRole('button', { name: 'Is it real?' })).toBeEnabled());
    expect(within(group).getByRole('button', { name: 'Write a cover letter' })).toBeInTheDocument();
    expect(within(group).getByRole('button', { name: 'Tailor my resume' })).toBeInTheDocument();
  });

  it('runs the fake check on this job and shows its verdict, checks and sources as a card', async () => {
    runPostingAction.mockResolvedValueOnce(record('fake-check', [version(VERDICT, 1)]));
    setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Is it real?' }));
    const card = await screen.findByRole('region', { name: 'Is it real?' });
    expect(runPostingAction).toHaveBeenCalledWith('p9', 'fake-check', { onEvent: expect.any(Function) });
    expect(within(card).getByText('Probably genuine')).toBeInTheDocument();
    expect(within(card).getByText('Found on MCA.')).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: 'example.com/mca' })).toHaveAttribute('href', 'https://example.com/mca');
    expect(await within(await actions()).findByRole('button', { name: 'Check again' })).toBeInTheDocument();
  });

  it('writes a cover letter as an editable card with Copy', async () => {
    runPostingAction.mockResolvedValueOnce(record('cover-letter', [version(LETTER('Dear Initech,'), 1)]));
    setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Write a cover letter' }));
    const card = await screen.findByRole('region', { name: 'Cover letter' });
    expect(runPostingAction).toHaveBeenCalledWith('p9', 'cover-letter', { onEvent: expect.any(Function) });
    expect(within(card).getByRole('textbox')).toHaveValue('Dear Initech,');
    expect(within(card).getByRole('button', { name: 'Copy' })).toBeInTheDocument();
  });

  it('tailors the resume, leads the card with the fact check, and opens the builder beside the chat', async () => {
    runPostingAction.mockResolvedValueOnce(record('resume-tailor', [version(PLAN, 1)]));
    setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Tailor my resume' }));
    const builder = await screen.findByRole('dialog', { name: 'Resume builder, tailored for Staff Engineer' });
    expect(runPostingAction).toHaveBeenCalledWith('p9', 'resume-tailor', { onEvent: expect.any(Function) });
    const card = screen.getByRole('region', { name: 'Tailored resume' });
    const flags = within(card).getByText('Check these before using it');
    expect(flags.compareDocumentPosition(within(card).getByText(/Matches 5 of 8/)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // The chat is still there, beside the builder, not behind a backdrop.
    expect(screen.getByRole('complementary', { name: 'Ask AI' })).toBeInTheDocument();
    fireEvent.click(within(builder).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(within(card).getByRole('button', { name: 'Open in the resume builder' }));
    expect(await screen.findByRole('dialog', { name: /tailored for Staff Engineer/ })).toBeInTheDocument();
  });

  it('shows the answers already saved for the job as soon as the chat opens on it, without asking again', async () => {
    getPostingAiResults.mockResolvedValue([record('cover-letter', [version(LETTER('Saved letter'), 1)])]);
    setup();
    const card = await screen.findByRole('region', { name: 'Cover letter' });
    expect(within(card).getByRole('textbox')).toHaveValue('Saved letter');
    expect(within(await actions()).getByRole('button', { name: 'Write again' })).toBeInTheDocument();
    expect(runPostingAction).not.toHaveBeenCalled();
  });

  it('keeps the saved answer and says why, verbatim, when a run fails', async () => {
    getPostingAiResults.mockResolvedValue([record('cover-letter', [version(LETTER('Saved letter'), 1)])]);
    runPostingAction.mockRejectedValueOnce(Object.assign(new Error('Upload a resume first.'), { kind: undefined }));
    setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Write again' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Upload a resume first.');
    expect(screen.getByRole('textbox', { name: '' })).toHaveValue('Saved letter');
  });

  it('shows the web check\'s own install hint instead of running it when no installed CLI can search', async () => {
    getProviders.mockResolvedValue([{ ...CLAUDE, present: false, runs: false }, NO_WEB]);
    setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Is it real?' }));
    expect(await screen.findByText(/^Checking whether a job is real asks an AI CLI/)).toBeInTheDocument();
    expect(screen.getByText('Other CLI is installed, but it cannot take this action.')).toBeInTheDocument();
    expect(runPostingAction).not.toHaveBeenCalled();
  });
});

describe('refine by reply', () => {
  const saved = () => [record('cover-letter', [version(LETTER('A long letter.'), 1)])];

  it('sends the next message as the card\'s refine instruction, and the new version lands as a reply', async () => {
    getPostingAiResults.mockResolvedValue(saved());
    runPostingAction.mockResolvedValueOnce(record('cover-letter', [version(LETTER('A long letter.'), 1), version(LETTER('Short.'), 2, 'make it shorter')]));
    setup();
    const card = await screen.findByRole('region', { name: 'Cover letter' });
    fireEvent.click(within(card).getByRole('button', { name: 'Change this' }));
    expect(screen.getByText('Changing: Cover letter')).toBeInTheDocument();
    const box = screen.getByPlaceholderText('What should change in the letter?');
    expect(box).toHaveFocus();
    fireEvent.change(box, { target: { value: 'make it shorter' } });
    fireEvent.keyDown(box, { key: 'Enter' });
    await waitFor(() => expect(runPostingAction).toHaveBeenCalledWith('p9', 'cover-letter', { onEvent: expect.any(Function), instruction: 'make it shorter' }));
    expect(sendChatMessage).not.toHaveBeenCalled();
    const cards = await screen.findAllByRole('region', { name: 'Cover letter' });
    expect(cards).toHaveLength(2);
    expect(within(cards[1]).getByRole('textbox')).toHaveValue('Short.');
    expect(screen.getByText('make it shorter')).toBeInTheDocument();
    // The older version folds away and can no longer be targeted.
    expect(within(cards[0]).queryByRole('textbox')).not.toBeInTheDocument();
    expect(within(cards[0]).queryByRole('button', { name: 'Change this' })).not.toBeInTheDocument();
  });

  it('makes a card the target when the card itself is clicked', async () => {
    getPostingAiResults.mockResolvedValue(saved());
    setup();
    const card = await screen.findByRole('region', { name: 'Cover letter' });
    fireEvent.click(within(card).getByText('Draws on'));
    expect(screen.getByText('Changing: Cover letter')).toBeInTheDocument();
  });

  it('goes back to plain chat when the chip is cleared', async () => {
    getPostingAiResults.mockResolvedValue(saved());
    sendChatMessage.mockResolvedValue({ question: 'hi', answer: 'Hello.', actions: [], refs: [], provider: 'claude', createdAt: at(5) });
    setup();
    const card = await screen.findByRole('region', { name: 'Cover letter' });
    fireEvent.click(within(card).getByRole('button', { name: 'Change this' }));
    fireEvent.click(screen.getByRole('button', { name: 'Stop changing it, back to plain chat' }));
    const box = screen.getByPlaceholderText('Ask about what is on screen');
    fireEvent.change(box, { target: { value: 'hi' } });
    fireEvent.keyDown(box, { key: 'Enter' });
    await screen.findByText('Hello.');
    expect(runPostingAction).not.toHaveBeenCalled();
  });
});

describe('asked from the job pane', () => {
  it('starts the fake check on arrival for a doubtful job', async () => {
    runPostingAction.mockResolvedValueOnce(record('fake-check', [version(VERDICT, 1)]));
    setup({ request: { id: (nextRequest += 1), posting: { ...JOB, legitimacy: 'suspicious' }, action: 'fake-check' } });
    await screen.findByRole('region', { name: 'Is it real?' });
    expect(runPostingAction).toHaveBeenCalledTimes(1);
    expect(runPostingAction).toHaveBeenCalledWith('p9', 'fake-check', { onEvent: expect.any(Function) });
  });

  it('shows the saved verdict instead of paying for a second one', async () => {
    getPostingAiResults.mockResolvedValue([record('fake-check', [version(VERDICT, 1)])]);
    setup({ request: { id: (nextRequest += 1), posting: JOB, action: 'fake-check' } });
    await screen.findByRole('region', { name: 'Is it real?' });
    await within(await actions()).findByRole('button', { name: 'Check again' });
    expect(runPostingAction).not.toHaveBeenCalled();
  });

  it('does not start the same check again when the panel remounts with the same request', async () => {
    const request = { id: (nextRequest += 1), posting: JOB, action: 'fake-check' };
    runPostingAction.mockResolvedValue(record('fake-check', [version(VERDICT, 1)]));
    const { unmount } = setup({ request });
    await screen.findByRole('region', { name: 'Is it real?' });
    unmount();
    setup({ request });
    await actions();
    await waitFor(() => expect(getPostingAiResults).toHaveBeenCalledTimes(2));
    expect(runPostingAction).toHaveBeenCalledTimes(1);
  });
});
