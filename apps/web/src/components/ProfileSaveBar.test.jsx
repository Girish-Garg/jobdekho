import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProfileSaveBar from './ProfileSaveBar.jsx';

describe('ProfileSaveBar', () => {
  it('is not there while nothing is unsaved', () => {
    const { container } = render(<ProfileSaveBar dirty={false} fresh={false} onSave={vi.fn()} onDiscard={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('says there are unsaved changes, and saves or discards them', async () => {
    const onSave = vi.fn(async () => {});
    const onDiscard = vi.fn();
    render(<ProfileSaveBar dirty fresh={false} onSave={onSave} onDiscard={onDiscard} />);
    expect(screen.getByText('You have unsaved changes.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(onDiscard).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
  });

  // Nothing is on the server yet, so there is nothing to go back to.
  it('offers only the save on a record never saved, once something is entered', () => {
    render(<ProfileSaveBar dirty fresh onSave={vi.fn()} onDiscard={vi.fn()} />);
    expect(screen.getByText('Your profile is not saved yet.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Discard' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save profile' })).toBeInTheDocument();
  });

  // A first visit that has typed nothing is not nagged to save a blank record.
  it('is not there on a record never saved while nothing is entered', () => {
    const { container } = render(<ProfileSaveBar dirty={false} fresh onSave={vi.fn()} onDiscard={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
