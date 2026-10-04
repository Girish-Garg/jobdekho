import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TagChip from './TagChip.jsx';

describe('TagChip', () => {
  // A title alone reaches neither the keyboard nor a screen reader.
  it('can take focus, and its evidence is its accessible description', () => {
    render(<TagChip tone="line" evidence="Title says Senior">Senior</TagChip>);
    const chip = screen.getByText('Senior');
    expect(chip).toHaveAttribute('tabindex', '0');
    expect(chip).toHaveAccessibleDescription('Title says Senior');
    expect(chip).not.toHaveAttribute('title');
    expect(screen.getByRole('tooltip', { hidden: true })).toHaveTextContent('Title says Senior');
  });

  it('shows each line of evidence on its own line', () => {
    render(<TagChip evidence={['Says "6-month internship"', 'Internshala lists it as an internship']}>Internship</TagChip>);
    const lines = screen.getByRole('tooltip', { hidden: true }).children;
    expect([...lines].map((line) => line.textContent)).toEqual(['Says "6-month internship"', 'Internshala lists it as an internship']);
  });

  // The chip is drawn the way it always was when there is nothing to say.
  it('is a plain chip, out of the tab order, with no evidence', () => {
    render(<TagChip tone="line" evidence={[]}>Staff</TagChip>);
    expect(screen.getByText('Staff')).not.toHaveAttribute('tabindex');
    expect(screen.queryByRole('tooltip', { hidden: true })).not.toBeInTheDocument();
  });

  // Escape puts the tip away without also closing the pane behind it.
  it('hides its tip on Escape and keeps the key from the page, once', () => {
    const page = vi.fn();
    document.addEventListener('keydown', page);
    render(<TagChip evidence="Board tag: onsite">Onsite</TagChip>);
    const chip = screen.getByText('Onsite');
    fireEvent.keyDown(chip, { key: 'Escape' });
    expect(screen.getByRole('tooltip', { hidden: true })).toHaveClass('hidden');
    expect(page).not.toHaveBeenCalled();
    fireEvent.keyDown(chip, { key: 'Escape' });
    expect(page).toHaveBeenCalledTimes(1);
    fireEvent.blur(chip);
    expect(screen.getByRole('tooltip', { hidden: true })).not.toHaveClass('hidden');
    document.removeEventListener('keydown', page);
  });

  it('draws any value, not only a chip, and lines its tip up with the end it is given', () => {
    render(<TagChip as="span" align="end" evidence="Pay field: ₹ 10,000 /month" className="tnum">₹10k/mo</TagChip>);
    expect(screen.getByText('₹10k/mo')).not.toHaveClass('chip');
    expect(screen.getByRole('tooltip', { hidden: true })).toHaveClass('tip', 'right-0');
  });
});
