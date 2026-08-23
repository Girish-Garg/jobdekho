import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProfileView from './ProfileView.jsx';

vi.mock('../api.js', () => ({
  getProfile: vi.fn(async () => null),
  putProfile: vi.fn(async (p) => ({ ...p, resumeName: null })),
  uploadResume: vi.fn(async () => PROFILE),
  applyProfileFilter: vi.fn(async () => ({})),
  deleteProfile: vi.fn(async () => null),
}));

import { getProfile, putProfile, uploadResume, applyProfileFilter, deleteProfile } from '../api.js';

const PROFILE = {
  skills: ['react'], titles: ['frontend intern'], locations: ['pune'],
  years: 1, degree: 'bachelors', resumeName: 'cv.pdf',
};

const pickFile = () =>
  fireEvent.change(screen.getByLabelText(/resume \(pdf\)/i), {
    target: { files: [new File(['%PDF'], 'cv.pdf', { type: 'application/pdf' })] },
  });

beforeEach(() => vi.clearAllMocks());

describe('ProfileView with no profile', () => {
  it('explains what a profile is for instead of showing blank fields', async () => {
    render(<ProfileView />);
    expect(await screen.findByRole('heading', { name: 'No profile yet' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Years of experience')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete profile' })).not.toBeInTheDocument();
    // The upload control is the main way in, so it stays visible.
    expect(screen.getByLabelText(/resume \(pdf\)/i)).toBeInTheDocument();
  });

  it('opens a blank form for building the profile by hand', async () => {
    render(<ProfileView />);
    fireEvent.click(await screen.findByRole('button', { name: 'Fill it in by hand' }));
    expect(screen.getByLabelText('Years of experience')).toBeInTheDocument();
    // Apply and delete act on the server's copy, which does not exist yet.
    expect(screen.queryByRole('button', { name: 'Use this for my alerts' })).not.toBeInTheDocument();
  });

  it('fills the form from an uploaded resume and shows its name', async () => {
    render(<ProfileView />);
    await screen.findByRole('heading', { name: 'No profile yet' });
    pickFile();
    expect(await screen.findByText('react')).toBeInTheDocument();
    expect(uploadResume).toHaveBeenCalled();
    expect(screen.getByText('On file: cv.pdf')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete profile' })).toBeInTheDocument();
  });

  it('shows the 422 extraction message verbatim', async () => {
    uploadResume.mockRejectedValueOnce(
      new Error('This PDF looks scanned. Export a text copy and retry.'),
    );
    render(<ProfileView />);
    await screen.findByRole('heading', { name: 'No profile yet' });
    pickFile();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This PDF looks scanned. Export a text copy and retry.',
    );
  });
});

describe('ProfileView with a saved profile', () => {
  beforeEach(() => getProfile.mockResolvedValue(PROFILE));

  it('loads every field for correction', async () => {
    render(<ProfileView />);
    expect(await screen.findByText('react')).toBeInTheDocument();
    expect(screen.getByLabelText('Years of experience')).toHaveValue(1);
    expect(screen.getByLabelText('Highest degree')).toHaveValue('bachelors');
    expect(screen.getByText('On file: cv.pdf')).toBeInTheDocument();
  });

  it('saves the edited fields and never sends resumeName', async () => {
    render(<ProfileView />);
    await screen.findByText('react');
    fireEvent.change(screen.getByLabelText('Years of experience'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));
    await waitFor(() =>
      expect(putProfile).toHaveBeenCalledWith({
        skills: ['react'], titles: ['frontend intern'], locations: ['pune'],
        years: 2, degree: 'bachelors',
      }),
    );
  });

  it('applies to alerts only after the confirm step', async () => {
    render(<ProfileView />);
    fireEvent.click(await screen.findByRole('button', { name: 'Use this for my alerts' }));
    expect(applyProfileFilter).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Overwrite my filter' }));
    await waitFor(() => expect(applyProfileFilter).toHaveBeenCalledTimes(1));
  });

  it('returns to the empty state after a confirmed delete', async () => {
    render(<ProfileView />);
    fireEvent.click(await screen.findByRole('button', { name: 'Delete profile' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete it' }));
    await waitFor(() => expect(deleteProfile).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('heading', { name: 'No profile yet' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Years of experience')).not.toBeInTheDocument();
  });
});
