import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PostingCard from './PostingCard.jsx';
import { isNewToday } from '../lib/time.js';

const now = new Date('2026-06-28T12:00:00Z').getTime();

// Relative to the run, not a fixed date: PostingCard reads the ambient clock,
// so a hardcoded firstSeenAt would stop being "fresh" the day after it was
// written.
const hoursAgo = (h) => new Date(Date.now() - h * 3600 * 1000).toISOString();

const base = {
  id: 'p1',
  source: 'levels',
  company: 'Acme',
  title: 'Frontend Intern',
  location: 'Remote',
  url: 'https://example.com/p1',
  descriptionSnippet: 'Build the board.',
  firstSeenAt: hoursAgo(6),
  status: null,
  level: 'internship',
  degreeMin: 'none',
  degreeRequired: false,
};

describe('PostingCard', () => {
  it('renders title, company and location', () => {
    render(<PostingCard posting={base} onOpen={() => {}} />);
    expect(screen.getByText('Frontend Intern')).toBeInTheDocument();
    expect(screen.getByText('Acme')).toBeInTheDocument();
    expect(screen.getByText('Remote')).toBeInTheDocument();
  });

  it('is a real button so the grid stays keyboard reachable', () => {
    render(<PostingCard posting={base} onOpen={() => {}} />);
    expect(screen.getByRole('button', { name: /Frontend Intern/ }).tagName).toBe('BUTTON');
  });

  it('passes the posting and the clicked element to onOpen', () => {
    const onOpen = vi.fn();
    render(<PostingCard posting={base} onOpen={onOpen} />);
    const card = screen.getByRole('button', { name: /Frontend Intern/ });
    fireEvent.click(card);
    expect(onOpen).toHaveBeenCalledWith(base, card);
  });

  it('shows the stipend when the posting has one', () => {
    render(<PostingCard posting={{ ...base, stipend: 'Rs 20,000' }} onOpen={() => {}} />);
    expect(screen.getByText('Rs 20,000')).toBeInTheDocument();
  });

  // The description is the field that turned every tile into grey text, so it
  // belongs to the overlay only.
  it('never puts the description on the card', () => {
    render(<PostingCard posting={base} onOpen={() => {}} />);
    expect(screen.queryByText('Build the board.')).not.toBeInTheDocument();
  });

  it('marks a saved posting so the state is visible without opening it', () => {
    render(<PostingCard posting={{ ...base, status: 'saved' }} onOpen={() => {}} />);
    expect(screen.getByText('Saved')).toBeInTheDocument();
  });
});

describe('PostingCard new-today mark', () => {
  it('shows the marker for fresh postings', () => {
    render(<PostingCard posting={base} onOpen={() => {}} />);
    expect(screen.getByLabelText('New today')).toBeInTheDocument();
  });

  it('hides the marker once the posting is over a day old', () => {
    render(<PostingCard posting={{ ...base, firstSeenAt: hoursAgo(30) }} onOpen={() => {}} />);
    expect(screen.queryByLabelText('New today')).not.toBeInTheDocument();
  });

  it('is the only element carrying the ember accent', () => {
    const { container } = render(<PostingCard posting={base} onOpen={() => {}} />);
    const ember = container.querySelectorAll('.bg-ember, .text-ember');
    expect(ember).toHaveLength(1);
    expect(ember[0]).toHaveAttribute('aria-label', 'New today');
  });
});

describe('PostingCard fit score', () => {
  it('shows the score with its unit when the feed is ranked', () => {
    render(<PostingCard posting={{ ...base, fit: 78 }} onOpen={() => {}} />);
    expect(screen.getByText('78 fit')).toBeInTheDocument();
  });

  // 0 is a real score on a ranked feed, so a truthiness check would hide
  // exactly the postings the number is most useful on.
  it('shows a zero score rather than dropping it', () => {
    render(<PostingCard posting={{ ...base, fit: 0 }} onOpen={() => {}} />);
    expect(screen.getByText('0 fit')).toBeInTheDocument();
  });

  it('leaves no fit slot on an unranked feed', () => {
    render(<PostingCard posting={base} onOpen={() => {}} />);
    expect(screen.queryByText(/fit/)).not.toBeInTheDocument();
  });

  // Ember stays the one accent on the card, so the score cannot borrow it.
  it('never carries the ember accent', () => {
    const { container } = render(<PostingCard posting={{ ...base, fit: 91 }} onOpen={() => {}} />);
    const ember = container.querySelectorAll('.bg-ember, .text-ember');
    expect(ember).toHaveLength(1);
    expect(ember[0]).toHaveAttribute('aria-label', 'New today');
  });
});

