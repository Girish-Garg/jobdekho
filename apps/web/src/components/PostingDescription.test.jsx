import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';

vi.mock('../api.js', () => ({ getPosting: vi.fn(), describePosting: vi.fn() }));

import { getPosting, describePosting } from '../api.js';
import PostingDescription from './PostingDescription.jsx';
import { usePostingDetail } from '../lib/usePostingDetail.js';
import { forgetDetails } from '../lib/postingDetails.js';

// The pane's own wiring: the detail hook feeding the description.
function Description({ posting }) {
  const view = usePostingDetail(posting.id);
  return <PostingDescription posting={posting} view={view} />;
}

// Exactly as long as the store cuts a snippet, which is what marks it cut.
const SNIPPET = `HackerRank helps companies hire developers on skills. ${'Our platform is trusted by teams '.repeat(9)}`.slice(0, 280);
const posting = { id: 'p1', descriptionSnippet: SNIPPET };
const FULL = 'HackerRank helps companies hire.\n\nAbout the team\n\nYou will be a key member.\n\nWhat you will bring:\n- 5-10 years of B2B sales\n- A track record of new business';

beforeEach(() => {
  forgetDetails();
  getPosting.mockReset();
  describePosting.mockReset();
});

describe('PostingDescription with no headings read', () => {
  it('paints the snippet first, then replaces it with the full body', async () => {
    getPosting.mockResolvedValue({ id: 'p1', descriptionText: FULL, sections: null });
    render(<Description posting={posting} />);
    expect(screen.getByText(SNIPPET)).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'About the team' })).toBeInTheDocument();
    expect(screen.queryByText(SNIPPET)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'What you will bring' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(['5-10 years of B2B sales', 'A track record of new business']);
    expect(getPosting).toHaveBeenCalledWith('p1');
    expect(describePosting).not.toHaveBeenCalled();
  });

  it('paints a posting opened before straight from the cache, without asking again', async () => {
    getPosting.mockResolvedValue({ id: 'p1', descriptionText: FULL, sections: null });
    const first = render(<Description posting={posting} />);
    await screen.findByRole('heading', { name: 'About the team' });
    first.unmount();
    render(<Description posting={posting} />);
    expect(screen.getByRole('heading', { name: 'About the team' })).toBeInTheDocument();
    expect(getPosting).toHaveBeenCalledTimes(1);
  });

  it('folds a long body behind Show more, and opens it', async () => {
    const long = Array.from({ length: 12 }, (_, i) => `Paragraph ${i} ${'words that go on '.repeat(12)}`).join('\n\n');
    getPosting.mockResolvedValue({ id: 'p1', descriptionText: long, sections: null });
    render(<Description posting={posting} />);
    const more = await screen.findByRole('button', { name: 'Show more' });
    expect(screen.queryByText(/^Paragraph 11/)).not.toBeInTheDocument();
    fireEvent.click(more);
    expect(screen.getByText(/^Paragraph 11/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show less' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('cleans markup a legacy row leaked before showing it', async () => {
    getPosting.mockResolvedValue({ id: 'p1', descriptionText: 'div class= content-intro p strong About PhonePe Limited: /strong /p p Headquartered in India. /p', sections: null });
    render(<Description posting={posting} />);
    expect(await screen.findByRole('heading', { name: 'About PhonePe Limited' })).toBeInTheDocument();
    expect(screen.getByText('Headquartered in India.')).toBeInTheDocument();
    expect(screen.queryByText(/class=/)).not.toBeInTheDocument();
  });

  it('keeps the snippet and says so when the full body does not load', async () => {
    getPosting.mockRejectedValue(new Error('GET -> 500'));
    render(<Description posting={posting} />);
    expect(await screen.findByText(/did not load/)).toBeInTheDocument();
    expect(screen.getByText(SNIPPET)).toBeInTheDocument();
    expect(describePosting).not.toHaveBeenCalled();
  });
});

const SECTIONS = [
  { kind: 'other', heading: null, lines: ['Northwind builds payment rails for small shops.'], boilerplate: false },
  { kind: 'duties', heading: 'What you will do', lines: ['- Build the merchant dashboard', '- Own settlements'], boilerplate: false },
  { kind: 'requirements', heading: 'What we are looking for', lines: ['- 3 to 5 years of experience'], boilerplate: false },
  { kind: 'about', heading: 'About Northwind', lines: ['Northwind serves 40,000 shops across India.'], boilerplate: true },
  { kind: 'other', heading: null, lines: ['Northwind is an equal opportunity employer.'], boilerplate: true },
];
const FACTS = {
  years: { min: 3, max: 5, from: 'text', evidence: 'Says "3 to 5 years of experience"' },
  pay: { value: '₹ 4,00,000 /year', label: '₹4L/yr', currency: 'INR', monthly: 33333, from: 'board', evidence: 'Pay field: ₹ 4,00,000 /year' },
  workMode: { value: 'hybrid', from: 'text', evidence: 'Says "Workplace type: Hybrid"' },
};

describe('PostingDescription in sections', () => {
  beforeEach(() => {
    getPosting.mockResolvedValue({ id: 'p1', descriptionText: 'Northwind builds rails.', sections: SECTIONS, facts: FACTS });
  });

  it('reads in its sections, in order, under their headings, the opening summary first', async () => {
    render(<Description posting={posting} />);
    await screen.findByRole('heading', { name: 'What you will do' });
    expect(screen.getAllByRole('heading', { level: 4 }).map((h) => h.textContent)).toEqual(['What you will do', 'What we are looking for']);
    const area = screen.getByRole('region', { name: 'About the job' });
    expect(area.textContent.indexOf('Northwind builds payment rails')).toBeLessThan(area.textContent.indexOf('What you will do'));
    const items = within(area).getAllByRole('listitem').filter((li) => !li.closest('[aria-label="What the posting states"]'));
    expect(items.map((li) => li.textContent)).toEqual(['Build the merchant dashboard', 'Own settlements', '3 to 5 years of experience']);
  });

  // Never deleted: closed to start, the company text is still on the page.
  it('folds the company text and equal-opportunity lines under one toggle, closed to start', async () => {
    render(<Description posting={posting} />);
    const toggle = await screen.findByRole('button', { name: 'Show company text' });
    expect(screen.getAllByRole('button', { name: /company text/ })).toHaveLength(1);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('Northwind is an equal opportunity employer.')).not.toBeVisible();
    expect(screen.getByText('Northwind serves 40,000 shops across India.')).not.toBeVisible();
    fireEvent.click(toggle);
    expect(screen.getByText('Northwind is an equal opportunity employer.')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'About Northwind' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Hide company text' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('opens on a line of the facts the text states, each with its evidence', async () => {
    render(<Description posting={posting} />);
    const facts = await screen.findByRole('list', { name: 'What the posting states' });
    const values = [...facts.querySelectorAll('[tabindex="0"]')];
    // Each value names itself for a screen reader, which hears no icon.
    expect(values.map((value) => value.textContent)).toEqual(['Experience: 3 to 5 years', 'Pay: ₹4L/yr', 'Work mode: Hybrid']);
    expect(values[0]).toHaveAccessibleDescription('Says "3 to 5 years of experience"');
    expect(values[1]).toHaveAccessibleDescription('Pay field: ₹ 4,00,000 /year');
    expect(values[2]).toHaveAccessibleDescription('Says "Workplace type: Hybrid"');
  });
});
