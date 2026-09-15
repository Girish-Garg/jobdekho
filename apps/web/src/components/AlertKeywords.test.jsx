import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AlertKeywords from './AlertKeywords.jsx';

const FILTERS = { includeKeywords: ['react', 'node'], excludeKeywords: ['senior'], locations: [] };

describe('AlertKeywords', () => {
  it('collapses behind a disclosure with the total count in the summary', () => {
    render(<AlertKeywords filters={FILTERS} setFilter={() => () => {}} />);
    const summary = screen.getByText('3 keywords set');
    expect(summary).toBeInTheDocument();
    expect(summary.closest('details')).not.toHaveAttribute('open');
  });

  it('uses the singular for exactly one keyword', () => {
    render(<AlertKeywords filters={{ includeKeywords: ['react'], excludeKeywords: [], locations: [] }} setFilter={() => () => {}} />);
    expect(screen.getByText('1 keyword set')).toBeInTheDocument();
  });

  it('says so at zero, nothing hidden silently', () => {
    render(<AlertKeywords filters={{ includeKeywords: [], excludeKeywords: [], locations: [] }} setFilter={() => () => {}} />);
    expect(screen.getByText('0 keywords set')).toBeInTheDocument();
  });

  it('reveals all three lists once opened', () => {
    render(<AlertKeywords filters={FILTERS} setFilter={() => () => {}} />);
    const summary = screen.getByText('3 keywords set');
    fireEvent.click(summary);
    expect(summary.closest('details')).toHaveAttribute('open');
    expect(screen.getByLabelText('Include keywords')).toBeInTheDocument();
    expect(screen.getByLabelText('Exclude keywords')).toBeInTheDocument();
    expect(screen.getByLabelText('Locations')).toBeInTheDocument();
  });

  it('routes an edit through setFilter for the field that changed', () => {
    const setFilter = vi.fn(() => vi.fn());
    render(<AlertKeywords filters={FILTERS} setFilter={setFilter} />);
    expect(setFilter).toHaveBeenCalledWith('includeKeywords');
    expect(setFilter).toHaveBeenCalledWith('excludeKeywords');
    expect(setFilter).toHaveBeenCalledWith('locations');
  });
});
