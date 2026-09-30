import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act, within } from '@testing-library/react';
import SettingsView from './SettingsView.jsx';

const CLIS = [
  { id: 'claude', label: 'Claude Code', policies: ['none', 'web'], present: true, runs: true, version: '2.1.245', error: null },
  { id: 'agy', label: 'Antigravity', policies: ['none', 'web'], present: false, runs: false, version: null, error: null },
];

// Ollama with two models, the way the providers endpoint lists it.
const OLLAMA = {
  id: 'ollama', label: 'Ollama', policies: ['none'], present: true, runs: true, version: '0.32.12', error: null,
  models: [{ name: 'llama3.2:3b', size: 2019393189, contextLength: 131072 }, { name: 'qwen3:8b', size: 5225388164, contextLength: 40960 }],
};

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
  it('renders the three cards in order: AI CLI, Appearance, Your data', async () => {
    await mount();
    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual(['AI CLI', 'Appearance', 'Your data']);
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

describe('SettingsView with Ollama', () => {
  beforeEach(() => getProviders.mockResolvedValue([...CLIS, OLLAMA]));

  it('says the AI can run on a subscription or on this computer', async () => {
    await mount();
    expect(screen.getByText(/on your own subscription or your own computer/)).toBeInTheDocument();
  });

  it('lists Ollama beside the CLIs and names it as unable to search the web', async () => {
    await mount();
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Ollama' })).toBeInTheDocument());
    expect(screen.getByText(/which Claude Code and Antigravity can both do\. Ollama cannot\./)).toBeInTheDocument();
  });

  it('offers its installed models, the first picked until one is saved', async () => {
    await mount();
    const group = await screen.findByRole('radiogroup', { name: 'Ollama model' });
    expect(within(group).getByRole('radio', { name: 'llama3.2:3b, 2.0 GB' })).toHaveAttribute('aria-checked', 'true');
    expect(within(group).getByRole('radio', { name: 'qwen3:8b, 5.2 GB' })).toHaveAttribute('aria-checked', 'false');
  });

  it('shows the saved model once it loads', async () => {
    getProviderPreference.mockResolvedValueOnce({ provider: 'ollama', ollamaModel: 'qwen3:8b' });
    await mount();
    await waitFor(() => expect(screen.getByRole('radio', { name: 'qwen3:8b, 5.2 GB' })).toHaveAttribute('aria-checked', 'true'));
    expect(screen.getByRole('radio', { name: 'Ollama' })).toHaveAttribute('aria-checked', 'true');
  });

  // Like the provider, a model pick is the save, and names only itself.
  it('saves a model as soon as it is picked, and says so', async () => {
    await mount();
    await act(async () => fireEvent.click(await screen.findByRole('radio', { name: 'qwen3:8b, 5.2 GB' })));
    expect(putProviderPreference).toHaveBeenCalledWith({ ollamaModel: 'qwen3:8b' });
    expect(screen.getByRole('radio', { name: 'qwen3:8b, 5.2 GB' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('Saved')).toBeInTheDocument();
  });

  it('puts the old model back when the save fails', async () => {
    putProviderPreference.mockRejectedValueOnce(new Error('Ollama has no model called "qwen3:8b" on this computer.'));
    await mount();
    await act(async () => fireEvent.click(await screen.findByRole('radio', { name: 'qwen3:8b, 5.2 GB' })));
    expect(screen.getByRole('radio', { name: 'llama3.2:3b, 2.0 GB' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('Not saved')).toBeInTheDocument();
  });

  it('offers no model picker while Ollama has nothing to run', async () => {
    getProviders.mockResolvedValue([...CLIS, { ...OLLAMA, runs: false, models: [], error: 'Ollama has no models yet: run "ollama pull llama3.2" in a terminal, then check again.' }]);
    await mount();
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Ollama' })).toHaveAccessibleDescription(/no models yet/));
    expect(screen.queryByRole('radiogroup', { name: 'Ollama model' })).not.toBeInTheDocument();
  });
});
