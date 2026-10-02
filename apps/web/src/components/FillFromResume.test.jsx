import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FillFromResume from './FillFromResume.jsx';

vi.mock('../api.js', () => ({
  getProviders: vi.fn(async () => [CLAUDE]),
  extractProfile: vi.fn(async () => FILLED),
}));

import { getProviders, extractProfile } from '../api.js';

const CLAUDE = {
  id: 'claude', label: 'Claude Code', install: 'https://claude.ai/code', policies: ['none', 'web'],
  present: true, path: 'C:\\npm\\claude.cmd', runs: true, version: '1.0.0', error: null,
};
const MISSING = { ...CLAUDE, present: false, path: null, runs: false, version: null };
const AGY = {
  id: 'agy', label: 'Antigravity', install: 'https://antigravity.google', policies: ['none', 'web'],
  present: true, path: 'C:\\agy\\bin\\agy.exe', runs: true, version: '1.1.22', error: null,
};
const BROKEN = {
  ...CLAUDE, runs: false, version: null,
  error: 'Claude Code is installed at C:\\npm\\claude.cmd but could not run: exited with code 1',
};

const EMPTY = { skills: [], titles: [], locations: [], years: null, degree: 'none', resumeName: 'cv.pdf' };
const EDITED = { ...EMPTY, skills: ['react'] };
const FILLED = { ...EMPTY, skills: ['node'], titles: ['backend engineer'], years: 2 };

const NOT_FOUND = 'Claude Code is not installed, or is not on the PATH JobDekho was started with. '
  + 'Install it from https://claude.ai/code, then restart JobDekho.';
const LOGIN = 'Claude Code is not signed in (Not logged in). '
  + 'Open a terminal, run "claude", finish signing in, then try again.';

const failing = (message, kind) => Object.assign(new Error(message), { kind });
const button = () => screen.getByRole('button', { name: 'Fill in from resume' });

beforeEach(() => {
  vi.clearAllMocks();
  getProviders.mockResolvedValue([CLAUDE]);
  extractProfile.mockResolvedValue(FILLED);
});

