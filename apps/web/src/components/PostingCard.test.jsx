import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PostingCard from './PostingCard.jsx';
import { isNewToday } from '../lib/time.js';
import { compactPay } from '../lib/compactPay.js';

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

  // In the same compact form the rows use, so a card and a row agree.
  it('shows the pay, compact, when the posting has one', () => {
    render(<PostingCard posting={{ ...base, stipend: 'Rs 20,000' }} onOpen={() => {}} />);
    expect(screen.getByText(compactPay('Rs 20,000'))).toBeInTheDocument();
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

  // Saffron marks what is new; ember is kept for warnings, so a fine posting
  // carries none of it.
  it('marks a new posting in saffron, and carries no warning colour when fine', () => {
    const { container } = render(<PostingCard posting={base} onOpen={() => {}} />);
    expect(screen.getByLabelText('New today').className).toContain('text-primary');
    expect(container.querySelectorAll('.bg-ember, .text-ember')).toHaveLength(0);
  });
});

describe('PostingCard fit score', () => {
  it('shows the score, named as fit, when the feed is ranked', () => {
    render(<PostingCard posting={{ ...base, fit: 78, grade: 'A' }} onOpen={() => {}} />);
    expect(screen.getByLabelText('Fit 78, grade A')).toHaveTextContent('78');
  });

  // 0 is a real score on a ranked feed, so a truthiness check would hide
  // exactly the postings the number is most useful on.
  it('shows a zero score rather than dropping it', () => {
    render(<PostingCard posting={{ ...base, fit: 0 }} onOpen={() => {}} />);
    expect(screen.getByLabelText('Fit 0')).toHaveTextContent('0');
  });

  it('leaves no fit slot on an unranked feed', () => {
    render(<PostingCard posting={base} onOpen={() => {}} />);
    expect(screen.queryByLabelText(/^Fit/)).not.toBeInTheDocument();
  });

  // Ember is for warnings, so a score, however low, never borrows it.
  it('never carries the warning colour', () => {
    const { container } = render(<PostingCard posting={{ ...base, fit: 12, grade: 'D' }} onOpen={() => {}} />);
    expect(container.querySelectorAll('.bg-ember, .text-ember')).toHaveLength(0);
  });
});

describe('PostingCard legitimacy warning', () => {
  it('flags a low-legitimacy posting', () => {
    render(<PostingCard posting={{ ...base, legitimacy: 'low' }} onOpen={() => {}} />);
    expect(screen.getByText('Caution')).toBeInTheDocument();
  });

  it('flags a suspicious posting', () => {
    render(<PostingCard posting={{ ...base, legitimacy: 'suspicious' }} onOpen={() => {}} />);
    expect(screen.getByText('Caution')).toBeInTheDocument();
  });

  // Most postings are fine, so high and medium show nothing at all: a badge on
  // every card would be noise, and this one accuses a posting of wasting time.
  it('says nothing for high or medium legitimacy', () => {
    for (const legitimacy of ['high', 'medium']) {
      const { unmount } = render(<PostingCard posting={{ ...base, legitimacy }} onOpen={() => {}} />);
      expect(screen.queryByText('Caution')).not.toBeInTheDocument();
      unmount();
    }
  });

  // The same colour the job pane's caution card uses for the same evidence.
  it('marks the caution in ember, the colour of warnings', () => {
    render(<PostingCard posting={{ ...base, legitimacy: 'suspicious' }} onOpen={() => {}} />);
    expect(screen.getByText('Caution').className).toContain('text-ember');
  });
});

describe('PostingCard level label', () => {
  // Levels are told apart by their word, not a hue: a colour per rung put six
  // more hues on the page. A hairline chip, never a filled badge, which would shout.
  it('draws the level as a neutral hairline chip rather than a filled badge', () => {
    render(<PostingCard posting={{ ...base, level: 'executive' }} onOpen={() => {}} />);
    const label = screen.getByText('Executive');
    expect(label.className).toContain('border-line');
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
    expect(screen.getByText('Remote', { selector: 'span.rounded-full' })).toBeInTheDocument();
  });

  it('names a hybrid posting', () => {
    render(<PostingCard posting={{ ...base, workMode: 'hybrid' }} onOpen={() => {}} />);
    expect(screen.getByText('Hybrid')).toBeInTheDocument();
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

// The card is an article with the open button stretched over it, so the
// card-level state lives on the article, not on that button.
const cardOf = () => screen.getByRole('article');

describe('PostingCard selection', () => {
  it('carries its id as data-row-id for keyboard scroll and focus lookups', () => {
    render(<PostingCard posting={base} onOpen={() => {}} />);
    expect(cardOf()).toHaveAttribute('data-row-id', 'p1');
  });

  it('paints the selection background when selected, the panel surface otherwise', () => {
    const { rerender } = render(<PostingCard posting={base} onOpen={() => {}} />);
    expect(cardOf().className).toContain('bg-panel');
    rerender(<PostingCard posting={base} selected onOpen={() => {}} />);
    expect(cardOf().className).toContain('bg-select');
  });
});

describe('isNewToday', () => {
  it('is true within 24h and false beyond', () => {
    expect(isNewToday('2026-06-28T06:00:00Z', now)).toBe(true);
    expect(isNewToday('2026-06-26T06:00:00Z', now)).toBe(false);
    expect(isNewToday(null, now)).toBe(false);
  });
});

// A card used to be one button with nothing to do on it but open. The quick
// actions sit above the stretched open button, so they act on their own.
describe('PostingCard quick actions', () => {
  it('saves from the card without opening the job', () => {
    const onOpen = vi.fn();
    const onStatus = vi.fn();
    render(<PostingCard posting={base} onOpen={onOpen} onStatus={onStatus} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onStatus).toHaveBeenCalledWith('p1', 'saved');
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('still opens the job from the card itself', () => {
    const onOpen = vi.fn();
    render(<PostingCard posting={base} onOpen={onOpen} onStatus={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Frontend Intern, Acme/ }));
    expect(onOpen).toHaveBeenCalledWith(base, expect.any(HTMLElement));
  });

  it('offers the undo in place of the actions right after a dismiss', () => {
    const onUndo = vi.fn();
    render(<PostingCard posting={base} flashUndo onOpen={() => {}} onStatus={() => {}} onUndo={onUndo} />);
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(onUndo).toHaveBeenCalled();
  });

  it('shows no actions where no status handler is given', () => {
    render(<PostingCard posting={base} onOpen={() => {}} />);
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
  });
});

// Up by the company name the actions covered the New badge and long names;
// in the footer they take the pay's place, the way a row's take its score's.
describe('PostingCard actions placement', () => {
  it('keeps the actions in the footer, beside the pay, and the New badge free', () => {
    render(<PostingCard posting={{ ...base, stipend: '20,000 /month' }} selected onOpen={() => {}} onStatus={() => {}} />);
    const cell = screen.getByRole('button', { name: 'Save' }).closest('.relative');
    expect(cell.textContent).toContain('20');
    expect(screen.getByLabelText('New today').closest('.relative')).not.toBe(cell);
  });
});
