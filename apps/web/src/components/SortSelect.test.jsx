import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import SortSelect from './SortSelect.jsx';

// The recommended order is not an item, nor named anywhere: it is the feed,
// under every sort (see lib/sorts.js), and the menu only picks how each
// grade is arranged.
describe('SortSelect', () => {
  it('reads Sort until an order is picked, then names that order', () => {
    const { rerender } = render(<SortSelect sort="match" setSort={() => {}} />);
    expect(screen.getByRole('button', { name: 'Sort' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(/Best fit/)).not.toBeInTheDocument();
    rerender(<SortSelect sort="newest" setSort={() => {}} />);
    expect(screen.getByRole('button', { name: 'Sort: Newest posted' })).toHaveTextContent('Newest posted');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('offers the orders within a grade, and says nothing of Best fit', () => {
    render(<SortSelect sort="newest" setSort={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /^Sort:/ }));
    expect(screen.getAllByRole('menuitemcheckbox')).toHaveLength(4);
    expect(screen.getByRole('menu')).not.toHaveTextContent(/Best fit/);
    expect(screen.getByText('Inside each grade:')).toBeInTheDocument();
    expect(screen.getByRole('menuitemcheckbox', { name: /^Newest posted/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('Newest to JobDekho first')).toBeInTheDocument();
  });

  it('sets the picked order and closes', () => {
    const setSort = vi.fn();
    render(<SortSelect sort="match" setSort={setSort} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sort' }));
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: /^Company A-Z/ }));
    expect(setSort).toHaveBeenCalledWith('company');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('goes back to the recommendations alone when the picked order is picked again', () => {
    const setSort = vi.fn();
    render(<SortSelect sort="company" setSort={setSort} />);
    fireEvent.click(screen.getByRole('button', { name: /^Sort:/ }));
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: /^Company A-Z/ }));
    expect(setSort).toHaveBeenCalledWith('match');
  });

  it('closes on Escape without changing the order', () => {
    const setSort = vi.fn();
    render(<SortSelect sort="match" setSort={setSort} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sort' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(setSort).not.toHaveBeenCalled();
  });
});
