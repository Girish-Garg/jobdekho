import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Toast from './Toast.jsx';
import * as api from '../api.js';

const NOTICE = {
  id: 1, title: 'Cover letter', detail: 'Claude Code is not signed in.', kind: 'error', action: null, count: 1,
};

afterEach(() => vi.restoreAllMocks());

describe('Toast', () => {
  it('shows the title and detail, as an alert, for an error', () => {
    render(<Toast notice={NOTICE} onDismiss={() => {}} />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Cover letter');
    expect(alert).toHaveTextContent('Claude Code is not signed in.');
  });

  it('reads as a status, not an alert, once the kind is done', () => {
    render(<Toast notice={{ ...NOTICE, kind: 'done', action: null }} onDismiss={() => {}} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('follows its link, which also dismisses it, since following it is reading it', () => {
    const onDismiss = vi.fn();
    const onClick = vi.fn();
    render(<Toast notice={{ ...NOTICE, kind: 'done', title: 'AlphaCo · Is it real? is ready', detail: '', link: { label: 'Open the chat', onClick } }} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open the chat' }));
    expect(onClick).toHaveBeenCalled();
    expect(onDismiss).toHaveBeenCalledWith(1);
  });

  it('dismisses with the notice\'s own id', () => {
    const onDismiss = vi.fn();
    render(<Toast notice={NOTICE} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onDismiss).toHaveBeenCalledWith(1);
  });

  it('names how many times a repeat has landed', () => {
    render(<Toast notice={{ ...NOTICE, count: 3 }} onDismiss={() => {}} />);
    expect(screen.getByText('(×3)')).toBeInTheDocument();
  });

  it('shows no repeat count for the first landing', () => {
    render(<Toast notice={NOTICE} onDismiss={() => {}} />);
    expect(screen.queryByText(/\(×/)).not.toBeInTheDocument();
  });

  it('offers no button for a kind with no button-shaped fix', () => {
    render(<Toast notice={{ ...NOTICE, action: 'timeout' }} onDismiss={() => {}} />);
    expect(screen.queryByRole('button', { name: /check again/i })).not.toBeInTheDocument();
  });

  it('offers a recheck for a missing CLI, and re-probes on click', async () => {
    vi.spyOn(api, 'getProviders').mockResolvedValue([{ id: 'claude', label: 'Claude Code', runs: true }]);
    render(<Toast notice={{ ...NOTICE, action: 'not_found' }} onDismiss={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Check again' }));
    expect(screen.getByRole('button', { name: 'Checking...' })).toBeDisabled();
    await waitFor(() => expect(api.getProviders).toHaveBeenCalledWith({ refresh: true }));
    expect(await screen.findByRole('button', { name: 'Check again' })).toBeEnabled();
  });

  it('offers the same recheck for a signed-out CLI', () => {
    render(<Toast notice={{ ...NOTICE, action: 'login' }} onDismiss={() => {}} />);
    expect(screen.getByRole('button', { name: 'Check again' })).toBeInTheDocument();
  });
});
