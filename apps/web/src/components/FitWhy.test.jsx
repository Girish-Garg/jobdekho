import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import FitWhy from './FitWhy.jsx';

// Shaped exactly as core's fit-explain.js emits it.
const why = {
  has: [{ skill: 'React', where: 'title' }, { skill: 'Node.js', where: 'req' }],
  close: [{ skill: 'Next.js', via: 'React' }],
  missing: [{ skill: 'Go', where: 'req' }],
  asked: { min: 5, max: 9, from: 'years', phrase: 'at least 5 years' },
  place: 'in Chennai, not a place you listed',
};
const gates = [
  { gate: 'level', value: 0.3, why: 'asks at least 5 years, you have 2 years' },
  { gate: 'place', value: 0.6, why: 'in Chennai, not a place you listed' },
  { gate: 'type', value: 1, why: null },
  { gate: 'degree', value: 1, why: null },
];

const row = (label) => {
  const term = screen.getByText(label, { selector: 'dt' });
  return [...term.parentElement.querySelectorAll('dd')].map((d) => d.textContent);
};

describe('FitWhy', () => {
  it('lays out the skills held, close and missing', () => {
    render(<FitWhy why={why} gates={gates} />);
    expect(row('Has')).toEqual(['React, Node.js', '']);
    expect(row('Close')).toEqual(['Next.js (you know React)', '']);
    expect(row('Missing')).toEqual(['Go', '']);
  });

  // The number above can be read back from the rows that held it down.
  it('puts the multiplier beside a part that held the fit back', () => {
    render(<FitWhy why={why} gates={gates} />);
    expect(row('Asks')).toEqual(['at least 5 years', 'x0.3']);
    expect(row('Place')).toEqual(['in Chennai, not a place you listed', 'x0.6']);
    expect(screen.getByLabelText('holds the fit to 30 percent')).toBeInTheDocument();
  });

  it('shows no multiplier for a part that cost nothing', () => {
    render(<FitWhy why={{ ...why, place: 'in Pune' }} gates={gates.map((g) => (g.gate === 'place' ? { ...g, value: 1 } : g))} />);
    expect(row('Place')).toEqual(['in Pune', '']);
  });

  // Most jobs are neither an internship nor above the person's degree.
  it('shows the role and degree rows only when they cost something', () => {
    const { rerender } = render(<FitWhy why={why} gates={gates} />);
    expect(screen.queryByText('Role')).not.toBeInTheDocument();
    const held = gates.map((g) => (g.gate === 'type' ? { ...g, value: 0.3, why: 'an internship, and you have 2 years of work' } : g));
    rerender(<FitWhy why={why} gates={held} />);
    expect(row('Role')).toEqual(['an internship, and you have 2 years of work', 'x0.3']);
  });

  it('leaves out rows the server had nothing for', () => {
    render(<FitWhy why={{ has: [{ skill: 'React', where: 'title' }], close: [], missing: [], asked: null, place: null }} gates={[]} />);
    const list = screen.getByRole('term').closest('dl');
    expect(within(list).getAllByRole('term').map((t) => t.textContent)).toEqual(['Has']);
  });

  it('renders nothing without a why, or with an empty one', () => {
    const { container, rerender } = render(<FitWhy />);
    expect(container).toBeEmptyDOMElement();
    rerender(<FitWhy why={{ has: [], close: [], missing: [], asked: null, place: null }} gates={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
