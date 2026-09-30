import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, fireEvent, within } from '@testing-library/react';
import SetupCard from './SetupCard.jsx';

vi.mock('../api.js', () => ({ getSetup: vi.fn() }));

import { getSetup } from '../api.js';

// The checks the way the server's setup/checks.js writes them.
const CHECKS = [
  { id: 'ai', label: 'An AI to answer with', state: 'ok', detail: 'Claude Code runs here.', fix: null },
  {
    id: 'latex', label: 'PDF making', state: 'missing', detail: 'No LaTeX was found.',
    fix: 'Install MiKTeX from https://miktex.org/download on Windows, or TeX Live from https://tug.org/texlive elsewhere, then restart JobDekho.',
  },
  { id: 'profile', label: 'Your profile', state: 'ok', detail: 'Postings are ranked against your 3 skills.', fix: 'never shown' },
  { id: 'postings', label: 'Postings', state: 'missing', detail: 'No postings are stored yet.', fix: 'Refresh postings from the Postings page.' },
  { id: 'web', label: 'Web search', state: 'optional', detail: 'No AI here can search the web right now.', fix: 'Sign in with "ollama signin".' },
];
const ALL_OK = CHECKS.map((c) => ({ ...c, state: 'ok', fix: null }));

beforeEach(() => {
  vi.clearAllMocks();
  getSetup.mockResolvedValue(CHECKS);
});

async function mount() {
  await act(async () => {
    render(<SetupCard />);
  });
}

const row = (label) => screen.getByText(label).closest('li');

describe('SetupCard', () => {
  it('is a Settings card named Setup check, with a row per check in the server\'s order', async () => {
    await mount();
    const items = within(screen.getByRole('region', { name: 'Setup check' })).getAllByRole('listitem');
    const labels = ['An AI to answer with', 'PDF making', 'Your profile', 'Postings', 'Web search'];
    expect(items).toHaveLength(labels.length);
    labels.forEach((label, i) => expect(items[i].textContent.startsWith(label)).toBe(true));
  });

  it('shows each check\'s state and detail', async () => {
    await mount();
    expect(within(row('An AI to answer with')).getByText('Ready')).toBeInTheDocument();
    expect(within(row('PDF making')).getByText('Needed')).toBeInTheDocument();
    expect(within(row('Web search')).getByText('Optional')).toBeInTheDocument();
    expect(within(row('Postings')).getByText('No postings are stored yet.')).toBeInTheDocument();
  });

  it('shows the fix only where the check is not ok', async () => {
    await mount();
    expect(within(row('Postings')).getByText('Refresh postings from the Postings page.')).toBeInTheDocument();
    expect(within(row('Web search')).getByText('Sign in with "ollama signin".')).toBeInTheDocument();
    expect(screen.queryByText('never shown')).not.toBeInTheDocument();
  });

  it('turns the URLs in a fix into links, leaving the sentence\'s own punctuation out', async () => {
    await mount();
    const links = within(row('PDF making')).getAllByRole('link');
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['https://miktex.org/download', 'https://tug.org/texlive']);
    expect(links[0]).toHaveAttribute('target', '_blank');
    expect(row('PDF making')).toHaveTextContent('Install MiKTeX from https://miktex.org/download on Windows, or TeX Live');
  });

  it('counts what is left to do, and says when everything required is in place', async () => {
    await mount();
    expect(screen.getByText('2 to do')).toBeInTheDocument();
    getSetup.mockResolvedValue(ALL_OK);
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Check again' })));
    expect(screen.getByText('All set')).toBeInTheDocument();
  });

  it('checks again with a fresh probe, and holds the button while it runs', async () => {
    await mount();
    let finish;
    getSetup.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    act(() => { fireEvent.click(screen.getByRole('button', { name: 'Check again' })); });
    expect(getSetup).toHaveBeenLastCalledWith({ refresh: true });
    expect(screen.getByRole('button', { name: 'Checking...' })).toBeDisabled();
    await act(async () => finish(ALL_OK));
    expect(screen.getByRole('button', { name: 'Check again' })).toBeEnabled();
    expect(screen.queryByText('Needed')).not.toBeInTheDocument();
  });

  it('says so while the first check is on its way', () => {
    getSetup.mockReturnValue(new Promise(() => {}));
    render(<SetupCard />);
    expect(screen.getByText('Looking at this computer...')).toBeInTheDocument();
  });

  it('says the check could not run, and still offers to check again', async () => {
    getSetup.mockRejectedValue(new Error('server down'));
    await mount();
    expect(screen.getByRole('alert')).toHaveTextContent('Could not run the setup check.');
    expect(screen.getByRole('button', { name: 'Check again' })).toBeEnabled();
  });
});
