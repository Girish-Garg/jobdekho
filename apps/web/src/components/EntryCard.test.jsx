import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EntryCard from './EntryCard.jsx';
import { makeEntry } from '../lib/newEntry.js';

const BASE = { ...makeEntry(), title: 'Backend Engineer', organisation: 'Acme', startDate: '2020', endDate: 'Present' };

function renderCard(overrides = {}, props = {}) {
  const onChange = vi.fn();
  const onRemove = vi.fn();
  const onMove = vi.fn();
  render(
    <EntryCard
      entry={{ ...BASE, ...overrides }}
      titleLabel="Role"
      orgLabel="Company"
      startOpen={false}
      isFirst={false}
      isLast={false}
      onChange={onChange}
      onRemove={onRemove}
      onMove={onMove}
      {...props}
    />,
  );
  return { onChange, onRemove, onMove };
}

describe('EntryCard', () => {
  it('collapses to one summary line naming the title, organisation and dates', () => {
    renderCard();
    expect(screen.getByText('Backend Engineer')).toBeInTheDocument();
    expect(screen.getByText('at Acme')).toBeInTheDocument();
    expect(screen.getByText('2020 - Present')).toBeInTheDocument();
    // <details> keeps its content in the DOM even when closed; jest-dom's
    // visibility check is the one that understands a closed <details>.
    expect(screen.getByLabelText('Role')).not.toBeVisible();
  });

  it('falls back to a placeholder title for a blank entry', () => {
    renderCard({ title: '' });
    expect(screen.getByText('Untitled role')).toBeInTheDocument();
  });

  it('starts open when told to, showing the edit fields straight away', () => {
    renderCard({}, { startOpen: true });
    expect(screen.getByLabelText('Role')).toBeInTheDocument();
  });

  it('edits every field and reports the whole updated entry', () => {
    const { onChange } = renderCard({}, { startOpen: true });
    fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'Staff Engineer' } });
    expect(onChange).toHaveBeenCalledWith({ ...BASE, title: 'Staff Engineer' });
  });

  it('turns the bullets textarea into an ordered list on change', () => {
    const { onChange } = renderCard({}, { startOpen: true });
    fireEvent.change(screen.getByLabelText(/bullet lines/i), { target: { value: 'Shipped X\nShipped Y' } });
    expect(onChange).toHaveBeenCalledWith({ ...BASE, bullets: ['Shipped X', 'Shipped Y'] });
  });

  it('toggles pinned and shows it on the collapsed summary', () => {
    const { onChange } = renderCard({}, { startOpen: true });
    fireEvent.click(screen.getByRole('button', { name: 'Pin' }));
    expect(onChange).toHaveBeenCalledWith({ ...BASE, pinned: true });
  });

  it('shows a pinned marker on the collapsed row once pinned', () => {
    renderCard({ pinned: true });
    expect(screen.getByText('pinned')).toBeInTheDocument();
  });

  it('calls onRemove and onMove from their buttons', () => {
    const { onRemove, onMove } = renderCard({}, { startOpen: true });
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(onRemove).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Move down' }));
    expect(onMove).toHaveBeenCalledWith(1);
  });

  it('disables Move up on the first entry and Move down on the last', () => {
    renderCard({}, { startOpen: true, isFirst: true, isLast: true });
    expect(screen.getByRole('button', { name: 'Move up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move down' })).toBeDisabled();
  });
});
