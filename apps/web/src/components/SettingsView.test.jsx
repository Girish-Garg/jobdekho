import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act, within } from '@testing-library/react';
import SettingsView from './SettingsView.jsx';

vi.mock('../api.js', () => ({
  getProviders: vi.fn(async () => [
    { id: 'claude', label: 'Claude Code', policies: ['none', 'web'], present: true, runs: true, version: '2.1.245', error: null },
    { id: 'agy', label: 'Antigravity', policies: ['none', 'web'], present: false, runs: false, version: null, error: null },
  ]),
  getProviderPreference: vi.fn(async () => ({ provider: 'auto' })),
  putProviderPreference: vi.fn(async () => null),
}));

import { getProviders, getProviderPreference, putProviderPreference } from '../api.js';

beforeEach(() => vi.clearAllMocks());

async function mount() {
  await act(async () => {
    render(<SettingsView />);
  });
}

describe('SettingsView structure', () => {
  it('renders the three cards in order: Appearance, AI CLI, Your data', async () => {
    await mount();
    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual(['Appearance', 'AI CLI', 'Your data']);
  });

  it('puts the theme choice under Appearance', async () => {
    await mount();
    expect(within(screen.getByRole('region', { name: 'Appearance' })).getByRole('radiogroup', { name: 'Theme' })).toBeInTheDocument();
  });
});

describe('SettingsView AI CLI section', () => {
  it('loads the detected providers and the saved preference', async () => {
    await mount();
    await waitFor(() => expect(getProviders).toHaveBeenCalled());
    expect(getProviderPreference).toHaveBeenCalled();
    expect(screen.getByRole('radio', { name: 'Claude Code' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Whichever is available' })).toHaveAttribute('aria-checked', 'true');
  });

  it('shows the saved pick once it loads', async () => {
    getProviderPreference.mockResolvedValueOnce({ provider: 'agy' });
    await mount();
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Antigravity' })).toHaveAttribute('aria-checked', 'true'));
  });

  // Like the theme, a pick is the save: no second button to find.
  it('saves a pick as soon as it is made, and says so', async () => {
    await mount();
    await waitFor(() => expect(getProviders).toHaveBeenCalled());
    await act(async () => fireEvent.click(screen.getByRole('radio', { name: 'Claude Code' })));
    expect(putProviderPreference).toHaveBeenCalledWith({ provider: 'claude' });
    expect(screen.getByRole('radio', { name: 'Claude Code' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('Saved')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();
  });

  it('puts the old pick back when the save fails', async () => {
    putProviderPreference.mockRejectedValueOnce(new Error('disk full'));
    await mount();
    await waitFor(() => expect(getProviders).toHaveBeenCalled());
    await act(async () => fireEvent.click(screen.getByRole('radio', { name: 'Claude Code' })));
    expect(screen.getByRole('radio', { name: 'Whichever is available' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('Not saved')).toBeInTheDocument();
  });

  it('does not save the pick that is already on', async () => {
    await mount();
    await waitFor(() => expect(getProviders).toHaveBeenCalled());
    await act(async () => fireEvent.click(screen.getByRole('radio', { name: 'Whichever is available' })));
    expect(putProviderPreference).not.toHaveBeenCalled();
  });

  it('says which CLIs can run the web check', async () => {
    await mount();
    await waitFor(() => expect(screen.getByText(/searches the web, which Claude Code and Antigravity can both do/)).toBeInTheDocument());
  });
});