describe('FillFromResume when no CLI can answer', () => {
  it('shows the install hint instead of a button that can only fail', async () => {
    getProviders.mockResolvedValue([MISSING]);
    render(<FillFromResume profile={EMPTY} onFilled={() => {}} />);
    expect(await screen.findByRole('link', { name: 'https://claude.ai/code' })).toHaveAttribute('href', 'https://claude.ai/code');
    expect(screen.getByText(/install claude code from/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Fill in from resume' })).not.toBeInTheDocument();
  });

  it('lists both CLIs with their links when neither is installed, since either can read a resume', async () => {
    getProviders.mockResolvedValue([MISSING, { ...AGY, present: false, path: null, runs: false, version: null }]);
    render(<FillFromResume profile={EMPTY} onFilled={() => {}} />);
    expect(await screen.findByRole('link', { name: 'https://antigravity.google' })).toHaveAttribute('href', 'https://antigravity.google');
    expect(screen.getByRole('link', { name: 'https://claude.ai/code' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'https://claude.ai/code' }).closest('p'))
      .toHaveTextContent(/Install Claude Code from https:\/\/claude\.ai\/code or Antigravity from https:\/\/antigravity\.google, then check again/);
    expect(screen.queryByText(/would not help/)).not.toBeInTheDocument();
  });

  it('re-probes on request and switches to the button once the CLI is found', async () => {
    getProviders.mockResolvedValueOnce([MISSING]);
    render(<FillFromResume profile={EMPTY} onFilled={() => {}} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Check again' }));
    await waitFor(() => expect(getProviders).toHaveBeenLastCalledWith({ refresh: true }));
    expect(await screen.findByRole('button', { name: 'Fill in from resume' })).toBeInTheDocument();
  });

  it('shows the server sentence for a CLI that is installed but will not run', async () => {
    getProviders.mockResolvedValue([BROKEN]);
    render(<FillFromResume profile={EMPTY} onFilled={() => {}} />);
    expect(await screen.findByText(BROKEN.error)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Check again' })).toBeInTheDocument();
  });

  it('says so when the check itself fails, and still offers the re-check', async () => {
    getProviders.mockRejectedValueOnce(new Error('GET /api/ai/providers -> 500'));
    render(<FillFromResume profile={EMPTY} onFilled={() => {}} />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not check/i);
    expect(screen.getByRole('button', { name: 'Check again' })).toBeInTheDocument();
  });
});

describe('FillFromResume with a CLI ready', () => {
  // The copy names the CLI the server will pick (ai/select.js): Claude Code
  // when it is there, else Antigravity, which can read a resume with no tools.
  it('names Antigravity when it is the CLI that will read the resume', async () => {
    getProviders.mockResolvedValue([MISSING, AGY]);
    render(<FillFromResume profile={EMPTY} onFilled={() => {}} />);
    await screen.findByRole('button', { name: 'Fill in from resume' });
    expect(screen.getByText('Uses the AI on this computer, about 20 seconds')).toHaveAttribute('title', 'Runs on Antigravity');
  });

  it('asks the server on first load without forcing a re-probe', async () => {
    render(<FillFromResume profile={EMPTY} onFilled={() => {}} />);
    await screen.findByRole('button', { name: 'Fill in from resume' });
    expect(getProviders).toHaveBeenCalledWith({ refresh: false });
  });

  it('button uses shared btn classes for styling', async () => {
    render(<FillFromResume profile={EMPTY} onFilled={() => {}} />);
    const btn = await screen.findByRole('button', { name: 'Fill in from resume' });
    expect(btn).toHaveClass('btn', 'btn-tint');
  });

  it('runs straight away on an empty profile and hands the saved profile up', async () => {
    const onFilled = vi.fn();
    render(<FillFromResume profile={EMPTY} onFilled={onFilled} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Fill in from resume' }));
    await waitFor(() => expect(onFilled).toHaveBeenCalledWith(FILLED));
    expect(await screen.findByText(/filled in\. check the fields/i)).toBeInTheDocument();
  });

  it('says what the resume gave once it is done, section by section', async () => {
    extractProfile.mockResolvedValueOnce({
      ...FILLED,
      proposed: {
        experience: [], projects: [{ title: 'Chess Engine' }], education: [],
        certifications: [{ title: 'Cloud Practitioner' }, { title: 'Data Engineer' }], achievements: [{ title: 'First place' }], skillGroups: [],
      },
      filledBasics: ['email', 'links.github'],
    });
    render(<FillFromResume profile={EMPTY} onFilled={() => {}} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Fill in from resume' }));
    const said = await screen.findByText(/^Filled in\. Found/);
    expect(said).toHaveTextContent(
      'Filled in. Found 1 project, 2 certifications and 1 achievement to review. Added your email and GitHub. Check the fields, then save.',
    );
    expect(said).toHaveAttribute('aria-live', 'polite');
  });

  it('warns before overwriting a profile that already has fields', async () => {
    const onFilled = vi.fn();
    render(<FillFromResume profile={EDITED} onFilled={onFilled} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Fill in from resume' }));
    expect(extractProfile).not.toHaveBeenCalled();
    expect(screen.getByText(/skills, titles, locations, years and degree/)).toBeInTheDocument();
    expect(screen.getByText(/corrected by hand.*overwritten/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Overwrite and fill in' }));
    await waitFor(() => expect(onFilled).toHaveBeenCalledWith(FILLED));
  });

  it('treats a stated years or degree as a field worth warning about', async () => {
    render(<FillFromResume profile={{ ...EMPTY, years: 0 }} onFilled={() => {}} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Fill in from resume' }));
    expect(screen.getByRole('button', { name: 'Keep my edits' })).toBeInTheDocument();
    expect(extractProfile).not.toHaveBeenCalled();
  });

  it('backs out of the warning without calling the server', async () => {
    render(<FillFromResume profile={EDITED} onFilled={() => {}} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Fill in from resume' }));
    fireEvent.click(screen.getByRole('button', { name: 'Keep my edits' }));
    expect(extractProfile).not.toHaveBeenCalled();
    expect(button()).toBeInTheDocument();
  });

  it('narrates which CLI is answering and the elapsed seconds while it thinks', async () => {
    let finish;
    extractProfile.mockImplementationOnce(async ({ onEvent }) => {
      onEvent({ event: 'start', provider: 'claude', path: 'C:\\npm\\claude.cmd' });
      onEvent({ event: 'progress', stage: 'send', chars: 1200 });
      onEvent({ event: 'progress', stage: 'wait', elapsedMs: 5000 });
      onEvent({ event: 'progress', stage: 'wait', elapsedMs: 10000 });
      await new Promise((r) => { finish = r; });
      onEvent({ event: 'progress', stage: 'reply', elapsedMs: 12000, chars: 200 });
      return FILLED;
    });
    render(<FillFromResume profile={EMPTY} onFilled={() => {}} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Fill in from resume' }));

    const live = await screen.findByText('Claude Code is reading... 10s');
    expect(live).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByRole('button', { name: 'Filling in...' })).toBeDisabled();

    finish();
    expect(await screen.findByText(/filled in\. check the fields/i)).toBeInTheDocument();
    expect(button()).toBeEnabled();
  });

  it('shows the server sentence verbatim and a re-check when the CLI went missing', async () => {
    extractProfile.mockRejectedValueOnce(failing(NOT_FOUND, 'not_found'));
    render(<FillFromResume profile={EMPTY} onFilled={() => {}} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Fill in from resume' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(NOT_FOUND);
    expect(button()).toBeEnabled();

    getProviders.mockResolvedValueOnce([MISSING]);
    fireEvent.click(screen.getByRole('button', { name: 'Check again' }));
    await waitFor(() => expect(getProviders).toHaveBeenLastCalledWith({ refresh: true }));
    expect(await screen.findByText(/install claude code from/i)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows a sign-in failure verbatim with no re-check, since the sentence says what to do', async () => {
    extractProfile.mockRejectedValueOnce(failing(LOGIN, 'login'));
    render(<FillFromResume profile={EMPTY} onFilled={() => {}} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Fill in from resume' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(LOGIN);
    expect(screen.queryByRole('button', { name: 'Check again' })).not.toBeInTheDocument();
  });

  it('clears the last failure when a new run starts', async () => {
    extractProfile.mockRejectedValueOnce(failing(LOGIN, 'login'));
    render(<FillFromResume profile={EMPTY} onFilled={() => {}} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Fill in from resume' }));
    await screen.findByRole('alert');
    fireEvent.click(button());
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });
});