describe('PostingCard legitimacy warning', () => {
  it('flags a low-legitimacy posting', () => {
    render(<PostingCard posting={{ ...base, legitimacy: 'low' }} onOpen={() => {}} />);
    expect(screen.getByText('May not be a live opening')).toBeInTheDocument();
  });

  it('flags a suspicious posting', () => {
    render(<PostingCard posting={{ ...base, legitimacy: 'suspicious' }} onOpen={() => {}} />);
    expect(screen.getByText('May not be a live opening')).toBeInTheDocument();
  });

  // Most postings are fine, so high and medium show nothing at all: a badge on
  // every card would be noise, and this one accuses a posting of wasting time.
  it('says nothing for high or medium legitimacy', () => {
    for (const legitimacy of ['high', 'medium']) {
      const { unmount } = render(<PostingCard posting={{ ...base, legitimacy }} onOpen={() => {}} />);
      expect(screen.queryByText(/live opening/)).not.toBeInTheDocument();
      unmount();
    }
  });

  // A warning is not the accent: ember still belongs to "new today" alone.
  it('never borrows the ember accent', () => {
    const { container } = render(
      <PostingCard posting={{ ...base, legitimacy: 'suspicious' }} onOpen={() => {}} />,
    );
    const ember = container.querySelectorAll('.bg-ember, .text-ember');
    expect(ember).toHaveLength(1);
    expect(ember[0]).toHaveAttribute('aria-label', 'New today');
  });
});

describe('PostingCard level label', () => {
  // The label carries its own rung colour, so the left edge never has to be
  // decoded. It stays plain text: a filled badge on every card would shout.
  it('tints the label with its level rather than filling a badge', () => {
    render(<PostingCard posting={{ ...base, level: 'executive' }} onOpen={() => {}} />);
    const label = screen.getByText('Executive');
    expect(label.className).toContain('text-level-executive');
    expect(label.className).not.toContain('bg-');
  });

  // Colour is never the only carrier: the word is always present, so nothing is
  // lost to a reader who cannot separate the hues.
  it('always writes the level out in words', () => {
    for (const level of ['internship', 'entry', 'mid', 'senior', 'staff', 'executive']) {
      const { unmount } = render(<PostingCard posting={{ ...base, level }} onOpen={() => {}} />);
      expect(screen.getByText(new RegExp(level, 'i'))).toBeInTheDocument();
      unmount();
    }
  });

  it('falls back to Mid when the level is missing', () => {
    render(<PostingCard posting={{ ...base, level: undefined }} onOpen={() => {}} />);
    expect(screen.getByText('Mid')).toBeInTheDocument();
  });
});

describe('PostingCard work mode', () => {
  it('names a remote posting next to its level', () => {
    render(<PostingCard posting={{ ...base, workMode: 'remote' }} onOpen={() => {}} />);
    expect(screen.getByText('/ Remote')).toBeInTheDocument();
  });

  it('names a hybrid posting', () => {
    render(<PostingCard posting={{ ...base, workMode: 'hybrid' }} onOpen={() => {}} />);
    expect(screen.getByText('/ Hybrid')).toBeInTheDocument();
  });

  // Onsite is also what an un-classified posting reads as, so putting it on the
  // card would label most of the grid with something it does not know.
  it('says nothing for onsite or for a posting with no work mode', () => {
    const { unmount } = render(<PostingCard posting={{ ...base, workMode: 'onsite' }} onOpen={() => {}} />);
    expect(screen.queryByText(/Onsite/)).not.toBeInTheDocument();
    unmount();

    render(<PostingCard posting={base} onOpen={() => {}} />);
    expect(screen.queryByText(/\//)).not.toBeInTheDocument();
  });
});

describe('isNewToday', () => {
  it('is true within 24h and false beyond', () => {
    expect(isNewToday('2026-06-28T06:00:00Z', now)).toBe(true);
    expect(isNewToday('2026-06-26T06:00:00Z', now)).toBe(false);
    expect(isNewToday(null, now)).toBe(false);
  });
});
