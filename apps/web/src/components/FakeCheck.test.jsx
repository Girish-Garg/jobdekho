import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FakeCheck from './FakeCheck.jsx';

vi.mock('../api.js', () => ({
  getPostingAiResults: vi.fn(async () => []),
  runPostingAction: vi.fn(async () => FRESH),
}));

import { getPostingAiResults, runPostingAction } from '../api.js';

const CLAUDE = { id: 'claude', label: 'Claude Code', install: 'https://claude.ai/code', present: true, runs: true };
const cli = (over = {}) => ({ providers: [CLAUDE], ready: CLAUDE, checking: false, refresh: vi.fn(), ...over });
const POSTING = { id: 'p1', title: 'Frontend Intern', company: 'Acme' };
const SAVED = {
  kind: 'fake-check', postingId: 'p1', provider: 'claude', createdAt: new Date().toISOString(),
  result: { verdict: 'unclear', stillOpen: null, summary: 'Too little to go on.', checks: [], redFlags: [] },
};
const FRESH = { ...SAVED, result: { ...SAVED.result, verdict: 'genuine', summary: 'Acme is real and hiring.' } };

const NOT_FOUND = 'Claude Code is not installed, or is not on the PATH JobDekho was started with. '
  + 'Install it from https://claude.ai/code, then restart JobDekho.';
const failing = (message, kind) => Object.assign(new Error(message), { kind });

beforeEach(() => {
  vi.clearAllMocks();
  getPostingAiResults.mockResolvedValue([]);
  runPostingAction.mockResolvedValue(FRESH);
});

describe('FakeCheck before any check', () => {
  it('offers the question, says what it sends, and names the CLI', async () => {
    render(<FakeCheck posting={POSTING} cli={cli()} />);
    expect(await screen.findByRole('button', { name: 'Is this job real?' })).toBeInTheDocument();
    expect(screen.getByText(/asks claude code on this computer/i)).toBeInTheDocument();
    expect(screen.getByText(/never your resume or profile/i)).toBeInTheDocument();
  });

  it('runs the check for this posting and shows the verdict it came back with', async () => {
    render(<FakeCheck posting={POSTING} cli={cli()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Is this job real?' }));
    expect(await screen.findByText('Looks genuine')).toBeInTheDocument();
    expect(screen.getByText('Acme is real and hiring.')).toBeInTheDocument();
    expect(runPostingAction).toHaveBeenCalledWith('p1', 'fake-check', { onEvent: expect.any(Function) });
    expect(screen.getByRole('button', { name: 'Check again' })).toBeInTheDocument();
  });

  it('narrates the wait in the posting\'s words while the CLI browses', async () => {
    let finish;
    runPostingAction.mockImplementationOnce(async (_id, _kind, { onEvent }) => {
      onEvent({ event: 'start', provider: 'claude', path: 'C:\\npm\\claude.cmd' });
      onEvent({ event: 'progress', stage: 'wait', elapsedMs: 90000 });
      await new Promise((r) => { finish = r; });
      return FRESH;
    });
    render(<FakeCheck posting={POSTING} cli={cli()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Is this job real?' }));
    const live = await screen.findByText('Claude Code is checking the web... 90s');
    expect(live).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByRole('button', { name: 'Checking...' })).toBeDisabled();
    finish();
    expect(await screen.findByText('Looks genuine')).toBeInTheDocument();
  });

  it('shows the server sentence verbatim and withholds the button while the CLI is missing', async () => {
    runPostingAction.mockRejectedValueOnce(failing(NOT_FOUND, 'not_found'));
    const state = cli();
    render(<FakeCheck posting={POSTING} cli={state} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Is this job real?' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(NOT_FOUND);
    expect(screen.queryByRole('button', { name: 'Is this job real?' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Check again' }));
    expect(state.refresh).toHaveBeenCalled();
    expect(await screen.findByRole('button', { name: 'Is this job real?' })).toBeInTheDocument();
  });

  it('keeps the button for a failure the sentence already explains', async () => {
    runPostingAction.mockRejectedValueOnce(failing('Claude Code did not answer within 300 seconds. Try again.', 'timeout'));
    render(<FakeCheck posting={POSTING} cli={cli()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Is this job real?' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/300 seconds/);
    expect(screen.getByRole('button', { name: 'Is this job real?' })).toBeEnabled();
  });
});

describe('FakeCheck with a saved verdict', () => {
  it('shows the saved verdict first and offers to check again', async () => {
    getPostingAiResults.mockResolvedValue([SAVED]);
    render(<FakeCheck posting={POSTING} cli={cli()} />);
    expect(await screen.findByText('Could not tell')).toBeInTheDocument();
    expect(screen.getByText('Too little to go on.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Check again' })).toBeInTheDocument();
    expect(screen.queryByText(/never your resume/i)).not.toBeInTheDocument();
    expect(runPostingAction).not.toHaveBeenCalled();
  });

  it('replaces the saved verdict with the fresh one', async () => {
    getPostingAiResults.mockResolvedValue([SAVED]);
    render(<FakeCheck posting={POSTING} cli={cli()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Check again' }));
    expect(await screen.findByText('Looks genuine')).toBeInTheDocument();
    expect(screen.queryByText('Could not tell')).not.toBeInTheDocument();
  });

  it('keeps the saved verdict on screen when a rerun fails', async () => {
    getPostingAiResults.mockResolvedValue([SAVED]);
    runPostingAction.mockRejectedValueOnce(failing('Claude Code is not signed in (x). Open a terminal, run "claude", finish signing in, then try again.', 'login'));
    render(<FakeCheck posting={POSTING} cli={cli()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Check again' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/not signed in/);
    expect(screen.getByText('Could not tell')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Check again' })).toBeEnabled());
  });
});
