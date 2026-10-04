import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PostingRow from './PostingRow.jsx';

const hoursAgo = (h) => new Date(Date.now() - h * 3600 * 1000).toISOString();

// The location is deliberately not "Remote": that string is also the work
// mode word, and a work-mode test needs to tell the two apart.
const base = {
  id: 'p1', company: 'Acme', title: 'Frontend Intern', location: 'Bengaluru',
  postedAt: hoursAgo(6), firstSeenAt: hoursAgo(6), newness: 'new', status: null, level: 'internship',
};

const noop = () => {};
const handlers = { onOpen: noop, onSelect: noop, onStatus: noop, onUndo: noop };

describe('PostingRow content', () => {
  it('renders title, company and location', () => {
    render(<PostingRow posting={base} {...handlers} />);
    expect(screen.getByText('Frontend Intern')).toBeInTheDocument();
    // Company, place and age share the quiet second line.
    expect(screen.getByText(/Acme/)).toHaveTextContent(/Acme.*Bengaluru/);
  });

  it('is an option carrying its id, so the list can drive its own keyboard scheme', () => {
    render(<PostingRow posting={base} {...handlers} />);
    expect(screen.getByRole('row')).toHaveAttribute('data-row-id', 'p1');
  });

  it('shows the new-today mark for a fresh posting and hides it once stale', () => {
    const { rerender } = render(<PostingRow posting={base} {...handlers} />);
    expect(screen.getByLabelText('New today')).toBeInTheDocument();
    rerender(<PostingRow posting={{ ...base, postedAt: hoursAgo(30), newness: null }} {...handlers} />);
    expect(screen.queryByLabelText('New today')).not.toBeInTheDocument();
  });

  // New is the board's own date; first found today but posted a week ago
  // says so in the details line instead of wearing the chip.
  it('says Found today in the details line, and keeps the posting age', () => {
    render(<PostingRow posting={{ ...base, postedAt: hoursAgo(24 * 9), firstSeenAt: hoursAgo(2), newness: 'found-today' }} {...handlers} />);
    expect(screen.queryByLabelText('New today')).not.toBeInTheDocument();
    expect(screen.getByText(/Acme/)).toHaveTextContent('Acme · Bengaluru · 9d ago · Found today');
  });

  it('notes a thin posting in grey on the details line, never in the warning colour', () => {
    const { container } = render(<PostingRow posting={{ ...base, newness: null, fewDetails: true }} {...handlers} />);
    expect(screen.getByText(/Acme/)).toHaveTextContent(/Few details$/);
    expect(container.querySelectorAll('[class*="ember"]')).toHaveLength(0);
  });

  // One pay format everywhere, with where it came from on hover and focus.
  it('shows the server pay label, with its evidence', () => {
    render(<PostingRow posting={{ ...base, stipend: '400000', payLabel: '₹4L/yr', payTag: { value: '400000', from: 'board', evidence: 'Pay field: 400000' } }} {...handlers} />);
    expect(screen.getByText('₹4L/yr')).toHaveAccessibleDescription('Pay field: 400000');
    expect(screen.queryByText('400000')).not.toBeInTheDocument();
  });

  it('leaves no fit meter on an unranked row, and shows one once ranked', () => {
    const { rerender } = render(<PostingRow posting={base} {...handlers} />);
    expect(screen.queryByLabelText(/^Fit /)).not.toBeInTheDocument();
    rerender(<PostingRow posting={{ ...base, fit: 58 }} {...handlers} />);
    expect(screen.getByLabelText('Fit 58')).toBeInTheDocument();
  });
});

describe('PostingRow click', () => {
  it('selects and opens on click', () => {
    const onOpen = vi.fn();
    const onSelect = vi.fn();
    render(<PostingRow posting={base} {...handlers} onOpen={onOpen} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('row'));
    expect(onSelect).toHaveBeenCalledWith('p1');
    expect(onOpen).toHaveBeenCalledWith(base, expect.anything());
  });

  it('marks aria-selected and paints the selection background', () => {
    render(<PostingRow posting={base} selected {...handlers} />);
    const option = screen.getByRole('row');
    expect(option).toHaveAttribute('aria-selected', 'true');
    expect(option.className).toContain('bg-select');
  });
});

describe('PostingRow work mode', () => {
  it('names a mode that differs from the page-wide dominant mode', () => {
    render(<PostingRow posting={{ ...base, workMode: 'hybrid' }} dominantWorkMode="remote" {...handlers} />);
    expect(screen.getByText(/Hybrid/)).toBeInTheDocument();
  });

  it('says nothing when the row matches the dominant mode', () => {
    render(<PostingRow posting={{ ...base, workMode: 'remote' }} dominantWorkMode="remote" {...handlers} />);
    expect(screen.queryByText('Remote')).not.toBeInTheDocument();
  });
});

describe('PostingRow triage actions', () => {
  it('are hidden until the row is hovered or holds keyboard focus', () => {
    render(<PostingRow posting={base} {...handlers} />);
    const holder = screen.getByRole('button', { name: 'Save' }).closest('.absolute');
    expect(holder.className).toContain('invisible');
    expect(holder.className).toContain('group-hover:visible');
    expect(holder.className).toContain('group-has-[:focus-visible]:visible');
    expect(holder.className).not.toContain('focus-within');
  });

  it('are shown outright on the row whose job is open in the pane', () => {
    render(<PostingRow posting={base} open {...handlers} />);
    const holder = screen.getByRole('button', { name: 'Save' }).closest('.absolute');
    expect(holder.className).not.toContain('invisible');
  });

  // The j and k highlight outlives the pane, and actions left out on it read
  // as a job still open.
  it('stay hidden on a row that is only selected', () => {
    render(<PostingRow posting={base} selected {...handlers} />);
    const holder = screen.getByRole('button', { name: 'Save' }).closest('.absolute');
    expect(holder.className).toContain('invisible');
  });

  it('names a set status on the row, with aria-pressed on the active button', () => {
    render(<PostingRow posting={{ ...base, status: 'saved' }} {...handlers} />);
    expect(screen.getByText('Saved')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Applied' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('set status without also opening or selecting the row', () => {
    const onStatus = vi.fn();
    const onOpen = vi.fn();
    render(<PostingRow posting={base} {...handlers} onStatus={onStatus} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onStatus).toHaveBeenCalledWith('p1', 'saved');
    expect(onOpen).not.toHaveBeenCalled();
  });
});

describe('PostingRow dismiss undo flash', () => {
  it('replaces the actions with an inline undo affordance', () => {
    render(<PostingRow posting={{ ...base, status: 'dismissed' }} flashUndo {...handlers} />);
    expect(screen.getByText(/Dismissed\./)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
  });

  it('calls onUndo without also opening the row', () => {
    const onUndo = vi.fn();
    const onOpen = vi.fn();
    render(<PostingRow posting={{ ...base, status: 'dismissed' }} flashUndo {...handlers} onUndo={onUndo} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(onUndo).toHaveBeenCalled();
    expect(onOpen).not.toHaveBeenCalled();
  });
});
