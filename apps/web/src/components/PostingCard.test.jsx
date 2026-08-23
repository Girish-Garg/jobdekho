import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PostingRow from './PostingRow.jsx';
import { isNewToday } from '../lib/time.js';

const now = new Date('2026-06-28T12:00:00Z').getTime();

const base = {
  id: 'p1',
  source: 'levels',
  company: 'Acme',
  title: 'Frontend Intern',
  location: 'Remote',
  url: 'https://example.com/p1',
  descriptionSnippet: 'Build the board.',
  firstSeenAt: new Date('2026-06-28T06:00:00Z').toISOString(),
  status: null,
};

describe('PostingRow', () => {
  it('renders title and company', () => {
    render(<PostingRow posting={base} onStatus={() => {}} />);
    expect(screen.getByText('Frontend Intern')).toBeInTheDocument();
    expect(screen.getByText(/Acme/)).toBeInTheDocument();
  });

  it('fires onStatus with the chosen value on click', () => {
    const onStatus = vi.fn();
    render(<PostingRow posting={base} onStatus={onStatus} />);
    fireEvent.click(screen.getByText('Save'));
    expect(onStatus).toHaveBeenCalledWith('p1', 'saved');
  });

  it('toggles a status back to null when already set', () => {
    const onStatus = vi.fn();
    render(<PostingRow posting={{ ...base, status: 'saved' }} onStatus={onStatus} />);
    fireEvent.click(screen.getByText('Save'));
    expect(onStatus).toHaveBeenCalledWith('p1', null);
  });

  it('shows the New marker for fresh postings', () => {
    render(<PostingRow posting={base} onStatus={() => {}} />);
    expect(screen.getByText('New')).toBeInTheDocument();
  });
});

describe('isNewToday', () => {
  it('is true within 24h and false beyond', () => {
    expect(isNewToday('2026-06-28T06:00:00Z', now)).toBe(true);
    expect(isNewToday('2026-06-26T06:00:00Z', now)).toBe(false);
    expect(isNewToday(null, now)).toBe(false);
  });
});
