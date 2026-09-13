import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ResumeTailor from './ResumeTailor.jsx';
import { ACTIONS } from './AiSection.jsx';

vi.mock('../api.js', () => ({
  getPostingAiResults: vi.fn(async () => []),
  runPostingAction: vi.fn(async () => FRESH),
}));

import { getPostingAiResults, runPostingAction } from '../api.js';

const CLAUDE = { id: 'claude', label: 'Claude Code', install: 'https://claude.ai/code', present: true, runs: true };
const cli = (over = {}) => ({ providers: [CLAUDE], ready: CLAUDE, checking: false, refresh: vi.fn(), ...over });
const POSTING = { id: 'p1', title: 'Backend Engineer', company: 'Acme Systems' };
const RESULT = {
  resume: 'Priya Sharma\nBackend developer.', keywords: { used: [], missing: [] }, changes: [],
  factCheck: { flags: [], ok: true }, coverage: { before: 6, after: 9, total: 14, gained: ['node.js'], missing: [] },
};
const SAVED = { kind: 'resume-tailor', postingId: 'p1', provider: 'claude', createdAt: new Date().toISOString(), result: RESULT };
const FRESH = {
  ...SAVED, createdAt: '2026-09-14T00:00:00.000Z',
  result: { ...RESULT, resume: 'Fresh rewrite', factCheck: { flags: [{ type: 'number', value: '40%', context: 'Cut 40%.' }], ok: false } },
};

const NOT_FOUND = 'Claude Code is not installed, or is not on the PATH JobDekho was started with. '
  + 'Install it from https://claude.ai/code, then restart JobDekho.';
const failing = (message, kind) => Object.assign(new Error(message), { kind });

beforeEach(() => {
  vi.clearAllMocks();
  getPostingAiResults.mockResolvedValue([]);
  runPostingAction.mockResolvedValue(FRESH);
});

describe('ResumeTailor before any rewrite', () => {
  it('offers the button, says what it sends and that it runs with no tools', async () => {
    render(<ResumeTailor posting={POSTING} cli={cli()} />);
    expect(await screen.findByRole('button', { name: 'Tailor my resume for this job' })).toBeInTheDocument();
    expect(screen.getByText(/sends the resume on file and this posting to claude code on this computer, with no tools/i)).toBeInTheDocument();
  });

  it('runs the tailoring for this posting and shows the fact check first', async () => {
    render(<ResumeTailor posting={POSTING} cli={cli()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Tailor my resume for this job' }));
    expect(await screen.findByText('Check these before using it')).toBeInTheDocument();
    expect(screen.getByLabelText('Tailored resume')).toHaveValue('Fresh rewrite');
    expect(runPostingAction).toHaveBeenCalledWith('p1', 'resume-tailor', { onEvent: expect.any(Function) });
    expect(screen.getByRole('button', { name: 'Tailor again' })).toBeInTheDocument();
  });

  it('narrates the wait in the resume\'s words', async () => {
    let finish;
    runPostingAction.mockImplementationOnce(async (_id, _kind, { onEvent }) => {
      onEvent({ event: 'start', provider: 'claude', path: 'C:\\npm\\claude.cmd' });
      onEvent({ event: 'progress', stage: 'send', chars: 9000 });
      onEvent({ event: 'progress', stage: 'wait', elapsedMs: 65000 });
      await new Promise((r) => { finish = r; });
      return FRESH;
    });
    render(<ResumeTailor posting={POSTING} cli={cli()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Tailor my resume for this job' }));
    const live = await screen.findByText('Claude Code is rewriting... 65s');
    expect(live).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByRole('button', { name: 'Tailoring...' })).toBeDisabled();
    finish();
    expect(await screen.findByText('Check these before using it')).toBeInTheDocument();
  });

  it('shows the server sentence for a missing resume and keeps the button', async () => {
    runPostingAction.mockRejectedValueOnce(failing('Upload a resume first.'));
    render(<ResumeTailor posting={POSTING} cli={cli()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Tailor my resume for this job' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Upload a resume first.');
    expect(screen.getByRole('button', { name: 'Tailor my resume for this job' })).toBeEnabled();
  });

  it('withholds the button while the CLI is missing and offers the re-probe', async () => {
    runPostingAction.mockRejectedValueOnce(failing(NOT_FOUND, 'not_found'));
    const state = cli();
    render(<ResumeTailor posting={POSTING} cli={state} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Tailor my resume for this job' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(NOT_FOUND);
    expect(screen.queryByRole('button', { name: 'Tailor my resume for this job' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Check again' }));
    expect(state.refresh).toHaveBeenCalled();
    expect(await screen.findByRole('button', { name: 'Tailor my resume for this job' })).toBeInTheDocument();
  });
});

describe('ResumeTailor with a saved rewrite', () => {
  it('shows it first, named for the employer, and offers to tailor again', async () => {
    getPostingAiResults.mockResolvedValue([SAVED]);
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<ResumeTailor posting={POSTING} cli={cli()} />);
    expect(await screen.findByText('Nothing in the rewrite is missing from your original resume.')).toBeInTheDocument();
    expect(screen.getByText('Matches 9 of 14 skills this job names, up from 6.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tailor again' })).toBeInTheDocument();
    expect(screen.queryByText(/sends the resume on file/i)).not.toBeInTheDocument();
    expect(runPostingAction).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Download as .txt' }));
    expect(click.mock.instances[0].download).toBe('resume-acme-systems.txt');
    click.mockRestore();
  });

  it('keeps the saved rewrite on screen when a rerun fails', async () => {
    getPostingAiResults.mockResolvedValue([SAVED]);
    runPostingAction.mockRejectedValueOnce(failing('Claude Code is not signed in (x). Open a terminal, run "claude", finish signing in, then try again.', 'login'));
    render(<ResumeTailor posting={POSTING} cli={cli()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Tailor again' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/not signed in/);
    expect(screen.getByLabelText('Tailored resume')).toHaveValue(RESULT.resume);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Tailor again' })).toBeEnabled());
  });

  it('is offered by the AI section, after the actions that came before it', () => {
    expect(ACTIONS[ACTIONS.length - 1]).toBe(ResumeTailor);
  });
});
