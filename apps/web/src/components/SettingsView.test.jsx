import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
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
  it('renders the two sections in order: Appearance, AI CLI', async () => {
    await mount();
    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual(['Appearance', 'AI CLI']);
  });

  it('puts the theme choice under Appearance', async () => {
    await mount();
    expect(screen.getByRole('radiogroup', { name: 'Theme' })).toBeInTheDocument();
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

  it('saves the picked provider through the AI CLI save bar', async () => {
    await mount();
    await waitFor(() => expect(getProviders).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('radio', { name: 'Claude Code' }));
    const saveButtons = screen.getAllByRole('button', { name: 'Save changes' });
    await act(async () => fireEvent.click(saveButtons[0]));
    expect(putProviderPreference).toHaveBeenCalledWith({ provider: 'claude' });
  });
});
