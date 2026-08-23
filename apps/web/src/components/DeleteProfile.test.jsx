import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DeleteProfile from './DeleteProfile.jsx';

vi.mock('../api.js', () => ({
  deleteProfile: vi.fn(async () => null),
}));

import { deleteProfile } from '../api.js';

beforeEach(() => vi.clearAllMocks());

const arm = () => fireEvent.click(screen.getByRole('button', { name: 'Delete profile' }));

describe('DeleteProfile', () => {
  it('arms instead of deleting on the first click', () => {
    render(<DeleteProfile onDeleted={() => {}} />);
    arm();
    expect(deleteProfile).not.toHaveBeenCalled();
    expect(screen.getByText(/removes the profile and the stored resume text/i)).toBeInTheDocument();
  });

  it('deletes on confirm and reports up', async () => {
    const onDeleted = vi.fn();
    render(<DeleteProfile onDeleted={onDeleted} />);
    arm();
    fireEvent.click(screen.getByRole('button', { name: 'Delete it' }));
    await waitFor(() => expect(deleteProfile).toHaveBeenCalledTimes(1));
    expect(onDeleted).toHaveBeenCalled();
  });

  it('stands down on cancel', () => {
    render(<DeleteProfile onDeleted={() => {}} />);
    arm();
    fireEvent.click(screen.getByRole('button', { name: 'Keep it' }));
    expect(deleteProfile).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Delete profile' })).toBeInTheDocument();
  });

  it('says so when the delete fails, and keeps the profile', async () => {
    deleteProfile.mockRejectedValueOnce(new Error('offline'));
    const onDeleted = vi.fn();
    render(<DeleteProfile onDeleted={onDeleted} />);
    arm();
    fireEvent.click(screen.getByRole('button', { name: 'Delete it' }));
    expect(await screen.findByText('Could not delete.')).toBeInTheDocument();
    expect(onDeleted).not.toHaveBeenCalled();
  });
});
