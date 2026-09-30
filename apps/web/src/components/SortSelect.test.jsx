import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import SortSelect from './SortSelect.jsx';

// Best fit is not an item: it is the order under every sort (see
// lib/sorts.js), and the menu only picks how each grade is arranged.
describe('SortSelect', () => {
  it('says best fit comes first, and names the order within it', () => {
    const { rerender } = render(<SortSelect sort="match" setSort={() => {}} />);
    expect(screen.getByRole('button', { name: 'Sort: Best fit' })).toHaveAttribute('aria-expanded', 'false');
    rerender(<SortSelect sort="newest" setSort={() => {}} />);
    expect(screen.getByRole('button', { name: 'Sort: Best fit, then Newest posted' })).toBeInTheDocument();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('offers the orders within a grade, never Best fit itself', () => {
    render(<SortSelect sort="newest" setSort={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /^Sort:/ }));
    expect(screen.getAllByRole('menuitemcheckbox')).toHaveLength(4);
    expect(screen.queryByRole('menuitemcheckbox', { name: /^Best fit/ })).toBeNull();
    expect(screen.getByRole('menuitemcheckbox', { name: /^Newest posted/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('Newest to JobDekho first')).toBeInTheDocument();
  });

  it('sets the picked order and closes', () => {
    const setSort = vi.fn();
    render(<SortSelect sort="match" setSort={setSort} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sort: Best fit' }));
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: /^Company A-Z/ }));
    expect(setSort).toHaveBeenCalledWith('company');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('goes back to best fit alone when the picked order is picked again', () => {
    const setSort = vi.fn();
    render(<SortSelect sort="company" setSort={setSort} />);
    fireEvent.click(screen.getByRole('button', { name: /^Sort:/ }));
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: /^Company A-Z/ }));
    expect(setSort).toHaveBeenCalledWith('match');
  });

  it('closes on Escape without changing the order', () => {
    const setSort = vi.fn();
    render(<SortSelect sort="match" setSort={setSort} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sort: Best fit' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(setSort).not.toHaveBeenCalled();
  });
});
