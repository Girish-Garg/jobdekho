import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, act } from '@testing-library/react';

vi.mock('../api.js', () => ({ getPosting: vi.fn(), describePosting: vi.fn() }));

import { getPosting, describePosting } from '../api.js';
import PostingDetail from './PostingDetail.jsx';
import { forgetDetails } from '../lib/postingDetails.js';

const noop = () => {};
const LINKEDIN_OFF = 'LinkedIn is switched off in Settings, so JobDekho does not contact it. Turn on "Include LinkedIn" to fetch this description.';
const refused = (status, error) => Object.assign(new Error(error), { status });

const row = {
  id: 'li1', source: 'linkedin', company: 'Crossing', title: 'Platform Engineer', location: 'India', url: 'https://example.com/li1',
  descriptionSnippet: '', status: 'saved', level: null, workMode: null, caution: [],
};
const bare = { ...row, status: null, descriptionText: '', sections: null, facts: null };
const DESCRIBED = {
  ...bare,
  descriptionText: 'You will run the platform.',
  sections: [
    { kind: 'other', heading: null, lines: ['Crossing runs payments for India.'], boilerplate: false },
    { kind: 'duties', heading: 'What you will do', lines: ['- Run the platform'], boilerplate: false },
  ],
  facts: { years: { min: 6, max: 10, from: 'text', evidence: 'Says "6 to 10 years of experience"' }, pay: null, workMode: null },
  level: 'senior', levelTag: { value: 'senior', from: 'text', evidence: 'Asks for 6 to 10 years' },
};

const open = (props = {}) => render(<PostingDetail posting={row} onClose={noop} onStatus={noop} {...props} />);

beforeEach(() => {
  forgetDetails();
  getPosting.mockReset();
  describePosting.mockReset();
  getPosting.mockResolvedValue(bare);
});

describe('a posting opened with no description', () => {
  it('is fetched once, calmly, then reads in its sections with its new tags', async () => {
    let finish;
    describePosting.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    open();
    expect(await screen.findByText('Fetching the full description from the board...')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'About the job' })).toHaveAttribute('aria-busy', 'true');

    await act(async () => finish({ posting: DESCRIBED, described: true }));
    expect(await screen.findByRole('heading', { name: 'What you will do' })).toBeInTheDocument();
    expect(screen.queryByText(/Fetching/)).not.toBeInTheDocument();
    const chips = screen.getByRole('list', { name: 'About this job' });
    expect(within(chips).getByText('Senior')).toHaveAccessibleDescription('Asks for 6 to 10 years');
    // The status is the row's, which the feed changed the moment it was pressed.
    expect(within(chips).getByText('Saved')).toBeInTheDocument();
    expect(describePosting).toHaveBeenCalledTimes(1);
    expect(describePosting).toHaveBeenCalledWith('li1');
  });

  it('says LinkedIn is switched off, with the way to Settings', async () => {
    describePosting.mockRejectedValue(refused(403, LINKEDIN_OFF));
    const onOpenSettings = vi.fn();
    open({ onOpenSettings });
    expect(await screen.findByText(LINKEDIN_OFF, { exact: false })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open Settings' }));
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it.each([
    [429, 'LinkedIn asked JobDekho to slow down, so it is left alone until 6 Oct.'],
    [409, 'This board publishes no description to fetch.'],
    [502, 'The board did not give a description for this posting. Try again tomorrow.'],
  ])('says in one quiet line why a %s came back, and never asks again', async (status, sentence) => {
    describePosting.mockRejectedValue(refused(status, sentence));
    const first = open();
    const line = await screen.findByText(sentence);
    expect(line).toHaveClass('text-muted');
    expect(line.className).not.toMatch(/ember/);
    first.unmount();
    open();
    expect(await screen.findByText(sentence)).toBeInTheDocument();
    expect(describePosting).toHaveBeenCalledTimes(1);
  });

  it('falls back to a plain line when no sentence came back', async () => {
    describePosting.mockRejectedValue(new TypeError('Failed to fetch'));
    open();
    expect(await screen.findByText('Could not fetch the description right now.')).toBeInTheDocument();
    expect(screen.queryByText('Failed to fetch')).not.toBeInTheDocument();
  });

  it('is never fetched for a posting that has its text', async () => {
    getPosting.mockResolvedValue({ ...bare, descriptionText: 'Already here.' });
    open();
    expect(await screen.findByText('Already here.')).toBeInTheDocument();
    expect(describePosting).not.toHaveBeenCalled();
  });
});
