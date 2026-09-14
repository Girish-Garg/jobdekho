import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AiGate from './AiGate.jsx';

vi.mock('../api.js', () => ({ getProviders: vi.fn(async () => [CLAUDE]) }));

import { getProviders } from '../api.js';

const CLAUDE = {
  id: 'claude', label: 'Claude Code', install: 'https://claude.ai/code', policies: ['none', 'web'],
  present: true, path: 'C:\\npm\\claude.cmd', runs: true, version: '1.0.0', error: null,
};
const AGY = {
  id: 'agy', label: 'Antigravity', install: 'https://antigravity.google', policies: ['none'],
  present: true, path: 'C:\\agy\\bin\\agy.exe', runs: true, version: '1.1.22', error: null,
};
const missing = (p) => ({ ...p, present: false, path: null, runs: false, version: null });
const POSTING = { id: 'p1' };

// One action per policy, each saying which CLI it was handed.
const Letter = vi.fn(({ cli }) => <p>letter via {cli.ready.label}</p>);
Letter.policy = 'none';
Letter.intro = 'Writing a letter asks an AI CLI.';
const Check = vi.fn(({ cli }) => <p>check via {cli.ready.label}</p>);
Check.policy = 'web';
Check.intro = 'Checking a job asks an AI CLI.';

beforeEach(() => {
  vi.clearAllMocks();
  getProviders.mockResolvedValue([CLAUDE]);
});

describe('AiGate', () => {
  it('says it is looking, then renders each action with the CLI that will answer it', async () => {
    getProviders.mockResolvedValue([CLAUDE, AGY]);
    render(<AiGate intro="x" posting={POSTING} actions={[Check, Letter]} />);
    expect(screen.getByText('Checking for an AI CLI...')).toBeInTheDocument();
    expect(await screen.findByText('check via Claude Code')).toBeInTheDocument();
    expect(screen.getByText('letter via Claude Code')).toBeInTheDocument();
    expect(Letter.mock.calls.at(-1)[0]).toEqual({
      posting: POSTING,
      cli: { providers: [CLAUDE, AGY], ready: CLAUDE, checking: false, refresh: expect.any(Function) },
    });
    expect(getProviders).toHaveBeenCalledWith({ refresh: false });
  });

  // The server would refuse the fake check on this machine (ai/select.js),
  // so the button is not offered; the hint in its place says what would work.
  it('hands a no-tools action to Antigravity and withholds the web action with its own hint when only Antigravity is installed', async () => {
    getProviders.mockResolvedValue([missing(CLAUDE), AGY]);
    render(<AiGate intro="x" posting={POSTING} actions={[Check, Letter]} />);
    expect(await screen.findByText('letter via Antigravity')).toBeInTheDocument();
    expect(Check).not.toHaveBeenCalled();
    expect(screen.getByText('Checking a job asks an AI CLI.')).toBeInTheDocument();
    expect(screen.getByText(/^Antigravity is installed, but this action needs a CLI that can browse/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'https://claude.ai/code' })).toBeInTheDocument();
    expect(screen.queryByText('x')).not.toBeInTheDocument();
  });

  it('shows one hint with the caller\'s intro, and both install links, when no CLI can take any action', async () => {
    getProviders.mockResolvedValue([missing(CLAUDE), missing(AGY)]);
    render(<AiGate intro="The actions here ask an AI CLI." posting={POSTING} actions={[Check, Letter]} />);
    expect(await screen.findByText('The actions here ask an AI CLI.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'https://claude.ai/code' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'https://antigravity.google' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Check again' })).toHaveLength(1);
    expect(Check).not.toHaveBeenCalled();
    expect(Letter).not.toHaveBeenCalled();
  });

  it('re-probes on request and lets the action through once the CLI is found', async () => {
    getProviders.mockResolvedValueOnce([missing(CLAUDE)]);
    render(<AiGate intro="x" posting={POSTING} actions={[Letter]} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Check again' }));
    await waitFor(() => expect(getProviders).toHaveBeenLastCalledWith({ refresh: true }));
    expect(await screen.findByText('letter via Claude Code')).toBeInTheDocument();
  });

  it('says so when the probe itself fails, and still offers the re-check', async () => {
    getProviders.mockRejectedValueOnce(new Error('GET /api/ai/providers -> 500'));
    render(<AiGate intro="x" posting={POSTING} actions={[Letter]} />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not check/i);
    expect(screen.getByRole('button', { name: 'Check again' })).toBeInTheDocument();
  });
});
