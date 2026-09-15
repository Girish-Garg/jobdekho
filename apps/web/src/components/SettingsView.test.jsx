import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import SettingsView from './SettingsView.jsx';

vi.mock('../api.js', () => ({
  getFilters: vi.fn(async () => ({ includeKeywords: ['react'], excludeKeywords: [], locations: [] })),
  getNotifications: vi.fn(async () => ({ channel: 'none', telegramChatId: null, enabled: true })),
  putNotifications: vi.fn(async () => null),
  getProviders: vi.fn(async () => [
    { id: 'claude', label: 'Claude Code', policies: ['none', 'web'], present: true, runs: true, version: '2.1.245', error: null },
    { id: 'agy', label: 'Antigravity', policies: ['none'], present: false, runs: false, version: null, error: null },
  ]),
  getProviderPreference: vi.fn(async () => ({ provider: 'auto' })),
  putProviderPreference: vi.fn(async () => null),
}));

vi.mock('../lib/savedFilters.js', () => ({ mergeSave: vi.fn(async () => null) }));

import {
  getFilters, getNotifications, putNotifications, getProviders, getProviderPreference, putProviderPreference,
} from '../api.js';
import { mergeSave } from '../lib/savedFilters.js';

beforeEach(() => vi.clearAllMocks());

async function mount() {
  await act(async () => {
    render(<SettingsView />);
  });
}

describe('SettingsView structure', () => {
  it('renders the four sections in order: Appearance, AI CLI, Alerts, Alert keywords', async () => {
    await mount();
    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual(['Appearance', 'AI CLI', 'Alerts', 'Alert keywords']);
  });

  it('puts the theme choice under Appearance', async () => {
    await mount();
    expect(screen.getByRole('radiogroup', { name: 'Theme' })).toBeInTheDocument();
  });

  it('keeps the keyword lists collapsed behind a disclosure, not at full height', async () => {
    await mount();
    await waitFor(() => expect(getFilters).toHaveBeenCalled());
    const summary = screen.getByText('1 keyword set');
    expect(summary.closest('details')).not.toHaveAttribute('open');
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

describe('SettingsView Alerts section', () => {
  it('saves notification prefs through its own save bar', async () => {
    await mount();
    await waitFor(() => expect(getNotifications).toHaveBeenCalled());
    const saveButtons = screen.getAllByRole('button', { name: 'Save changes' });
    await act(async () => fireEvent.click(saveButtons[1]));
    expect(putNotifications).toHaveBeenCalledWith({ channel: 'none', telegramChatId: null, enabled: true });
  });
});

describe('SettingsView Alert keywords section', () => {
  it('saves only the keyword fields through mergeSave', async () => {
    await mount();
    await waitFor(() => expect(getFilters).toHaveBeenCalled());
    const saveButtons = screen.getAllByRole('button', { name: 'Save changes' });
    await act(async () => fireEvent.click(saveButtons[2]));
    expect(mergeSave).toHaveBeenCalledWith({ includeKeywords: ['react'], excludeKeywords: [], locations: [] });
  });

  it('confirms the save the same way every other section does', async () => {
    await mount();
    await waitFor(() => expect(getFilters).toHaveBeenCalled());
    const saveButtons = screen.getAllByRole('button', { name: 'Save changes' });
    await act(async () => fireEvent.click(saveButtons[2]));
    expect(await screen.findAllByText('Saved')).not.toHaveLength(0);
  });
});
