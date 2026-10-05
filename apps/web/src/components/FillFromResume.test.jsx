import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import FillFromResume from './FillFromResume.jsx';

vi.mock('../api.js', () => ({
  getProviders: vi.fn(async () => [CLAUDE]),
  extractProfile: vi.fn(async () => FOUND),
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

const EMPTY = { skills: [], titles: [], locations: [], years: null, degree: 'none', resumeName: 'cv.pdf', basics: { name: '' } };
const EDITED = { ...EMPTY, skills: ['react'] };
const FOUND = { ranking: { skills: ['node'] }, basics: {}, proposed: { experience: [{ title: 'Engineer' }] } };
const REVIEW = { mode: 'smart', rows: [{ id: 'a' }, { id: 'b' }], same: [] };

const NOT_FOUND = 'Claude Code is not installed, or is not on the PATH JobDekho was started with. '
  + 'Install it from https://claude.ai/code, then restart JobDekho.';
const LOGIN = 'Claude Code is not signed in (Not logged in). '
  + 'Open a terminal, run "claude", finish signing in, then try again.';

const failing = (message, kind) => Object.assign(new Error(message), { kind });
const button = () => screen.getByRole('button', { name: 'Fill in from resume' });
const fill = async () => fireEvent.click(await screen.findByRole('button', { name: 'Fill in from resume' }));

beforeEach(() => {
  vi.clearAllMocks();
  getProviders.mockResolvedValue([CLAUDE]);
  extractProfile.mockResolvedValue(FOUND);
});

describe('FillFromResume when no CLI can answer', () => {
  it('shows the install hint instead of a button that can only fail', async () => {
    getProviders.mockResolvedValue([MISSING]);
    render(<FillFromResume profile={EMPTY} onFound={() => REVIEW} />);
    expect(await screen.findByRole('link', { name: 'https://claude.ai/code' })).toHaveAttribute('href', 'https://claude.ai/code');
    expect(screen.getByText(/install claude code from/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Fill in from resume' })).not.toBeInTheDocument();
  });

  it('lists both CLIs with their links when neither is installed, since either can read a resume', async () => {
    getProviders.mockResolvedValue([MISSING, { ...AGY, present: false, path: null, runs: false, version: null }]);
    render(<FillFromResume profile={EMPTY} onFound={() => REVIEW} />);
    expect(await screen.findByRole('link', { name: 'https://antigravity.google' })).toHaveAttribute('href', 'https://antigravity.google');
    expect(screen.getByRole('link', { name: 'https://claude.ai/code' }).closest('p'))
      .toHaveTextContent(/Install Claude Code from https:\/\/claude\.ai\/code or Antigravity from https:\/\/antigravity\.google, then check again/);
  });

  it('re-probes on request and switches to the button once the CLI is found', async () => {
    getProviders.mockResolvedValueOnce([MISSING]);
    render(<FillFromResume profile={EMPTY} onFound={() => REVIEW} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Check again' }));
    await waitFor(() => expect(getProviders).toHaveBeenLastCalledWith({ refresh: true }));
    expect(await screen.findByRole('button', { name: 'Fill in from resume' })).toBeInTheDocument();
  });

  it('shows the server sentence for a CLI that is installed but will not run', async () => {
    getProviders.mockResolvedValue([BROKEN]);
    render(<FillFromResume profile={EMPTY} onFound={() => REVIEW} />);
    expect(await screen.findByText(BROKEN.error)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Check again' })).toBeInTheDocument();
  });

  it('says so when the check itself fails, and still offers the re-check', async () => {
    getProviders.mockRejectedValueOnce(new Error('GET /api/ai/providers -> 500'));
    render(<FillFromResume profile={EMPTY} onFound={() => REVIEW} />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not check/i);
  });
});

describe('FillFromResume, choosing how', () => {
  it('runs at once on a profile with nothing the two ways would treat apart, as Smart add', async () => {
    const onFound = vi.fn(() => REVIEW);
    render(<FillFromResume profile={EMPTY} onFound={onFound} />);
    await fill();
    await waitFor(() => expect(onFound).toHaveBeenCalledWith(FOUND, 'smart'));
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });

  it('asks how first on a profile that holds something, Smart add picked and recommended', async () => {
    render(<FillFromResume profile={EDITED} onFound={() => REVIEW} />);
    await fill();
    expect(extractProfile).not.toHaveBeenCalled();
    expect(screen.getByText('Fill in from this resume')).toBeInTheDocument();
    const smart = screen.getByRole('radio', { name: /Smart add/ });
    expect(smart).toBeChecked();
    expect(smart.closest('label')).toHaveTextContent('Smart addRecommendedAdds what is new, updates what the resume has newer, and skips what you already have.');
    expect(screen.getByRole('radio', { name: /Overwrite/ }).closest('label')).toHaveTextContent("Your sections become the resume's. Anything not on it is removed.");
    expect(screen.getByRole('button', { name: 'Read the resume' })).toHaveClass('btn', 'btn-tint', 'w-full');
    expect(screen.getByText('You see every change before anything is saved')).toBeInTheDocument();
    // About the profile, not about which AI reads it.
    expect(screen.queryByText(/Claude Code|Antigravity|Ollama/)).not.toBeInTheDocument();
  });

  it('reads the resume the way picked', async () => {
    const onFound = vi.fn(() => REVIEW);
    render(<FillFromResume profile={EDITED} onFound={onFound} />);
    await fill();
    fireEvent.click(screen.getByRole('radio', { name: /Overwrite/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Read the resume' }));
    await waitFor(() => expect(onFound).toHaveBeenCalledWith(FOUND, 'overwrite'));
  });

  it('treats a stated years or degree as something the two ways treat apart', async () => {
    render(<FillFromResume profile={{ ...EMPTY, years: 0 }} onFound={() => REVIEW} />);
    await fill();
    expect(screen.getByRole('radio', { name: /Smart add/ })).toBeInTheDocument();
  });

  it('goes back to the button without asking the server, and opens on Smart add again', async () => {
    render(<FillFromResume profile={EDITED} onFound={() => REVIEW} />);
    await fill();
    fireEvent.click(screen.getByRole('radio', { name: /Overwrite/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(extractProfile).not.toHaveBeenCalled();
    fireEvent.click(button());
    expect(screen.getByRole('radio', { name: /Smart add/ })).toBeChecked();
  });
});

describe('FillFromResume while it reads', () => {
  it('ticks off its steps from the call events, naming the CLI, with a Stop while it reads', async () => {
    let finish;
    extractProfile.mockImplementationOnce(async ({ onEvent }) => {
      onEvent({ event: 'start', provider: 'claude', path: 'C:\\npm\\claude.cmd' });
      onEvent({ event: 'progress', stage: 'send', chars: 1200 });
      onEvent({ event: 'progress', stage: 'wait', elapsedMs: 5000 });
      await new Promise((resolve) => { finish = resolve; });
      return FOUND;
    });
    render(<FillFromResume profile={EMPTY} reviewing onFound={() => REVIEW} />);
    await fill();

    expect(await screen.findByText('Handed to Claude Code')).toBeInTheDocument();
    expect(screen.getByText('Reading your resume')).toBeInTheDocument();
    const steps = within(screen.getByRole('list', { name: 'Progress' }));
    expect(steps.getByText('Finding roles, projects and skills').closest('li')).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText('Usually 20 to 40 seconds')).toBeInTheDocument();
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['Stop']);

    finish();
    await waitFor(() => expect(steps.getByText('Ready for you to review').closest('li')).not.toHaveAttribute('aria-current'));
    expect(steps.queryByText(/\d+s$/)).not.toBeInTheDocument();
    const said = await screen.findByText('Found 2 changes to review.', {}, { timeout: 2000 });
    expect(said).toHaveAttribute('aria-live', 'polite');
    expect(button()).toBeEnabled();
  });

  it('says when the resume would change nothing, with no review to wait for', async () => {
    render(<FillFromResume profile={EMPTY} onFound={() => ({ mode: 'smart', rows: [], same: [] })} />);
    await fill();
    expect(await screen.findByText('Nothing to change. Your profile already has what this resume says.', {}, { timeout: 2000 })).toBeInTheDocument();
  });

  it('says nothing about a review that has since been applied or discarded', async () => {
    render(<FillFromResume profile={EMPTY} reviewing={false} onFound={() => REVIEW} />);
    await fill();
    await screen.findByRole('button', { name: 'Fill in from resume' }, { timeout: 2000 });
    expect(screen.queryByText(/changes to review/)).not.toBeInTheDocument();
  });
});

// A Stop drops the request, which is what stops the CLI on the server; the
// call then rejects as stopped (see lib/aiCall.js), the way it does here.
const stoppable = () => extractProfile.mockImplementationOnce(({ signal }) => new Promise((resolve, reject) => {
  signal.addEventListener('abort', () => reject(Object.assign(new Error('Stopped.'), { kind: 'stopped' })));
}));

describe('FillFromResume stopped', () => {
  it('aborts the read and goes back to its button, saying nothing was changed', async () => {
    stoppable();
    const onFound = vi.fn(() => REVIEW);
    render(<FillFromResume profile={EMPTY} onFound={onFound} />);
    await fill();
    const { signal } = extractProfile.mock.calls[0][0];
    fireEvent.click(await screen.findByRole('button', { name: 'Stop' }));
    expect(signal.aborted).toBe(true);
    const said = await screen.findByText('Stopped. Nothing was changed.');
    expect(said).toHaveAttribute('aria-live', 'polite');
    expect(button()).toBeEnabled();
    expect(onFound).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('stops the read when the card goes away mid-run', async () => {
    stoppable();
    const { unmount } = render(<FillFromResume profile={EMPTY} onFound={() => REVIEW} />);
    await fill();
    const { signal } = extractProfile.mock.calls[0][0];
    unmount();
    expect(signal.aborted).toBe(true);
  });
});

describe('FillFromResume when the read fails', () => {
  it('shows the server sentence verbatim and a re-check when the CLI went missing', async () => {
    extractProfile.mockRejectedValueOnce(failing(NOT_FOUND, 'not_found'));
    render(<FillFromResume profile={EMPTY} onFound={() => REVIEW} />);
    await fill();
    expect(await screen.findByRole('alert')).toHaveTextContent(NOT_FOUND);
    expect(button()).toBeEnabled();
    getProviders.mockResolvedValueOnce([MISSING]);
    fireEvent.click(screen.getByRole('button', { name: 'Check again' }));
    expect(await screen.findByText(/install claude code from/i)).toBeInTheDocument();
  });

  it('shows a sign-in failure verbatim with no re-check, and clears it when a new run starts', async () => {
    extractProfile.mockRejectedValueOnce(failing(LOGIN, 'login'));
    render(<FillFromResume profile={EMPTY} onFound={() => REVIEW} />);
    await fill();
    expect(await screen.findByRole('alert')).toHaveTextContent(LOGIN);
    expect(screen.queryByRole('button', { name: 'Check again' })).not.toBeInTheDocument();
    fireEvent.click(button());
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  it('names Antigravity, under the button, when it is the CLI that will read the resume', async () => {
    getProviders.mockResolvedValue([MISSING, AGY]);
    render(<FillFromResume profile={EMPTY} onFound={() => REVIEW} />);
    await screen.findByRole('button', { name: 'Fill in from resume' });
    expect(screen.getByText('Uses the AI on this computer, about 20 seconds')).toHaveAttribute('title', 'Runs on Antigravity');
    expect(getProviders).toHaveBeenCalledWith({ refresh: false });
  });
});
