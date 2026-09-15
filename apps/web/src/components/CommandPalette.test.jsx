import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CommandPalette from './CommandPalette.jsx';
import { onSortRequest } from '../lib/commandBus.js';
import { EMPTY_FILTERS } from '../lib/savedFilters.js';
import { KEY } from '../lib/theme.js';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

function setup(overrides = {}) {
  const onClose = vi.fn();
  const setView = vi.fn();
  const setFilters = vi.fn();
  const onOpenHelp = vi.fn();
  render(
    <CommandPalette
      open
      onClose={onClose}
      view="postings"
      setView={setView}
      filters={EMPTY_FILTERS}
      setFilters={setFilters}
      onOpenHelp={onOpenHelp}
      {...overrides}
    />,
  );
  return { onClose, setView, setFilters, onOpenHelp };
}

const input = () => screen.getByLabelText('Type a command');

describe('CommandPalette visibility', () => {
  it('renders nothing when closed', () => {
    render(<CommandPalette open={false} onClose={() => {}} view="postings" filters={EMPTY_FILTERS} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens as a labelled, modal dialog with a listbox of commands', () => {
    setup();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName('Command palette');
    expect(screen.getByRole('listbox', { name: 'Commands' })).toBeInTheDocument();
  });
});

describe('CommandPalette commands', () => {
  it('offers navigation to the views other than the current one', () => {
    setup();
    expect(screen.getByRole('option', { name: /Go to Profile/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Go to Settings/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Go to Postings/ })).not.toBeInTheDocument();
  });

  it('only offers sort commands on the postings view', () => {
    setup({ view: 'settings' });
    expect(screen.queryByRole('option', { name: /^Sort:/ })).not.toBeInTheDocument();
  });

  it('filters the list as the query narrows it', () => {
    setup();
    fireEvent.change(input(), { target: { value: 'profile' } });
    expect(screen.getByRole('option', { name: /Go to Profile/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Go to Settings/ })).not.toBeInTheDocument();
  });

  it('shows a message when nothing matches', () => {
    setup();
    fireEvent.change(input(), { target: { value: 'zzzzzz' } });
    expect(screen.getByText('No matching command.')).toBeInTheDocument();
  });
});

describe('CommandPalette keyboard', () => {
  it('runs the highlighted command on Enter and closes', () => {
    const { onClose, setView } = setup();
    fireEvent.change(input(), { target: { value: 'go to profile' } });
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(setView).toHaveBeenCalledWith('profile');
    expect(onClose).toHaveBeenCalled();
  });

  it('moves the selection with ArrowDown and ArrowUp', () => {
    setup({ view: 'settings' });
    fireEvent.keyDown(input(), { key: 'ArrowDown' });
    const options = screen.getAllByRole('option');
    expect(options[1]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(input(), { key: 'ArrowUp' });
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('closes on Escape', () => {
    const { onClose } = setup();
    fireEvent.keyDown(input(), { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('runs a command on click without needing Enter', () => {
    const { onClose, setView } = setup();
    fireEvent.click(screen.getByRole('option', { name: /Go to Settings/ }));
    expect(setView).toHaveBeenCalledWith('settings');
    expect(onClose).toHaveBeenCalled();
  });
});

describe('CommandPalette actions that reach outside the filter state', () => {
  it('requests a sort change over the command bus rather than a prop', () => {
    const handler = vi.fn();
    const stop = onSortRequest(handler);
    setup();
    fireEvent.click(screen.getByRole('option', { name: /Sort: Newest posted/ }));
    expect(handler).toHaveBeenCalledWith('newest');
    stop();
  });

  it('clears every filter', () => {
    const { setFilters } = setup();
    fireEvent.click(screen.getByRole('option', { name: 'Clear all filters' }));
    expect(setFilters).toHaveBeenCalledWith(EMPTY_FILTERS);
  });

  it('cycles the stored theme choice', () => {
    setup();
    fireEvent.click(screen.getByRole('option', { name: 'Toggle theme' }));
    expect(localStorage.getItem(KEY)).toBe('light');
  });

  it('opens the shortcuts help and closes itself', () => {
    const { onClose, onOpenHelp } = setup();
    fireEvent.click(screen.getByRole('option', { name: 'Show keyboard shortcuts' }));
    expect(onOpenHelp).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
