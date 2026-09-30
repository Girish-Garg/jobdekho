import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import SortSelect from './SortSelect.jsx';

describe('SortSelect', () => {
  it('names the current order on its trigger and keeps the menu closed', () => {
    render(<SortSelect sort="newest" setSort={() => {}} />);
    expect(screen.getByRole('button', { name: 'Sort: Newest posted' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('marks the current order in the menu, each with what it means', () => {
    render(<SortSelect sort="match" setSort={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sort: Best fit' }));
    expect(screen.getAllByRole('menuitemradio')).toHaveLength(5);
    expect(screen.getByRole('menuitemradio', { name: /^Best fit/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('Newest to JobDekho first')).toBeInTheDocument();
  });

  it('sets the picked order and closes', () => {
    const setSort = vi.fn();
    render(<SortSelect sort="match" setSort={setSort} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sort: Best fit' }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: /^Company A-Z/ }));
    expect(setSort).toHaveBeenCalledWith('company');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
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
