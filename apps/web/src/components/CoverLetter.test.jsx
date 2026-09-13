import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CoverLetter from './CoverLetter.jsx';

vi.mock('../api.js', () => ({
  getPostingAiResults: vi.fn(async () => []),
  runPostingAction: vi.fn(async () => FRESH),
}));

import { getPostingAiResults, runPostingAction } from '../api.js';

const CLAUDE = { id: 'claude', label: 'Claude Code', install: 'https://claude.ai/code', present: true, runs: true };
const cli = (over = {}) => ({ providers: [CLAUDE], ready: CLAUDE, checking: false, refresh: vi.fn(), ...over });
const POSTING = { id: 'p1', title: 'Frontend Intern', company: 'Acme' };
const SAVED = {
  kind: 'cover-letter', postingId: 'p1', provider: 'claude', createdAt: new Date().toISOString(),
  result: {
    letter: 'Dear Hiring Team at Acme,\n\nI built a board in React.\n\nRegards',
    usedFromResume: ['Built a board in React'],
    notClaimed: ['AWS experience'],
  },
};
const FRESH = { ...SAVED, result: { ...SAVED.result, letter: 'Dear Hiring Team at Acme,\n\nFresh letter.\n\nRegards' } };

const NOT_FOUND = 'Claude Code is not installed, or is not on the PATH JobDekho was started with. '
  + 'Install it from https://claude.ai/code, then restart JobDekho.';
const failing = (message, kind) => Object.assign(new Error(message), { kind });

beforeEach(() => {
  vi.clearAllMocks();
  getPostingAiResults.mockResolvedValue([]);
  runPostingAction.mockResolvedValue(FRESH);
});

describe('CoverLetter before any letter', () => {
  it('offers to write one and explains what is sent', async () => {
    render(<CoverLetter posting={POSTING} cli={cli()} />);
    expect(await screen.findByRole('button', { name: 'Write a cover letter' })).toBeInTheDocument();
    expect(screen.getByText(/resume on file and this posting/i)).toBeInTheDocument();
  });

  it('runs the action for this posting and shows the letter it came back with', async () => {
    render(<CoverLetter posting={POSTING} cli={cli()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Write a cover letter' }));
    expect(await screen.findByDisplayValue(/Fresh letter/)).toBeInTheDocument();
    expect(runPostingAction).toHaveBeenCalledWith('p1', 'cover-letter', { onEvent: expect.any(Function) });
    expect(screen.getByRole('button', { name: 'Write again' })).toBeInTheDocument();
  });

  it('narrates the wait while the CLI writes', async () => {
    let finish;
    runPostingAction.mockImplementationOnce(async (_id, _kind, { onEvent }) => {
      onEvent({ event: 'start', provider: 'claude', path: 'C:\\npm\\claude.cmd' });
      onEvent({ event: 'progress', stage: 'wait', elapsedMs: 15000 });
      await new Promise((r) => { finish = r; });
      return FRESH;
    });
    render(<CoverLetter posting={POSTING} cli={cli()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Write a cover letter' }));
    const live = await screen.findByText('Claude Code is writing... 15s');
    expect(live).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByRole('button', { name: 'Writing...' })).toBeDisabled();
    finish();
    expect(await screen.findByDisplayValue(/Fresh letter/)).toBeInTheDocument();
  });

  it('shows the server sentence and withholds the button while the CLI is missing', async () => {
    runPostingAction.mockRejectedValueOnce(failing(NOT_FOUND, 'not_found'));
    render(<CoverLetter posting={POSTING} cli={cli()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Write a cover letter' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(NOT_FOUND);
    expect(screen.queryByRole('button', { name: 'Write a cover letter' })).not.toBeInTheDocument();
  });
});

describe('CoverLetter with a saved letter', () => {
  it('shows the saved letter first and offers to write again', async () => {
    getPostingAiResults.mockResolvedValue([SAVED]);
    render(<CoverLetter posting={POSTING} cli={cli()} />);
    expect(await screen.findByDisplayValue(/Dear Hiring Team at Acme/)).toBeInTheDocument();
    expect(screen.getByText('Built a board in React')).toBeInTheDocument();
    expect(screen.getByText('AWS experience')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Write again' })).toBeInTheDocument();
    expect(screen.queryByText(/resume on file and this posting/i)).not.toBeInTheDocument();
    expect(runPostingAction).not.toHaveBeenCalled();
  });

  it('replaces the saved letter with the fresh one', async () => {
    getPostingAiResults.mockResolvedValue([SAVED]);
    render(<CoverLetter posting={POSTING} cli={cli()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Write again' }));
    expect(await screen.findByDisplayValue(/Fresh letter/)).toBeInTheDocument();
  });

  it('copies the letter to the clipboard', async () => {
    getPostingAiResults.mockResolvedValue([SAVED]);
    const writeText = vi.fn(async () => {});
    Object.assign(navigator, { clipboard: { writeText } });
    render(<CoverLetter posting={POSTING} cli={cli()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Copy' }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Dear Hiring Team at Acme'));
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument();
  });

  it('shows a graceful message when the clipboard fails', async () => {
    getPostingAiResults.mockResolvedValue([SAVED]);
    Object.assign(navigator, { clipboard: { writeText: vi.fn(async () => { throw new Error('denied'); }) } });
    render(<CoverLetter posting={POSTING} cli={cli()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Copy' }));
    expect(await screen.findByText(/could not copy/i)).toBeInTheDocument();
  });

  it('keeps the saved letter on screen when a rewrite fails', async () => {
    getPostingAiResults.mockResolvedValue([SAVED]);
    runPostingAction.mockRejectedValueOnce(failing('Claude Code did not answer within 120 seconds. Try again.', 'timeout'));
    render(<CoverLetter posting={POSTING} cli={cli()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Write again' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/120 seconds/);
    expect(screen.getByDisplayValue(/Dear Hiring Team at Acme/)).toBeInTheDocument();
  });
});
