import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import ProfileView from './ProfileView.jsx';
import { EMPTY_PROFILE } from '../lib/emptyProfile.js';
import { announceApplied } from '../lib/proposalAppliedSignal.js';
import { onChatDraft } from '../lib/chatDraftSignal.js';

vi.mock('../api.js', () => ({
  getProfile: vi.fn(async () => null),
  putProfile: vi.fn(async (p) => ({ ...p, resumeName: null })),
  uploadResume: vi.fn(async () => PROFILE),
  deleteProfile: vi.fn(async () => null),
  getProviders: vi.fn(async () => [CLAUDE]),
  extractProfile: vi.fn(async () => ({ ...PROFILE, skills: ['node'] })),
  // What the AI knows sits at the foot of the record (see MemorySection.jsx).
  getMemory: vi.fn(async () => ({ enabled: true, items: [], archived: 0 })),
}));

import {
  getProfile, putProfile, uploadResume, deleteProfile, extractProfile,
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

const WELCOME = /the quickest start is to upload your resume or tell the chat/i;

describe('ProfileView with no profile', () => {
  beforeEach(() => getProfile.mockResolvedValue(null));

  it('opens straight into the record, every section there with its add button', async () => {
    render(<ProfileView />);
    expect(await screen.findByRole('button', { name: 'Add role' })).toBeInTheDocument();
    for (const name of ['Add project', 'Add programme', 'Add certification', 'Add achievement', 'Add group']) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    }
    expect(screen.getByLabelText('Years of experience')).toBeInTheDocument();
    // The basics open for editing on a record with no name yet.
    expect(screen.getByRole('region', { name: 'Basics' })).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    // Nothing to press first, and no card standing in for the record.
    expect(screen.queryByRole('button', { name: 'Start writing it' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Start your profile' })).not.toBeInTheDocument();
    // Delete acts on the server's copy, which does not exist yet.
    expect(screen.queryByRole('button', { name: 'Delete profile' })).not.toBeInTheDocument();
    // The upload control is the main way in, so it stays visible.
    expect(screen.getByLabelText(/resume \(pdf\)/i)).toBeInTheDocument();
  });

  // The record opens ready to type into, so a profile that could not be read
  // must not be shown as a blank one that Save would write over it.
  it('says so when the saved profile could not be read, with no blank record to save, and retries', async () => {
    getProfile.mockRejectedValueOnce(new Error('offline'));
    render(<ProfileView />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not be read/);
    expect(screen.queryByRole('button', { name: 'Add role' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('button', { name: 'Add role' })).toBeInTheDocument();
    expect(screen.queryByText(/could not be read/)).not.toBeInTheDocument();
  });

  it('greets a first visit with the quickest ways in, until the profile is saved', async () => {
    render(<ProfileView />);
    expect(await screen.findByText(WELCOME)).toBeInTheDocument();
    expect(screen.getByText(/can also be typed in directly/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Asha Rao' } });
    // Typing alone does not take the greeting away: nothing is saved yet.
    expect(screen.getByText(WELCOME)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));
    await waitFor(() => expect(putProfile).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByText(WELCOME)).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Delete profile' })).toBeInTheDocument();
  });

  it('keeps the save bar away until something is typed, and again once it is typed back out', async () => {
    render(<ProfileView />);
    const name = await screen.findByLabelText('Name');
    expect(screen.queryByText('Your profile is not saved yet.')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save profile' })).not.toBeInTheDocument();
    fireEvent.change(name, { target: { value: 'Asha Rao' } });
    expect(screen.getByText('Your profile is not saved yet.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save profile' })).toBeInTheDocument();
    fireEvent.change(name, { target: { value: '' } });
    expect(screen.queryByRole('button', { name: 'Save profile' })).not.toBeInTheDocument();
  });

  it('shows the save bar for an entry added by hand, and saves it as the first write', async () => {
    render(<ProfileView />);
    fireEvent.click(await screen.findByRole('button', { name: 'Add role' }));
    fireEvent.change(await screen.findByLabelText('Role'), { target: { value: 'Backend Engineer' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));
    await waitFor(() => expect(putProfile).toHaveBeenCalledTimes(1));
    expect(putProfile.mock.calls[0][0].experience).toMatchObject([{ title: 'Backend Engineer' }]);
  });

  it('adopts the profile the upload returns and shows the file name', async () => {
    render(<ProfileView />);
    await screen.findByText(WELCOME);
    pickFile();
    expect(await screen.findByText('react')).toBeInTheDocument();
    expect(uploadResume).toHaveBeenCalled();
    expect(screen.getByText('cv.pdf')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete profile' })).toBeInTheDocument();
    // The upload saved a profile on the server, so the greeting has done its job.
    expect(screen.queryByText(WELCOME)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save profile' })).not.toBeInTheDocument();
  });

  it('offers to fill in from the resume only once one is on file', async () => {
    render(<ProfileView />);
    await screen.findByText(WELCOME);
    expect(screen.queryByRole('button', { name: 'Fill in from resume' })).not.toBeInTheDocument();
    pickFile();
    expect(await screen.findByRole('button', { name: 'Fill in from resume' })).toBeInTheDocument();
  });

  it('shows the 422 extraction message verbatim', async () => {
    uploadResume.mockRejectedValueOnce(
      new Error('This PDF looks scanned. Export a text copy and retry.'),
    );
    render(<ProfileView />);
    await screen.findByText(WELCOME);
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
    expect(screen.getByText('cv.pdf')).toBeInTheDocument();
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

  it('reviews a proposed certification and skill group and saves the ones kept', async () => {
    render(<ProfileView />);
    extractProfile.mockResolvedValueOnce({
      ...PROFILE,
      proposed: {
        experience: [], projects: [], education: [], achievements: [{ title: 'First place', organisation: 'Demo Hackathon' }],
        certifications: [{ title: 'Cloud Practitioner', organisation: 'Demo Cloud', link: 'https://demo.dev/cert' }],
        skillGroups: [{ name: 'Languages', items: ['Rust'] }],
      },
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Fill in from resume' }));
    fireEvent.click(screen.getByRole('button', { name: 'Overwrite and fill in' }));
    expect(await screen.findByText(/Found 1 certification, 1 achievement and 1 skill group to review/)).toBeInTheDocument();

    const skip = screen.getByText('First place at Demo Hackathon').closest('label');
    fireEvent.click(within(skip).getByRole('checkbox'));
    expect(screen.getByText('Languages: Rust')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add selected' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));
    await waitFor(() => expect(putProfile).toHaveBeenCalled());
    const [sent] = putProfile.mock.calls[0];
    expect(sent.certifications).toMatchObject([{ title: 'Cloud Practitioner', organisation: 'Demo Cloud', link: 'https://demo.dev/cert' }]);
    expect(sent.achievements).toEqual([]);
    expect(sent.skillGroups).toMatchObject([{ name: 'Languages', items: ['Rust'] }]);
    expect(sent.skills).toEqual(expect.arrayContaining(['react', 'rust']));
  });

  it('has no greeting and no save bar until something changes', async () => {
    render(<ProfileView />);
    await screen.findByText('react');
    expect(screen.queryByText(WELCOME)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save profile' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Years of experience'), { target: { value: '2' } });
    expect(screen.getByText('You have unsaved changes.')).toBeInTheDocument();
  });

  it('lands in the fresh, editable record after a confirmed delete', async () => {
    getProfile.mockResolvedValue({ ...PROFILE, basics: { ...EMPTY_PROFILE.basics, name: 'Asha Rao' } });
    render(<ProfileView />);
    // A named record keeps its basics form closed, so seeing it open below
    // means the record started over rather than just emptied.
    fireEvent.click(await screen.findByRole('button', { name: 'Delete profile' }));
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete it' }));
    await waitFor(() => expect(deleteProfile).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(WELCOME)).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Add role' })).toBeInTheDocument();
    expect(screen.getByLabelText('Years of experience')).toHaveValue(null);
    expect(screen.queryByRole('button', { name: 'Delete profile' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save profile' })).not.toBeInTheDocument();
  });
});

// jsdom has no matchMedia, which the view reads as narrow; a stub that says
// wide is how the rail gets exercised at all.
const setWidth = (wide) => {
  window.matchMedia = vi.fn(() => ({ matches: wide, addEventListener: () => {}, removeEventListener: () => {} }));
};

describe('ProfileView index at wide widths', () => {
  beforeEach(() => {
    getProfile.mockResolvedValue({ ...PROFILE, basics: { ...EMPTY_PROFILE.basics, name: 'Girish Garg', headline: 'Backend engineer' } });
    setWidth(true);
  });
  afterEach(() => { delete window.matchMedia; });

  it('heads the record with the name, and puts the section counts and the resume card in a rail', async () => {
    render(<ProfileView />);
    const rail = await screen.findByRole('complementary', { name: 'Record index' });
    const basics = screen.getByRole('region', { name: 'Basics' });
    expect(within(basics).getByRole('heading', { name: 'Girish Garg' })).toBeInTheDocument();
    expect(basics).toHaveTextContent('Backend engineer');
    expect(within(rail).getByRole('link', { name: 'Experience 0' })).toBeInTheDocument();
    expect(within(rail).getByRole('link', { name: 'Best fit' })).toBeInTheDocument();
    expect(within(rail).getByLabelText(/resume \(pdf\)/i)).toBeInTheDocument();
    expect(within(rail).getByRole('button', { name: 'Fill in from resume' })).toBeInTheDocument();
  });

  it('starts on Basics and counts a new entry the moment it is added', async () => {
    render(<ProfileView />);
    const rail = await screen.findByRole('complementary', { name: 'Record index' });
    expect(within(rail).getByRole('link', { name: 'Basics' })).toHaveAttribute('aria-current', 'location');
    fireEvent.click(screen.getByRole('button', { name: 'Add role' }));
    expect(within(rail).getByRole('link', { name: 'Experience 1' })).toBeInTheDocument();
  });

  it('scrolls to a section and marks it current when its line is clicked', async () => {
    render(<ProfileView />);
    const rail = await screen.findByRole('complementary', { name: 'Record index' });
    const target = document.getElementById('profile-projects');
    target.scrollIntoView = vi.fn();
    fireEvent.click(within(rail).getByRole('link', { name: 'Projects 0' }));
    expect(target.scrollIntoView).toHaveBeenCalledWith({ block: 'start' });
    expect(within(rail).getByRole('link', { name: 'Projects 0' })).toHaveAttribute('aria-current', 'location');
    expect(within(rail).getByRole('link', { name: 'Basics' })).not.toHaveAttribute('aria-current');
  });

  it('lists every section for a blank record too, each with a section to jump to', async () => {
    getProfile.mockResolvedValue(null);
    render(<ProfileView />);
    const rail = await screen.findByRole('complementary', { name: 'Record index' });
    const index = within(rail).getByRole('navigation', { name: 'Sections' });
    const lines = ['Basics', 'Experience 0', 'Projects 0', 'Education 0', 'Certifications 0', 'Achievements 0', 'Skills 0', 'Best fit', 'What the AI knows'];
    expect(within(index).getAllByRole('link')).toHaveLength(lines.length);
    for (const name of lines) expect(within(index).getByRole('link', { name })).toBeInTheDocument();
    // Not a hole where the record would be: every line has its section on the page.
    for (const link of within(index).getAllByRole('link')) {
      expect(document.getElementById(link.getAttribute('href').slice(1))).not.toBeNull();
    }
    expect(within(rail).getByLabelText(/resume \(pdf\)/i)).toBeInTheDocument();
    expect(within(rail).getByRole('link', { name: 'Basics' })).toHaveAttribute('aria-current', 'location');
  });
});

describe('ProfileView index below 1100px', () => {
  beforeEach(() => {
    getProfile.mockResolvedValue(PROFILE);
    setWidth(false);
  });
  afterEach(() => { delete window.matchMedia; });

  it('folds the rail into a sticky strip of section links above a one-column record', async () => {
    render(<ProfileView />);
    await screen.findByText('react');
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    const strip = screen.getByRole('navigation', { name: 'Sections' });
    expect(strip.parentElement).toHaveClass('sticky');
    expect(within(strip).getByRole('list')).toHaveClass('overflow-x-auto');
    expect(within(strip).getByRole('link', { name: 'Skills 0' })).toBeInTheDocument();
    // The resume card keeps its place at the head of the column.
    expect(screen.getByLabelText(/resume \(pdf\)/i)).toBeInTheDocument();
  });

  it('shows the strip for a blank record too, with no empty bar in its place', async () => {
    getProfile.mockResolvedValue(null);
    render(<ProfileView />);
    const strip = await screen.findByRole('navigation', { name: 'Sections' });
    expect(strip.parentElement).toHaveClass('sticky');
    expect(within(strip).getByRole('link', { name: 'Experience 0' })).toBeInTheDocument();
    expect(within(strip).getByRole('link', { name: 'Best fit' })).toBeInTheDocument();
  });
});

// A chat proposal applied while the page is open (see useAppliedProfile.js).
describe('ProfileView and the chat', () => {
  const APPLIED = {
    ...PROFILE,
    projects: [{ id: 'x1', title: 'CLI tool', organisation: '', location: '', startDate: '2024', endDate: '', bullets: ['Built a CLI in Go'], tech: ['Go'], link: '' }],
  };
  beforeEach(() => getProfile.mockResolvedValue(PROFILE));

  it('shows the record the chat saved as soon as it is applied, with nothing to save', async () => {
    render(<ProfileView />);
    await screen.findByText('react');
    act(() => announceApplied({ kind: 'profile', profile: APPLIED }));
    expect(await screen.findByText('CLI tool')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save profile' })).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('asks before replacing unsaved edits, and loads the applied version on request', async () => {
    render(<ProfileView />);
    await screen.findByText('react');
    fireEvent.change(screen.getByLabelText('Years of experience'), { target: { value: '4' } });
    act(() => announceApplied({ kind: 'profile', profile: APPLIED }));
    const notice = await screen.findByRole('status');
    expect(notice).toHaveTextContent('The chat changed your profile while you had unsaved edits');
    expect(screen.getByLabelText('Years of experience')).toHaveValue(4);
    expect(screen.queryByText('CLI tool')).not.toBeInTheDocument();
    fireEvent.click(within(notice).getByRole('button', { name: 'Load the applied version' }));
    expect(await screen.findByText('CLI tool')).toBeInTheDocument();
    expect(screen.getByLabelText('Years of experience')).toHaveValue(1);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('keeps the edits on request, and Discard then goes back to the applied version', async () => {
    render(<ProfileView />);
    await screen.findByText('react');
    fireEvent.change(screen.getByLabelText('Years of experience'), { target: { value: '4' } });
    act(() => announceApplied({ kind: 'profile', profile: APPLIED }));
    fireEvent.click(within(await screen.findByRole('status')).getByRole('button', { name: 'Keep editing' }));
    expect(screen.getByLabelText('Years of experience')).toHaveValue(4);
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(await screen.findByText('CLI tool')).toBeInTheDocument();
    expect(screen.getByLabelText('Years of experience')).toHaveValue(1);
  });

  it('opens the chat from the record with the start of a request, per section and from the top', async () => {
    const heard = vi.fn();
    const stop = onChatDraft(heard);
    render(<ProfileView />);
    await screen.findByText('react');
    fireEvent.click(screen.getByRole('button', { name: 'Add with AI: Projects' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add with AI: Skills' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add with AI: your profile' }));
    stop();
    expect(heard.mock.calls.map(([draft]) => draft.text)).toEqual(['Add a project: ', 'Add these skills: ', 'Add to my profile: ']);
  });
});

