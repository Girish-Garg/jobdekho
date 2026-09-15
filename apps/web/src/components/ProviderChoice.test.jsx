import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import ProviderChoice from './ProviderChoice.jsx';

const PROVIDERS = [
  { id: 'claude', label: 'Claude Code' },
  { id: 'agy', label: 'Antigravity' },
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
});
