import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ExtractedEntriesReview from './ExtractedEntriesReview.jsx';

const PROPOSED = {
  experience: [{ title: 'Backend Engineer', organisation: 'Acme' }],
  projects: [{ title: 'Side project', organisation: '' }],
  education: [],
};

describe('ExtractedEntriesReview', () => {
  it('renders nothing when there is nothing proposed', () => {
    const { container } = render(
      <ExtractedEntriesReview proposed={{ experience: [], projects: [], education: [] }} onAdd={() => {}} onDismiss={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('lists every proposed entry, labelled by section, pre-checked', () => {
    render(<ExtractedEntriesReview proposed={PROPOSED} onAdd={() => {}} onDismiss={() => {}} />);
    expect(screen.getByText(/Backend Engineer at Acme/)).toBeInTheDocument();
    expect(screen.getByText(/Side project/)).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox').every((box) => box.checked)).toBe(true);
  });

  it('adds only the rows still checked, grouped back by section', () => {
    const onAdd = vi.fn();
    render(<ExtractedEntriesReview proposed={PROPOSED} onAdd={onAdd} onDismiss={() => {}} />);
    fireEvent.click(screen.getAllByRole('checkbox')[1]); // uncheck the project
    fireEvent.click(screen.getByRole('button', { name: 'Add selected' }));
    expect(onAdd).toHaveBeenCalledWith({ experience: PROPOSED.experience, projects: [], education: [] });
  });

  it('disables adding once nothing is checked', () => {
    render(<ExtractedEntriesReview proposed={{ experience: [{ title: 'A' }], projects: [], education: [] }} onAdd={() => {}} onDismiss={() => {}} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('button', { name: 'Add selected' })).toBeDisabled();
  });

  it('dismisses without adding anything', () => {
    const onAdd = vi.fn();
    const onDismiss = vi.fn();
    render(<ExtractedEntriesReview proposed={PROPOSED} onAdd={onAdd} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onDismiss).toHaveBeenCalled();
    expect(onAdd).not.toHaveBeenCalled();
  });
});
