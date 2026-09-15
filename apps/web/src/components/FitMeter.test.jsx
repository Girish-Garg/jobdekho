import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import FitMeter from './FitMeter.jsx';

describe('FitMeter presence', () => {
  it('renders nothing when the feed is unranked', () => {
    const { container } = render(<FitMeter fit={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows a zero score rather than dropping it', () => {
    render(<FitMeter fit={0} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});

describe('FitMeter reading', () => {
  it('shows the score in tabular figures', () => {
    render(<FitMeter fit={58} />);
    const score = screen.getByText('58');
    expect(score.className).toContain('tnum');
  });

  it('shows the grade letter alongside the number', () => {
    render(<FitMeter fit={45} grade="B" />);
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('names both the score and the grade in the accessible label, without one it names only the score', () => {
    render(<FitMeter fit={45} grade="B" />);
    expect(screen.getByLabelText('Fit 45, grade B')).toBeInTheDocument();
  });

  it('names only the score when there is no grade', () => {
    render(<FitMeter fit={45} />);
    expect(screen.getByLabelText('Fit 45')).toBeInTheDocument();
  });
});

describe('FitMeter bar', () => {
  it('builds one segment per breakdown dimension', () => {
    const breakdown = [
      { dimension: 'skills', value: 0.8, max: 45 },
      { dimension: 'level', value: 0.5, max: 20 },
    ];
    const { container } = render(<FitMeter fit={58} breakdown={breakdown} />);
    const bar = container.querySelector('[aria-hidden="true"]');
    expect(bar.children).toHaveLength(2);
  });

  it('falls back to one plain segment when there is no breakdown', () => {
    const { container } = render(<FitMeter fit={58} />);
    const bar = container.querySelector('[aria-hidden="true"]');
    expect(bar.children).toHaveLength(1);
  });
});
