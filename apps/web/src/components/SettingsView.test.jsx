import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act, within } from '@testing-library/react';
import SettingsView from './SettingsView.jsx';

const CLAUDE_MODELS = [
  { id: 'default', label: 'Default' }, { id: 'fable', label: 'Fable' }, { id: 'opus', label: 'Opus' },
  { id: 'sonnet', label: 'Sonnet' }, { id: 'haiku', label: 'Haiku' },
];

const CLIS = [
  { id: 'claude', label: 'Claude Code', policies: ['none', 'web'], present: true, runs: true, version: '2.1.245', error: null, models: CLAUDE_MODELS },
  { id: 'agy', label: 'Antigravity', policies: ['none', 'web'], present: false, runs: false, version: null, error: null, models: [] },
];

// Ollama with two models, the way the providers endpoint lists it.
const OLLAMA = {
  id: 'ollama', label: 'Ollama', policies: ['none'], present: true, runs: true, version: '0.32.12', error: null, local: true, webHint: null,
  models: [
    { id: 'llama3.2:3b', label: 'llama3.2:3b', size: 2019393189, contextLength: 131072, tools: false },
    { id: 'qwen3:8b', label: 'qwen3:8b', size: 5225388164, contextLength: 40960, tools: true },
  ],
};

vi.mock('../api.js', () => ({
  getScrapeState: vi.fn(async () => ({ running: false, startedAt: null, finishedAt: null, done: 0, total: 0, lastRun: null })),
  startScrape: vi.fn(async () => ({ running: true, done: 0, total: 0 })),
  getScrapeSettings: vi.fn(async () => ({ autoRefresh: true })),
  putScrapeSettings: vi.fn(async () => null),
  getSetup: vi.fn(async () => []),
  getAdzunaKey: vi.fn(async () => ({ configured: false, from: null, appId: null, keyEnd: null, lastRun: null })),
  saveAdzunaKey: vi.fn(async () => null),
  removeAdzunaKey: vi.fn(async () => null),
  checkAdzunaKey: vi.fn(async () => ({ ok: true })),
  getBlockedCompanies: vi.fn(async () => []),
  unblockCompany: vi.fn(async () => null),
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
  it('renders the cards in order: the setup check and the AI, then postings and the companies blocked from them, appearance and data', async () => {
    await mount();
    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual(['Setup check', 'AI CLI', 'Postings', 'Blocked companies', 'Adzuna', 'Appearance', 'Your data']);
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
  const picked = () => getProviderPreference.mockResolvedValueOnce({ provider: 'ollama', models: {} });

  it('says the AI can run on a subscription or on this computer', async () => {
    await mount();
    expect(screen.getByText(/on your own subscription or your own computer/)).toBeInTheDocument();
  });

  it('lists Ollama beside the CLIs and names it as unable to search the web', async () => {
    await mount();
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Ollama' })).toBeInTheDocument());
    expect(screen.getByText(/which Claude Code and Antigravity can both do\. Ollama cannot\./)).toBeInTheDocument();
  });

  it('offers its installed models once it is picked, the first picked until one is saved', async () => {
    picked();
    await mount();
    const picker = await screen.findByRole('combobox', { name: 'Ollama model' });
    expect(picker).toHaveValue('llama3.2:3b');
    expect(within(picker).getAllByRole('option').map((o) => o.textContent)).toEqual(['llama3.2:3b, 2.0 GB', 'qwen3:8b, 5.2 GB']);
  });

  it('shows the saved model once it loads', async () => {
    getProviderPreference.mockResolvedValueOnce({ provider: 'ollama', models: { ollama: 'qwen3:8b' } });
    await mount();
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Ollama model' })).toHaveValue('qwen3:8b'));
    expect(screen.getByRole('radio', { name: 'Ollama' })).toHaveAttribute('aria-checked', 'true');
  });

  // Like the provider, a model pick is the save, and names only itself.
  it('saves a model as soon as it is picked, and says so', async () => {
    picked();
    await mount();
    await act(async () => fireEvent.change(await screen.findByRole('combobox', { name: 'Ollama model' }), { target: { value: 'qwen3:8b' } }));
    expect(putProviderPreference).toHaveBeenCalledWith({ models: { ollama: 'qwen3:8b' } });
    expect(screen.getByRole('combobox', { name: 'Ollama model' })).toHaveValue('qwen3:8b');
    expect(screen.getByText('Saved')).toBeInTheDocument();
  });

  it('puts the old model back when the save fails', async () => {
    picked();
    putProviderPreference.mockRejectedValueOnce(new Error('Ollama has no model called "qwen3:8b" on this computer.'));
    await mount();
    await act(async () => fireEvent.change(await screen.findByRole('combobox', { name: 'Ollama model' }), { target: { value: 'qwen3:8b' } }));
    expect(screen.getByRole('combobox', { name: 'Ollama model' })).toHaveValue('llama3.2:3b');
    expect(screen.getByText('Not saved')).toBeInTheDocument();
  });

  it('offers no model picker while Ollama has nothing to run', async () => {
    picked();
    getProviders.mockResolvedValue([...CLIS, { ...OLLAMA, runs: false, models: [], error: 'Ollama has no models yet: run "ollama pull llama3.2" in a terminal, then check again.' }]);
    await mount();
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Ollama' })).toHaveAccessibleDescription(/no models yet/));
    expect(screen.queryByRole('combobox', { name: 'Ollama model' })).not.toBeInTheDocument();
  });

  // Truthful either way: the tag once its probe found it can search, and
  // otherwise the one line on how to let it.
  it('shows the web tag on its card only when it can search, and how to turn it on when it cannot', async () => {
    const hint = 'Sign in with "ollama signin" in a terminal to let Ollama search the web; it needs a free ollama.com account.';
    getProviders.mockResolvedValue([...CLIS, { ...OLLAMA, webHint: hint }]);
    const { unmount } = render(<SettingsView />);
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Ollama' })).toHaveAccessibleDescription(/ollama signin/));
    expect(screen.getByRole('radio', { name: 'Ollama' })).not.toHaveTextContent('Searches the web');
    unmount();
    getProviders.mockResolvedValue([...CLIS, { ...OLLAMA, policies: ['none', 'web'] }]);
    await mount();
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Ollama' })).toHaveTextContent('Searches the web'));
    expect(screen.getByText(/which Claude Code, Antigravity and Ollama can all do\./)).toBeInTheDocument();
  });
});

describe('SettingsView model picker', () => {
  beforeEach(() => getProviders.mockResolvedValue([...CLIS, OLLAMA]));
  const pickers = () => screen.queryAllByRole('combobox', { name: / model$/ });

  it('shows none for "Whichever is available", saying each CLI uses its own', async () => {
    await mount();
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Ollama' })).toBeInTheDocument());
    expect(pickers()).toHaveLength(0);
    expect(screen.getByText('Each CLI then answers with its own saved model, or its default.')).toBeInTheDocument();
  });

  it('shows Claude Code\'s picker alone when it is picked, and none for Ollama', async () => {
    getProviderPreference.mockResolvedValueOnce({ provider: 'claude', models: { claude: 'haiku', ollama: 'qwen3:8b' } });
    await mount();
    expect(await screen.findByRole('combobox', { name: 'Claude Code model' })).toHaveValue('haiku');
    expect(pickers()).toHaveLength(1);
    expect(screen.queryByRole('combobox', { name: 'Ollama model' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Each CLI then answers/)).not.toBeInTheDocument();
  });

  it('moves the picker with the pick, and saves a CLI\'s model under its own id', async () => {
    await mount();
    await act(async () => fireEvent.click(await screen.findByRole('radio', { name: 'Claude Code' })));
    const picker = await screen.findByRole('combobox', { name: 'Claude Code model' });
    await act(async () => fireEvent.change(picker, { target: { value: 'opus' } }));
    expect(putProviderPreference).toHaveBeenLastCalledWith({ models: { claude: 'opus' } });
    await act(async () => fireEvent.click(screen.getByRole('radio', { name: 'Ollama' })));
    expect(screen.queryByRole('combobox', { name: 'Claude Code model' })).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Ollama model' })).toBeInTheDocument();
  });
});
