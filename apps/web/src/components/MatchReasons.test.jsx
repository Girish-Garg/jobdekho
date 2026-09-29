import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import MatchReasons from './MatchReasons.jsx';

// The reasons are rendered verbatim from the server, which scores the full
// description. This suite used to run @jobdekho/core's explainScore in the
// browser; that recomputation is exactly the drift the component now avoids.
describe('MatchReasons', () => {
  it('renders each server phrase verbatim, in the fit card', () => {
    render(<MatchReasons reasons={['matches react, typescript', 'suits your experience']} />);
    const card = screen.getByRole('region', { name: 'Fit' });
    expect(within(card).getByText('matches react, typescript')).toBeInTheDocument();
    expect(within(card).getByText('suits your experience')).toBeInTheDocument();
  });

  it('shows the score large when the posting was ranked', () => {
    render(<MatchReasons fit={76} reasons={['matches react']} grade="A" />);
    expect(screen.getByText('76')).toBeInTheDocument();
    expect(screen.getByText('Grade A')).toBeInTheDocument();
  });

  it('passes a warning through unsoftened', () => {
    render(<MatchReasons reasons={['well outside your experience']} />);
    expect(screen.getByText(/well outside your experience/)).toBeInTheDocument();
  });

  it('renders nothing when the server had nothing to say', () => {
    const { container } = render(<MatchReasons reasons={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for an unranked posting, which carries no reasons field', () => {
    const { container } = render(<MatchReasons />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('MatchReasons grade and breakdown', () => {
  const breakdown = [
    // Shaped exactly as core emits it: weight is the raw 45/25/20, and `max`
    // is the dimension's ceiling in fit points after renormalising over the
    // dimensions this profile supports. A fixture carrying weight as a
    // fraction is what let a display print "32 of 4500" with tests green.
    { dimension: 'skills', value: 0.62, weight: 45, points: 29.8, max: 48 },
    { dimension: 'titles', value: 0.5, weight: 25, points: 13.3, max: 27 },
    { dimension: 'level', value: 1, weight: 20, points: 21.3, max: 21 },
  ];

  it('shows the grade beside the fit heading', () => {
    render(<MatchReasons reasons={['matches react']} grade="B" breakdown={breakdown} />);
    expect(within(screen.getByRole('region', { name: 'Fit' })).getByText('Grade B')).toBeInTheDocument();
  });

  // The profile decides which dimensions exist, so the rows follow the array,
  // not a fixed four.
  it('renders one row per dimension the server scored', () => {
    render(<MatchReasons reasons={['matches react']} grade="B" breakdown={breakdown} />);
    expect(within(screen.getByRole('list', { name: 'Fit by part' })).getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText('Skills')).toBeInTheDocument();
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Level')).toBeInTheDocument();
  });

  // The bars are aria-hidden, so the contribution must survive as plain text:
  // rounded points against the dimension's own ceiling.
  it('writes each contribution out as points, not only as a bar width', () => {
    render(<MatchReasons reasons={['matches react']} grade="B" breakdown={breakdown} />);
    expect(screen.getByText('30 of 48')).toBeInTheDocument();
    expect(screen.getByText('13 of 27')).toBeInTheDocument();
    expect(screen.getByText('21 of 21')).toBeInTheDocument();
  });

  // A ranked posting can carry a breakdown while the phrase list came back
  // empty; the block still has something to say.
  it('still renders when the ranking is present but the phrases are empty', () => {
    render(<MatchReasons reasons={[]} grade="C" breakdown={breakdown} />);
    expect(screen.getByText('Grade C')).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Fit by part' })).getAllByRole('listitem')).toHaveLength(3);
  });

  it('shows no grade and no bars when the posting came back unranked', () => {
    const { container } = render(<MatchReasons />);
    expect(container).toBeEmptyDOMElement();
    render(<MatchReasons reasons={['matches react']} />);
    expect(screen.queryByText(/Grade/)).not.toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Fit by part' })).not.toBeInTheDocument();
  });
});

// Every row's track is the same length, filled to that part's own score: a
// track drawn to the part's share of the total made a full degree bar short.
describe('MatchReasons breakdown bars', () => {
  it('fills each row to its points against its own ceiling, on a track of the same length', () => {
    const rows = [
      { dimension: 'skills', points: 29, max: 45 },
      { dimension: 'degree', points: 10, max: 10 },
    ];
    render(<MatchReasons grade="A" breakdown={rows} />);
    const fills = [...screen.getByRole('list', { name: 'Fit by part' }).querySelectorAll('li > span[aria-hidden] > span')];
    expect(fills.map((fill) => fill.style.width)).toEqual([`${(29 / 45) * 100}%`, '100%']);
  });
});
