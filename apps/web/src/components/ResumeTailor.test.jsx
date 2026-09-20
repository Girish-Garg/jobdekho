import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ResumeTailor from './ResumeTailor.jsx';
import { ACTIONS } from './AiSection.jsx';

vi.mock('../api.js', () => ({
  getPostingAiResults: vi.fn(async () => []),
  runPostingAction: vi.fn(async () => FRESH),
  getProfile: vi.fn(async () => PROFILE),
  getResumeTemplates: vi.fn(async () => [{ id: 'classic', name: 'Classic', description: '' }]),
  getResumeSelection: vi.fn(async () => ({ template: 'classic', sections: {} })),
  putResumeSelection: vi.fn(async () => ({})),
  getResumePdf: vi.fn(async () => new Blob(['%PDF-fake'])),
  getResumeTex: vi.fn(async () => 'tex source'),
}));

import { getPostingAiResults, runPostingAction, getResumePdf } from '../api.js';

const CLAUDE = { id: 'claude', label: 'Claude Code', install: 'https://claude.ai/code', present: true, runs: true };
const cli = (over = {}) => ({ providers: [CLAUDE], ready: CLAUDE, checking: false, refresh: vi.fn(), ...over });
const POSTING = { id: 'p1', title: 'Backend Engineer', company: 'Acme Systems' };
const PROFILE = {
  basics: { name: 'Priya Sharma', headline: '', email: '', phone: '', location: '', links: {} },
  experience: [{ id: 'e1', title: 'Software Developer', organisation: 'Infobeans Technologies' }],
  projects: [], education: [], certifications: [], achievements: [], skillGroups: [],
};
const SECTIONS = { experience: [{ id: 'e1', title: 'Software Developer', organisation: 'Infobeans Technologies' }], projects: [], education: [], certifications: [], achievements: [] };
const RESULT = {
  sections: SECTIONS, keywords: { used: [], missing: [] },
  factCheck: { flags: [], ok: true }, coverage: { before: 6, after: 9, total: 14, gained: ['node.js'], missing: [] },
};
const SAVED = { kind: 'resume-tailor', postingId: 'p1', provider: 'claude', createdAt: new Date().toISOString(), result: RESULT };
const FRESH = {
  ...SAVED, createdAt: '2026-09-14T00:00:00.000Z',
  result: { ...RESULT, factCheck: { flags: [{ type: 'number', value: '40%', context: 'Cut 40%.' }], ok: false } },
};

const NOT_FOUND = 'Claude Code is not installed, or is not on the PATH JobDekho was started with. '
  + 'Install it from https://claude.ai/code, then restart JobDekho.';
const failing = (message, kind) => Object.assign(new Error(message), { kind });

beforeEach(() => {
  vi.clearAllMocks();
  getPostingAiResults.mockResolvedValue([]);
  runPostingAction.mockResolvedValue(FRESH);
  getResumePdf.mockResolvedValue(new Blob(['%PDF-fake']));
});

