import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AiGate from './AiGate.jsx';

vi.mock('../api.js', () => ({ getProviders: vi.fn(async () => [CLAUDE]) }));

import { getProviders } from '../api.js';

const CLAUDE = {
  id: 'claude', label: 'Claude Code', install: 'https://claude.ai/code',
  present: true, path: 'C:\\npm\\claude.cmd', runs: true, version: '1.0.0', error: null,
};
const MISSING = { ...CLAUDE, present: false, path: null, runs: false, version: null };

const child = vi.fn((cli) => <p>ready: {cli.ready.label}</p>);

beforeEach(() => {
  vi.clearAllMocks();
  getProviders.mockResolvedValue([CLAUDE]);
});

describe('AiGate', () => {
  it('says it is looking, then renders the action with the CLI that will answer', async () => {
    render(<AiGate intro="x">{child}</AiGate>);
    expect(screen.getByText('Checking for an AI CLI...')).toBeInTheDocument();
    expect(await screen.findByText('ready: Claude Code')).toBeInTheDocument();
    expect(child).toHaveBeenLastCalledWith(expect.objectContaining({
      providers: [CLAUDE], ready: CLAUDE, checking: false, refresh: expect.any(Function),
    }));
    expect(getProviders).toHaveBeenCalledWith({ refresh: false });
  });

  it('shows the install hint with the caller\'s intro instead of an action that can only fail', async () => {
    getProviders.mockResolvedValue([MISSING]);
    render(<AiGate intro="Checking a job asks an AI CLI on this computer.">{child}</AiGate>);
    expect(await screen.findByText('Checking a job asks an AI CLI on this computer.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'https://claude.ai/code' })).toBeInTheDocument();
    expect(child).not.toHaveBeenCalled();
  });

  it('re-probes on request and lets the action through once the CLI is found', async () => {
    getProviders.mockResolvedValueOnce([MISSING]);
    render(<AiGate intro="x">{child}</AiGate>);
    fireEvent.click(await screen.findByRole('button', { name: 'Check again' }));
    await waitFor(() => expect(getProviders).toHaveBeenLastCalledWith({ refresh: true }));
    expect(await screen.findByText('ready: Claude Code')).toBeInTheDocument();
  });

  it('says so when the probe itself fails, and still offers the re-check', async () => {
    getProviders.mockRejectedValueOnce(new Error('GET /api/ai/providers -> 500'));
    render(<AiGate intro="x">{child}</AiGate>);
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not check/i);
    expect(screen.getByRole('button', { name: 'Check again' })).toBeInTheDocument();
  });
});
