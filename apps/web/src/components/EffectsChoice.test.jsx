import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EffectsChoice from './EffectsChoice.jsx';

afterEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.effects;
});

describe('EffectsChoice', () => {
  it('saves the pick, applies it at once, and says what it means', () => {
    render(<EffectsChoice />);
    expect(screen.getByRole('radio', { name: 'Automatic' })).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByRole('radio', { name: 'Light' }));
    expect(localStorage.getItem('jobdekho-effects')).toBe('light');
    expect(document.documentElement.dataset.effects).toBe('light');
    expect(screen.getByText(/Nothing repaints as the pointer moves/)).toBeInTheDocument();
  });

  it('says what automatic picked for this computer', () => {
    document.documentElement.dataset.effects = 'full';
    render(<EffectsChoice />);
    expect(screen.getByText(/Picked for this computer: full/)).toBeInTheDocument();
  });
});
