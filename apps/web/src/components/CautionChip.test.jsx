import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import CautionChip from './CautionChip.jsx';

const CAUTION = [
  { code: 'fee', reason: 'Asks applicants to pay a ₹1,500 registration fee', evidence: 'Candidates must pay a registration fee of Rs 1500 before the interview.' },
  { code: 'shared-ad', reason: 'The same ad appears under 5 company names', evidence: 'Acme, Brightly, Corva, Dunmore, Eastline' },
];

const chip = () => screen.getByRole('button', { name: 'Caution' });

describe('CautionChip', () => {
  it('lists each reason in its factual words when pressed, and folds them away again', () => {
    render(<CautionChip caution={CAUTION} />);
    expect(chip()).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(chip());
    expect(chip()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('group', { name: 'Why this job needs caution' })).toBeInTheDocument();
    expect(screen.getByText('Asks applicants to pay a ₹1,500 registration fee')).toBeInTheDocument();
    expect(screen.getByText('The same ad appears under 5 company names')).toBeInTheDocument();
    fireEvent.click(chip());
    expect(screen.queryByText('Asks applicants to pay a ₹1,500 registration fee')).not.toBeInTheDocument();
  });

  // jsdom has no PointerEvent, so the pointer's kind is set by hand.
  const point = (type, pointerType) => {
    const event = new MouseEvent(type, { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'pointerType', { value: pointerType });
    fireEvent(chip(), event);
  };

  it('opens on a mouse pointing at it, never on a touch', () => {
    render(<CautionChip caution={CAUTION} />);
    point('pointerover', 'touch');
    expect(chip()).toHaveAttribute('aria-expanded', 'false');
    point('pointerout', 'touch');
    point('pointerover', 'mouse');
    expect(chip()).toHaveAttribute('aria-expanded', 'true');
    point('pointerout', 'mouse');
    expect(chip()).toHaveAttribute('aria-expanded', 'false');
  });

  it('shows the sentence behind each reason only on request', () => {
    render(<CautionChip caution={CAUTION} />);
    fireEvent.click(chip());
    expect(screen.queryByText(/Rs 1500 before the interview/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show the evidence' }));
    expect(screen.getByText(/Rs 1500 before the interview/)).toBeInTheDocument();
    expect(screen.getByText('Acme, Brightly, Corva, Dunmore, Eastline')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hide the evidence' })).toHaveAttribute('aria-expanded', 'true');
  });

  // In a row, a press on the chip is for its reasons, not for opening the job.
  it('keeps its presses from the row around it', () => {
    const row = vi.fn();
    render(<div onClick={row}><CautionChip caution={CAUTION} /></div>);
    fireEvent.click(chip());
    fireEvent.click(screen.getByRole('button', { name: 'Show the evidence' }));
    expect(row).not.toHaveBeenCalled();
  });

  it('closes on Escape, back on the chip, without the key reaching the page', () => {
    const page = vi.fn();
    document.addEventListener('keydown', page);
    render(<CautionChip caution={CAUTION} />);
    fireEvent.click(chip());
    const show = screen.getByRole('button', { name: 'Show the evidence' });
    act(() => show.focus());
    fireEvent.keyDown(show, { key: 'Escape' });
    expect(chip()).toHaveAttribute('aria-expanded', 'false');
    expect(chip()).toHaveFocus();
    expect(page).not.toHaveBeenCalled();
    document.removeEventListener('keydown', page);
  });
});
