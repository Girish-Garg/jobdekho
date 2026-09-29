import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('../api.js', () => ({ getPosting: vi.fn() }));

import { getPosting } from '../api.js';
import PostingDescription from './PostingDescription.jsx';
import { forgetDescriptions } from '../lib/fullDescription.js';

// Exactly as long as the store cuts a snippet, which is what marks it cut.
const SNIPPET = `HackerRank helps companies hire developers on skills. ${'Our platform is trusted by teams '.repeat(9)}`.slice(0, 280);
const posting = { id: 'p1', descriptionSnippet: SNIPPET };
const FULL = 'HackerRank helps companies hire.\n\nAbout the team\n\nYou will be a key member.\n\nWhat you will bring:\n- 5-10 years of B2B sales\n- A track record of new business';

beforeEach(() => {
  forgetDescriptions();
  getPosting.mockReset();
});

describe('PostingDescription', () => {
  it('paints the snippet first, then replaces it with the full body', async () => {
    getPosting.mockResolvedValue({ id: 'p1', descriptionText: FULL });
    render(<PostingDescription posting={posting} />);
    expect(screen.getByText(SNIPPET)).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'About the team' })).toBeInTheDocument();
    expect(screen.queryByText(SNIPPET)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'What you will bring' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(['5-10 years of B2B sales', 'A track record of new business']);
    expect(getPosting).toHaveBeenCalledWith('p1');
  });

  it('paints a posting opened before straight from the cache, without asking again', async () => {
    getPosting.mockResolvedValue({ id: 'p1', descriptionText: FULL });
    const first = render(<PostingDescription posting={posting} />);
    await screen.findByRole('heading', { name: 'About the team' });
    first.unmount();
    render(<PostingDescription posting={posting} />);
    expect(screen.getByRole('heading', { name: 'About the team' })).toBeInTheDocument();
    expect(getPosting).toHaveBeenCalledTimes(1);
  });

  it('folds a long body behind Show more, and opens it', async () => {
    const long = Array.from({ length: 12 }, (_, i) => `Paragraph ${i} ${'words that go on '.repeat(12)}`).join('\n\n');
    getPosting.mockResolvedValue({ id: 'p1', descriptionText: long });
    render(<PostingDescription posting={posting} />);
    const more = await screen.findByRole('button', { name: 'Show more' });
    expect(screen.queryByText(/^Paragraph 11/)).not.toBeInTheDocument();
    fireEvent.click(more);
    expect(screen.getByText(/^Paragraph 11/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show less' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('cleans markup a legacy row leaked before showing it', async () => {
    getPosting.mockResolvedValue({ id: 'p1', descriptionText: 'div class= content-intro p strong About PhonePe Limited: /strong /p p Headquartered in India. /p' });
    render(<PostingDescription posting={posting} />);
    expect(await screen.findByRole('heading', { name: 'About PhonePe Limited' })).toBeInTheDocument();
    expect(screen.getByText('Headquartered in India.')).toBeInTheDocument();
    expect(screen.queryByText(/class=/)).not.toBeInTheDocument();
  });

  it('keeps the snippet and says so when the full body does not load', async () => {
    getPosting.mockRejectedValue(new Error('GET -> 500'));
    render(<PostingDescription posting={posting} />);
    expect(await screen.findByText(/did not load/)).toBeInTheDocument();
    expect(screen.getByText(SNIPPET)).toBeInTheDocument();
  });

  it('says when the board only ever gave a preview', async () => {
    getPosting.mockResolvedValue({ id: 'p1', descriptionText: null });
    render(<PostingDescription posting={posting} />);
    expect(await screen.findByText(/only gave a preview/)).toBeInTheDocument();
  });
});
