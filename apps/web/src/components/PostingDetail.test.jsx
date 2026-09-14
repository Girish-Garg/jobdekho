import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import PostingDetail from './PostingDetail.jsx';

vi.mock('../api.js', () => ({
  getProviders: vi.fn(async () => [CLAUDE]),
  getPostingAiResults: vi.fn(async () => []),
  runPostingAction: vi.fn(),
}));

import { getProviders } from '../api.js';

const CLAUDE = { id: 'claude', label: 'Claude Code', install: 'https://claude.ai/code', policies: ['none', 'web'], present: true, runs: true, error: null };
const posting = {
  id: 'p1', source: 'internshala', company: 'Acme', title: 'Frontend Intern', location: 'Remote',
  url: 'https://example.com/p1', descriptionSnippet: 'Build the board.', status: null, level: 'internship',
  legitimacy: 'high', ghostSignals: [],
};

const setup = (over = {}) => render(<PostingDetail posting={{ ...posting, ...over }} onClose={() => {}} onStatus={() => {}} />);

beforeEach(() => {
  vi.clearAllMocks();
  getProviders.mockResolvedValue([CLAUDE]);
});

// The product call: a doubtful posting keeps its rank and its badge; the
// check moves to sit with the evidence.
describe('PostingDetail placement of the fake check', () => {
  it('puts the check in the AI section for a posting nobody doubts', async () => {
    setup();
    const button = await screen.findByRole('button', { name: 'Is this job real?' });
    expect(screen.getByText('AI')).toBeInTheDocument();
    expect(screen.queryByText('Caution')).not.toBeInTheDocument();
    expect(screen.getByText('AI').parentElement).toContainElement(button);
  });

  it('puts the check beside the caution list when the signals stack up, and moves only the check', async () => {
    setup({ legitimacy: 'suspicious', ghostSignals: ['no pay stated', 'very short job description', 'posted 4 months ago'] });
    const button = await screen.findByRole('button', { name: 'Is this job real?' });
    expect(screen.getByText('Caution').parentElement).toContainElement(button);
    // The rest of the AI section (other actions, not the fake check) still
    // renders where it always does; only the fake check itself relocates.
    expect(screen.getAllByRole('button', { name: 'Is this job real?' })).toHaveLength(1);
  });

  it('treats low legitimacy the same way', async () => {
    setup({ legitimacy: 'low', ghostSignals: ['no pay stated', 'posted 5 months ago'] });
    const button = await screen.findByRole('button', { name: 'Is this job real?' });
    expect(screen.getByText('Caution').parentElement).toContainElement(button);
  });

  it('keeps a single caution signal where it was, with the check further down', async () => {
    setup({ legitimacy: 'medium', ghostSignals: ['no pay stated'] });
    const button = await screen.findByRole('button', { name: 'Is this job real?' });
    expect(screen.getByText('Caution').parentElement).not.toContainElement(button);
    expect(screen.getByText('AI').parentElement).toContainElement(button);
  });

  it('still shows the facts and the posting link', async () => {
    setup();
    await screen.findByRole('button', { name: 'Is this job real?' });
    expect(screen.getByText('internshala')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open posting' })).toHaveAttribute('href', 'https://example.com/p1');
  });
});
