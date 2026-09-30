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
});
