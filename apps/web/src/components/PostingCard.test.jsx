import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PostingCard from './PostingCard.jsx';

// Relative to the run, not a fixed date: PostingCard reads the ambient clock,
// so a hardcoded date would stop being "fresh" the day after it was written.
const hoursAgo = (h) => new Date(Date.now() - h * 3600 * 1000).toISOString();

const base = {
  id: 'p1',
  source: 'levels',
  company: 'Acme',
  title: 'Frontend Intern',
  location: 'Remote',
  url: 'https://example.com/p1',
  descriptionSnippet: 'Build the board.',
  postedAt: hoursAgo(6),
  firstSeenAt: hoursAgo(6),
  newness: 'new',
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

  // In the server's one short form, the one the rows and the pane use, so
  // a card and the pane cannot disagree; its evidence on hover.
  it('shows the pay label, with where it came from', () => {
    render(<PostingCard posting={{ ...base, stipend: '₹ 20,000 /month', payLabel: '₹20k/mo', payTag: { value: '₹ 20,000 /month', from: 'board', evidence: 'Pay field: ₹ 20,000 /month' } }} onOpen={() => {}} />);
    expect(screen.getByText('₹20k/mo')).toHaveAccessibleDescription('Pay field: ₹ 20,000 /month');
    expect(screen.queryByText('₹ 20,000 /month')).not.toBeInTheDocument();
  });

  // The chips sit above the stretched button so they can be pointed at; a
  // press on them still opens the job like the rest of the card.
  it('opens the job from a press on its tags', () => {
    const onOpen = vi.fn();
    render(<PostingCard posting={{ ...base, level: 'senior', levelTag: { value: 'senior', from: 'title', evidence: 'Title says Senior' } }} onOpen={onOpen} />);
    fireEvent.click(screen.getByText('Senior'));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }), screen.getByRole('button', { name: /Frontend Intern, Acme/ }));
  });

  it('ends the place line with Found today and Few details where they apply', () => {
    render(<PostingCard posting={{ ...base, postedAt: hoursAgo(24 * 8), newness: 'found-today', fewDetails: true }} onOpen={() => {}} />);
    expect(screen.getByText('Remote · Found today · Few details')).toBeInTheDocument();
    expect(screen.queryByLabelText('New today')).not.toBeInTheDocument();
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
    render(<PostingCard posting={{ ...base, postedAt: hoursAgo(30), firstSeenAt: hoursAgo(30), newness: null }} onOpen={() => {}} />);
    expect(screen.queryByLabelText('New today')).not.toBeInTheDocument();
  });

  // Saffron marks what is new; ember is kept for warnings, so a fine posting
  // carries none of it.
  it('marks a new posting in saffron, and carries no warning colour when fine', () => {
    const { container } = render(<PostingCard posting={base} onOpen={() => {}} />);
    expect(screen.getByLabelText('New today')).toHaveClass('chip-primary');
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

const FEE = [{ code: 'fee', reason: 'Asks applicants to pay a ₹1,500 registration fee', evidence: 'Pay Rs 1500 to register.' }];

describe('PostingCard caution', () => {
  it('flags a posting that states a red flag', () => {
    render(<PostingCard posting={{ ...base, caution: FEE }} onOpen={() => {}} />);
    expect(screen.getByRole('button', { name: 'Caution' })).toBeInTheDocument();
  });

  // Most postings are fine, so a badge on every card would be noise, and
  // this one accuses a posting of wasting time: only a stated red flag
  // earns it, never a low legitimacy alone.
  it('says nothing without a caution, whatever its legitimacy says', () => {
    for (const legitimacy of ['high', 'low', 'suspicious']) {
      const { unmount } = render(<PostingCard posting={{ ...base, legitimacy, caution: [] }} onOpen={() => {}} />);
      expect(screen.queryByText('Caution')).not.toBeInTheDocument();
      unmount();
    }
  });

  // The same colour the job pane's caution card uses for the same evidence,
  // and a press on it is for its reasons, not for opening the job.
  it('marks the caution in ember, and opens its reasons rather than the job', () => {
    const onOpen = vi.fn();
    render(<PostingCard posting={{ ...base, caution: FEE }} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole('button', { name: 'Caution' }));
    expect(screen.getByRole('button', { name: 'Caution' }).className).toContain('text-ember');
    expect(screen.getByText('Asks applicants to pay a ₹1,500 registration fee')).toBeInTheDocument();
    expect(onOpen).not.toHaveBeenCalled();
  });
});

describe('PostingCard level label', () => {
  // Levels are told apart by their word, not a hue: a colour per rung put six
  // more hues on the page. A hairline chip, never a filled badge, which would shout.
  it('draws the level as a neutral hairline chip rather than a filled badge', () => {
    render(<PostingCard posting={{ ...base, level: 'executive' }} onOpen={() => {}} />);
    const label = screen.getByText('Executive');
    expect(label).toHaveClass('chip-line');
    expect(label.className).not.toMatch(/chip-(primary|applied)|bg-(primary|ember|applied|select)/);
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

  // A posting that does not say its level gets no level chip: a guessed
  // "Mid" read as a fact, and the owner chose no tag over a wrong one.
  it('shows no level when the posting does not say it', () => {
    render(<PostingCard posting={{ ...base, level: null }} onOpen={() => {}} />);
    expect(screen.queryByText('Mid')).not.toBeInTheDocument();
  });
});

describe('PostingCard work mode', () => {
  it('names a remote posting next to its level', () => {
    render(<PostingCard posting={{ ...base, workMode: 'remote' }} onOpen={() => {}} />);
    expect(screen.getByText('Remote', { selector: 'span.chip' })).toBeInTheDocument();
  });

  it('names a hybrid posting', () => {
    render(<PostingCard posting={{ ...base, workMode: 'hybrid' }} onOpen={() => {}} />);
    expect(screen.getByText('Hybrid')).toBeInTheDocument();
  });

  // A posting that does not say its mode has none, so a stated Onsite is a
  // fact worth a chip; an unknown mode shows nothing.
  it('names a stated onsite job, and nothing for a posting with no work mode', () => {
    const { unmount } = render(<PostingCard posting={{ ...base, workMode: 'onsite', workModeTag: { value: 'onsite', from: 'board', evidence: 'Board tag: onsite' } }} onOpen={() => {}} />);
    expect(screen.getByText('Onsite')).toHaveAccessibleDescription('Board tag: onsite');
    unmount();

    render(<PostingCard posting={base} onOpen={() => {}} />);
    expect(screen.queryByText(/Onsite|\//)).not.toBeInTheDocument();
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
    expect(cardOf()).toHaveClass('card-panel');
    expect(cardOf()).not.toHaveClass('bg-select');
    rerender(<PostingCard posting={base} selected onOpen={() => {}} />);
    expect(cardOf()).toHaveClass('bg-select');
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
// in the footer they take the score's place, the way a row's do, so the pay
// stays on screen with its evidence one hover away.
describe('PostingCard actions placement', () => {
  it('keeps the actions in the footer, in the score place, the pay and the New badge free', () => {
    render(<PostingCard posting={{ ...base, fit: 70, grade: 'B', payLabel: '₹20k/mo' }} selected onOpen={() => {}} onStatus={() => {}} />);
    const cell = screen.getByRole('button', { name: 'Save' }).closest('.relative');
    expect(cell).toContainElement(screen.getByLabelText('Fit 70, grade B'));
    expect(cell).not.toContainElement(screen.getByText('₹20k/mo'));
    expect(screen.getByLabelText('New today').closest('.relative')).not.toBe(cell);
  });

  // A focused card is not reason enough: a pane closed with a click puts focus
  // back on the card, and the actions stayed out on the job just put away.
  it('pins the actions out only while the job is open in the pane', () => {
    const { rerender } = render(<PostingCard posting={base} selected onOpen={() => {}} onStatus={() => {}} />);
    const holder = () => screen.getByRole('button', { name: 'Save' }).closest('.absolute');
    expect(holder().className).toContain('opacity-0');
    expect(holder().className).toContain('group-has-[:focus-visible]:opacity-100');
    expect(holder().className).not.toContain('focus-within');
    rerender(<PostingCard posting={base} open onOpen={() => {}} onStatus={() => {}} />);
    expect(holder().className).not.toContain('opacity-0');
  });

  // The foot's actions and pay are a layer over the stretched open button;
  // the tags' layer has to be above theirs, or a chip's tip opened under them.
  it('lays the tags above the foot, so a tip is not drawn under the actions', () => {
    render(<PostingCard posting={{ ...base, payLabel: '₹20k/mo' }} onOpen={() => {}} onStatus={() => {}} />);
    const layer = (el) => Number(el.closest('[class*=" z-"]').className.match(/(?:^| )z-([0-9]+)/)[1]);
    const tags = layer(screen.getByText('Internship'));
    expect(tags).toBeGreaterThan(layer(screen.getByRole('button', { name: 'Save' })));
    expect(tags).toBeGreaterThan(layer(screen.getByText('₹20k/mo')));
  });
});
