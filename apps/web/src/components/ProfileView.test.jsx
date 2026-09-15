import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import ProfileView from './ProfileView.jsx';
import { EMPTY_PROFILE } from '../lib/emptyProfile.js';

vi.mock('../api.js', () => ({
  getProfile: vi.fn(async () => null),
  putProfile: vi.fn(async (p) => ({ ...p, resumeName: null })),
  uploadResume: vi.fn(async () => PROFILE),
  applyProfileFilter: vi.fn(async () => ({})),
  deleteProfile: vi.fn(async () => null),
  getProviders: vi.fn(async () => [CLAUDE]),
  extractProfile: vi.fn(async () => ({ ...PROFILE, skills: ['node'] })),
}));

import {
  getProfile, putProfile, uploadResume, applyProfileFilter, deleteProfile, extractProfile,
} from '../api.js';

const PROFILE = {
  ...EMPTY_PROFILE,
  skills: ['react'], titles: ['frontend intern'], locations: ['pune'],
  years: 1, degree: 'bachelors', resumeName: 'cv.pdf',
};
const CLAUDE = {
  id: 'claude', label: 'Claude Code', install: 'https://claude.ai/code', policies: ['none', 'web'],
  present: true, path: 'C:\\npm\\claude.cmd', runs: true, version: '1.0.0', error: null,
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

  it('opens a blank career record for building the profile by hand', async () => {
    render(<ProfileView />);
    fireEvent.click(await screen.findByRole('button', { name: 'Fill it in by hand' }));
    expect(screen.getByLabelText('Years of experience')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Basics' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Experience/ })).toBeInTheDocument();
    // Apply and delete act on the server's copy, which does not exist yet.
    expect(screen.queryByRole('button', { name: 'Use this for my alerts' })).not.toBeInTheDocument();
  });

  it('adopts the profile the upload returns and shows the file name', async () => {
    render(<ProfileView />);
    await screen.findByRole('heading', { name: 'No profile yet' });
    pickFile();
    expect(await screen.findByText('react')).toBeInTheDocument();
    expect(uploadResume).toHaveBeenCalled();
    expect(screen.getByText('On file: cv.pdf')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete profile' })).toBeInTheDocument();
  });

  it('offers to fill in from the resume only once one is on file', async () => {
    render(<ProfileView />);
    await screen.findByRole('heading', { name: 'No profile yet' });
    expect(screen.queryByRole('button', { name: 'Fill in from resume' })).not.toBeInTheDocument();
    pickFile();
    expect(await screen.findByRole('button', { name: 'Fill in from resume' })).toBeInTheDocument();
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

  it('loads every flat field for correction', async () => {
    render(<ProfileView />);
    expect(await screen.findByText('react')).toBeInTheDocument();
    expect(screen.getByLabelText('Years of experience')).toHaveValue(1);
    expect(screen.getByLabelText('Highest degree')).toHaveValue('bachelors');
    expect(screen.getByText('On file: cv.pdf')).toBeInTheDocument();
  });

  it('saves the whole career record, deriving skills and never sending resumeName', async () => {
    render(<ProfileView />);
    await screen.findByText('react');
    fireEvent.change(screen.getByLabelText('Years of experience'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));
    await waitFor(() => expect(putProfile).toHaveBeenCalled());
    const [sent] = putProfile.mock.calls[0];
    expect(sent.resumeName).toBeUndefined();
    expect(sent).toMatchObject({
      skills: ['react'], titles: ['frontend intern'], locations: ['pune'], years: 2, degree: 'bachelors',
      basics: EMPTY_PROFILE.basics, experience: [], projects: [], skillGroups: [],
    });
  });

  it('adds a role to Experience, edits it and includes it in the next save', async () => {
    render(<ProfileView />);
    await screen.findByText('react');
    fireEvent.click(screen.getByRole('button', { name: 'Add role' }));
    const titleBox = await screen.findByLabelText('Role');
    fireEvent.change(titleBox, { target: { value: 'Backend Engineer' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));
    await waitFor(() => expect(putProfile).toHaveBeenCalled());
    const [sent] = putProfile.mock.calls[0];
    expect(sent.experience).toMatchObject([{ title: 'Backend Engineer' }]);
  });

  it('removes an experience entry from the section', async () => {
    render(<ProfileView />);
    await screen.findByText('react');
    fireEvent.click(screen.getByRole('button', { name: 'Add role' }));
    fireEvent.change(await screen.findByLabelText('Role'), { target: { value: 'Backend Engineer' } });
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(screen.queryByLabelText('Role')).not.toBeInTheDocument();
  });

  it('reorders two experience entries with Move down', async () => {
    render(<ProfileView />);
    await screen.findByText('react');
    fireEvent.click(screen.getByRole('button', { name: 'Add role' }));
    fireEvent.change(await screen.findByLabelText('Role'), { target: { value: 'First role' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add role' }));
    const roleBoxes = screen.getAllByLabelText('Role');
    fireEvent.change(roleBoxes[1], { target: { value: 'Second role' } });
    const [moveDown] = screen.getAllByRole('button', { name: 'Move down' });
    fireEvent.click(moveDown);
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));
    await waitFor(() => expect(putProfile).toHaveBeenCalled());
    const [sent] = putProfile.mock.calls[0];
    expect(sent.experience.map((e) => e.title)).toEqual(['Second role', 'First role']);
  });

  it('derives the flat skills field from the skill groups at save time', async () => {
    render(<ProfileView />);
    await screen.findByText('react');
    fireEvent.click(screen.getByRole('button', { name: 'Add group' }));
    fireEvent.change(screen.getByLabelText('Group name'), { target: { value: 'Languages' } });
    // The skill group's own tag box, first in the DOM ahead of the flat
    // Skills/Titles/Locations boxes further down in ProfileForm.
    const [groupTagBox] = screen.getAllByPlaceholderText('add...');
    fireEvent.change(groupTagBox, { target: { value: 'python' } });
    fireEvent.keyDown(groupTagBox, { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));
    await waitFor(() => expect(putProfile).toHaveBeenCalled());
    const [sent] = putProfile.mock.calls[0];
    expect(sent.skills).toEqual(expect.arrayContaining(['react', 'python']));
  });

  it('puts the extracted flat fields into the form after the overwrite warning', async () => {
    render(<ProfileView />);
    fireEvent.click(await screen.findByRole('button', { name: 'Fill in from resume' }));
    // The saved profile has fields, so the run waits for the confirm.
    expect(extractProfile).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Overwrite and fill in' }));
    expect(await screen.findByText('node')).toBeInTheDocument();
    expect(screen.queryByText('react')).not.toBeInTheDocument();
    expect(extractProfile).toHaveBeenCalledTimes(1);
  });

  it('reviews proposed experience entries without touching a hand-typed one', async () => {
    render(<ProfileView />);
    await screen.findByText('react');
    fireEvent.click(screen.getByRole('button', { name: 'Add role' }));
    fireEvent.change(await screen.findByLabelText('Role'), { target: { value: 'Hand typed role' } });

    extractProfile.mockResolvedValueOnce({
      ...PROFILE,
      proposed: { experience: [{ title: 'Proposed role', organisation: 'Acme' }], projects: [], education: [] },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Fill in from resume' }));
    fireEvent.click(screen.getByRole('button', { name: 'Overwrite and fill in' }));

    const panel = await screen.findByText(/found 1 entry/i);
    expect(within(panel.closest('div')).getByText(/Proposed role/)).toBeInTheDocument();
    // Nothing is written yet: the hand-typed entry is unchanged and no save happened.
    expect(screen.getByDisplayValue('Hand typed role')).toBeInTheDocument();
    expect(putProfile).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Add selected' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));
    await waitFor(() => expect(putProfile).toHaveBeenCalled());
    const [sent] = putProfile.mock.calls[0];
    expect(sent.experience.map((e) => e.title)).toEqual(['Hand typed role', 'Proposed role']);
  });

  it('dismisses a proposal review without changing the profile', async () => {
    render(<ProfileView />);
    extractProfile.mockResolvedValueOnce({
      ...PROFILE,
      proposed: { experience: [{ title: 'Proposed role' }], projects: [], education: [] },
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Fill in from resume' }));
    fireEvent.click(screen.getByRole('button', { name: 'Overwrite and fill in' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByText(/Proposed role/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Role')).not.toBeInTheDocument();
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