describe('ResumeTailor before any rewrite', () => {
  it('offers the button, says what it sends and that it runs with no tools', async () => {
    render(<ResumeTailor posting={POSTING} cli={cli()} />);
    expect(await screen.findByRole('button', { name: 'Tailor my resume for this job' })).toBeInTheDocument();
    expect(screen.getByText(/sends your career record and this posting to claude code on this computer, with no tools/i)).toBeInTheDocument();
  });

  it('runs the tailoring for this posting and shows the fact check first', async () => {
    render(<ResumeTailor posting={POSTING} cli={cli()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Tailor my resume for this job' }));
    expect(await screen.findByText('Check these before using it')).toBeInTheDocument();
    expect(runPostingAction).toHaveBeenCalledWith('p1', 'resume-tailor', { onEvent: expect.any(Function) });
    expect(screen.getByRole('button', { name: 'Tailor again' })).toBeInTheDocument();
  });

  it('shows the server sentence for an empty career record and keeps the button', async () => {
    runPostingAction.mockRejectedValueOnce(failing('Add at least one entry to your career record first.'));
    render(<ResumeTailor posting={POSTING} cli={cli()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Tailor my resume for this job' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Add at least one entry to your career record first.');
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

describe('ResumeTailor with a saved plan', () => {
  it('shows it first, and offers to tailor again', async () => {
    getPostingAiResults.mockResolvedValue([SAVED]);
    render(<ResumeTailor posting={POSTING} cli={cli()} />);
    expect(await screen.findByText('Nothing in the rewrite is missing from your original resume.')).toBeInTheDocument();
    expect(screen.getByText('Matches 9 of 14 skills this job names, up from 6.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tailor again' })).toBeInTheDocument();
    expect(screen.queryByText(/sends your career record/i)).not.toBeInTheDocument();
    expect(runPostingAction).not.toHaveBeenCalled();
  });

  it('keeps the saved plan on screen when a rerun fails', async () => {
    getPostingAiResults.mockResolvedValue([SAVED]);
    runPostingAction.mockRejectedValueOnce(failing('Claude Code is not signed in (x). Open a terminal, run "claude", finish signing in, then try again.', 'login'));
    render(<ResumeTailor posting={POSTING} cli={cli()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Tailor again' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/not signed in/);
    expect(screen.getByText('Picked for this job')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Tailor again' })).toBeEnabled());
  });

  it('is offered by the AI section, after the actions that came before it', () => {
    expect(ACTIONS[ACTIONS.length - 1]).toBe(ResumeTailor);
  });

  // Three saved actions on one posting should not bury the page under three
  // full results: a saved plan opens collapsed to a line naming whether
  // anything needs checking, and only shows the rest once clicked.
  it('collapses the saved plan to one line until it is opened', async () => {
    getPostingAiResults.mockResolvedValue([SAVED]);
    render(<ResumeTailor posting={POSTING} cli={cli()} />);
    const line = await screen.findByText('Tailored today, nothing flagged');
    expect(screen.getByText('Picked for this job')).not.toBeVisible();
    fireEvent.click(line);
    expect(screen.getByText('Picked for this job')).toBeVisible();
  });

  it('names how many things need checking in the collapsed line', async () => {
    getPostingAiResults.mockResolvedValue([{
      ...SAVED,
      result: { ...RESULT, factCheck: { flags: [{ type: 'number', value: '9', context: 'x' }], ok: false } },
    }]);
    render(<ResumeTailor posting={POSTING} cli={cli()} />);
    expect(await screen.findByText('Tailored today, 1 to check')).toBeInTheDocument();
  });

  it('opens a fresh plan automatically, since the person just asked to see it', async () => {
    render(<ResumeTailor posting={POSTING} cli={cli()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Tailor my resume for this job' }));
    expect(await screen.findByText('Check these before using it')).toBeInTheDocument();
  });

  it('refines the plan with the typed instruction', async () => {
    getPostingAiResults.mockResolvedValue([SAVED]);
    render(<ResumeTailor posting={POSTING} cli={cli()} />);
    fireEvent.click(await screen.findByText('Tailored today, nothing flagged'));
    fireEvent.change(screen.getByPlaceholderText('What should change?'), { target: { value: 'lead with the Bosch project' } });
    fireEvent.click(screen.getByRole('button', { name: 'Refine' }));
    expect(runPostingAction).toHaveBeenCalledWith('p1', 'resume-tailor', { onEvent: expect.any(Function), instruction: 'lead with the Bosch project' });
    await waitFor(() => expect(screen.getByText('Check these before using it')).toBeInTheDocument());
  });

  it('opens the resume builder, seeded with the shown plan, and closes again', async () => {
    getPostingAiResults.mockResolvedValue([SAVED]);
    render(<ResumeTailor posting={POSTING} cli={cli()} />);
    fireEvent.click(await screen.findByText('Tailored today, nothing flagged'));
    fireEvent.click(screen.getByRole('button', { name: 'Open in the resume builder' }));
    expect(await screen.findByText('Backend Engineer')).toBeInTheDocument();
    await waitFor(() => expect(getResumePdf).toHaveBeenCalledWith(expect.objectContaining({ plan: RESULT })));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByText('Resume builder, tailored for Backend Engineer')).not.toBeInTheDocument();
  });
});
