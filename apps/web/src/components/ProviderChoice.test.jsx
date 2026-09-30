import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import ProviderChoice from './ProviderChoice.jsx';

const PROVIDERS = [
  { id: 'claude', label: 'Claude Code', policies: ['none', 'web'], runs: true, version: '2.1.245', error: null },
  { id: 'agy', label: 'Antigravity', policies: ['none'], runs: false, version: null, error: null },
];

describe('ProviderChoice', () => {
  it('renders "Whichever is available" plus one button per detected provider, by label', () => {
    render(<ProviderChoice providers={PROVIDERS} pref="auto" onChange={() => {}} />);
    expect(screen.getByRole('radio', { name: 'Whichever is available' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Claude Code' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Antigravity' })).toBeInTheDocument();
  });

  it('marks the current preference checked, auto by default', () => {
    render(<ProviderChoice providers={PROVIDERS} pref="auto" onChange={() => {}} />);
    expect(screen.getByRole('radio', { name: 'Whichever is available' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Claude Code' })).toHaveAttribute('aria-checked', 'false');
  });

  it('marks a specific provider checked when it is the preference', () => {
    render(<ProviderChoice providers={PROVIDERS} pref="claude" onChange={() => {}} />);
    expect(screen.getByRole('radio', { name: 'Claude Code' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Whichever is available' })).toHaveAttribute('aria-checked', 'false');
  });

  it('reports the picked provider id, or "auto" for the first option', () => {
    const onChange = vi.fn();
    render(<ProviderChoice providers={PROVIDERS} pref="auto" onChange={onChange} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Antigravity' }));
    expect(onChange).toHaveBeenCalledWith('agy');
    fireEvent.click(screen.getByRole('radio', { name: 'Whichever is available' }));
    expect(onChange).toHaveBeenCalledWith('auto');
  });

  it('adds no options for an empty provider list, "auto" still there', () => {
    render(<ProviderChoice providers={[]} pref="auto" onChange={() => {}} />);
    expect(screen.getAllByRole('radio')).toHaveLength(1);
  });

  // The name stays the label alone; what the probe found is the description,
  // so the card shows it without changing what a screen reader calls it.
  it('describes each CLI by what the probe found, and which search the web', () => {
    render(<ProviderChoice providers={PROVIDERS} pref="auto" onChange={() => {}} />);
    expect(screen.getByRole('radio', { name: 'Claude Code' })).toHaveAccessibleDescription(/2.1.245.*Searches the web/);
    expect(screen.getByRole('radio', { name: 'Antigravity' })).toHaveAccessibleDescription('not installed');
  });

  it('shows the error for a CLI that is installed but stuck', () => {
    const stuck = { ...PROVIDERS[1], error: 'Antigravity is installed, but blocked' };
    render(<ProviderChoice providers={[stuck]} pref="auto" onChange={() => {}} />);
    expect(screen.getByRole('radio', { name: 'Antigravity' })).toHaveAccessibleDescription('Antigravity is installed, but blocked');
  });

  // Ollama runs on this computer and cannot search, so its card has the dot
  // and version like the others but never the web tag.
  it('shows an Ollama card with its version and no web tag', () => {
    const ollama = { id: 'ollama', label: 'Ollama', policies: ['none'], runs: true, version: '0.32.12', error: null, models: [] };
    render(<ProviderChoice providers={[...PROVIDERS, ollama]} pref="ollama" onChange={() => {}} />);
    const card = screen.getByRole('radio', { name: 'Ollama' });
    expect(card).toHaveAttribute('aria-checked', 'true');
    expect(card).toHaveAccessibleDescription('0.32.12');
    expect(card).not.toHaveTextContent('Searches the web');
  });

  // The tag only where the probe found it can search; otherwise the
  // server's one line on how to let it, as part of the card's description.
  it('tags an Ollama that can search, and says how to turn it on for one that cannot', () => {
    const hint = 'Sign in with "ollama signin" in a terminal to let Ollama search the web; it needs a free ollama.com account.';
    const signedOut = { id: 'ollama', label: 'Ollama', policies: ['none'], runs: true, version: '0.32.12', error: null, models: [], webHint: hint };
    const { unmount } = render(<ProviderChoice providers={[signedOut]} pref="auto" onChange={() => {}} />);
    expect(screen.getByRole('radio', { name: 'Ollama' })).toHaveAccessibleDescription(`0.32.12 ${hint}`);
    expect(screen.getByRole('radio', { name: 'Ollama' })).not.toHaveTextContent('Searches the web');
    unmount();
    render(<ProviderChoice providers={[{ ...signedOut, policies: ['none', 'web'], webHint: null }]} pref="auto" onChange={() => {}} />);
    expect(screen.getByRole('radio', { name: 'Ollama' })).toHaveAccessibleDescription('0.32.12 Searches the web');
  });

  it('shows why Ollama cannot answer when its server is not up', () => {
    const stopped = {
      id: 'ollama', label: 'Ollama', policies: ['none'], runs: false, version: null, models: [],
      error: 'Ollama is installed but not running: start the Ollama app, or run "ollama serve" in a terminal.',
    };
    render(<ProviderChoice providers={[stopped]} pref="auto" onChange={() => {}} />);
    expect(screen.getByRole('radio', { name: 'Ollama' })).toHaveAccessibleDescription(/not running: start the Ollama app/);
  });

  it('describes "Whichever is available" in words that fit any number of AIs', () => {
    render(<ProviderChoice providers={PROVIDERS} pref="auto" onChange={() => {}} />);
    expect(screen.getByRole('radio', { name: 'Whichever is available' })).toHaveAccessibleDescription('Asks the first that answers, then the next in line.');
  });
});
