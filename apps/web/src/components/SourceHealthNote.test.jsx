import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SourceHealthNote from './SourceHealthNote.jsx';
import RefreshLastRun from './RefreshLastRun.jsx';

describe('SourceHealthNote', () => {
  it('says nothing when every source is well', () => {
    const { container } = render(<SourceHealthNote health={{ paused: [], alerts: [] }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('names the sources resting, why and until when, with the error on hover', () => {
    const health = {
      paused: [{ name: 'greenhouse:acme', until: '2026-10-03T06:00:00.000Z', reason: 'gone', error: 'HTTP 404 for x' }],
      alerts: [{ name: 'lever:paytm', kind: 'thin' }],
    };
    render(<SourceHealthNote health={health} />);
    expect(screen.getByText('1 resting:', { exact: false })).toBeInTheDocument();
    expect(screen.getByText(/Acme \(not found, until 3 Oct\)/)).toHaveAttribute('title', 'HTTP 404 for x');
    expect(screen.getByText(/Paytm \(descriptions missing\)/)).toBeInTheDocument();
  });

  it('names four and counts the rest', () => {
    const paused = Array.from({ length: 6 }, (_, i) => ({ name: `lever:c${i}`, until: '2026-10-03T06:00:00.000Z', reason: 'failing' }));
    render(<SourceHealthNote health={{ paused, alerts: [] }} />);
    expect(screen.getByText('and 2 more', { exact: false })).toBeInTheDocument();
  });
});

describe('RefreshLastRun closure line', () => {
  const run = { at: '2026-10-01T06:00:00.000Z', fresh: 3, sources: 10, failed: [], skipped: [] };

  it('says how many postings closed and how many links were checked', () => {
    render(<RefreshLastRun lastRun={{ ...run, closed: 4, checked: 40 }} />);
    expect(screen.getByText('4 found closed; 40 posting links checked')).toBeInTheDocument();
  });

  it('says nothing about closing for a run from before it was counted', () => {
    render(<RefreshLastRun lastRun={run} />);
    expect(screen.queryByText(/found closed/)).not.toBeInTheDocument();
  });
});
