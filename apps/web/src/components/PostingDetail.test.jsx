import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PostingDetail from './PostingDetail.jsx';
import { onAskAboutPosting } from '../lib/askAiSignal.js';

// No AI runs in the pane any more, so nothing it renders may reach the
// server for one: these mocks fail the test if it tries.
vi.mock('../api.js', () => ({
  getProviders: vi.fn(() => { throw new Error('the pane probed for a CLI'); }),
  getPostingAiResults: vi.fn(() => { throw new Error('the pane read AI results'); }),
  runPostingAction: vi.fn(() => { throw new Error('the pane ran an AI action'); }),
}));

const posting = {
  id: 'p1', source: 'internshala', company: 'Acme', title: 'Frontend Intern', location: 'Remote',
  url: 'https://example.com/p1', descriptionSnippet: 'Build the board.', status: null, level: 'internship',
  legitimacy: 'high', ghostSignals: [],
};
const SIGNALS = ['no pay stated', 'very short job description', 'posted 4 months ago'];

const setup = (over = {}) => render(<PostingDetail posting={{ ...posting, ...over }} onClose={() => {}} onStatus={() => {}} />);

let asked;
let stop;
beforeEach(() => {
  asked = vi.fn();
  stop = onAskAboutPosting(asked);
});
afterEach(() => stop());

describe('PostingDetail and AI', () => {
  it('has no AI section of its own: no run buttons, no results, no refine box', () => {
    setup();
    expect(screen.queryByText('AI')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Is this job real?' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /cover letter/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /tailor/i })).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('What should change?')).not.toBeInTheDocument();
  });

  it('offers one control that opens the chat on this job, without starting anything', () => {
    setup();
    const buttons = screen.getAllByRole('button', { name: /AI|real/ });
    expect(buttons).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Ask AI about this job' }));
    expect(asked).toHaveBeenCalledWith(expect.objectContaining({ posting: expect.objectContaining({ id: 'p1' }), action: null }));
  });

  it('asks whether a doubtful job is real instead, beside the evidence, and starts that check', () => {
    setup({ legitimacy: 'suspicious', ghostSignals: SIGNALS });
    const button = screen.getByRole('button', { name: 'Check whether this job is real' });
    expect(screen.getByText('Caution').parentElement).toContainElement(button);
    expect(screen.queryByRole('button', { name: 'Ask AI about this job' })).not.toBeInTheDocument();
    fireEvent.click(button);
    expect(asked).toHaveBeenCalledWith(expect.objectContaining({ action: 'fake-check' }));
  });

  it('treats low legitimacy the same way', () => {
    setup({ legitimacy: 'low', ghostSignals: ['no pay stated', 'posted 5 months ago'] });
    expect(screen.getByRole('button', { name: 'Check whether this job is real' })).toBeInTheDocument();
  });

  it('keeps a single caution signal where it was, with the ordinary control further down', () => {
    setup({ legitimacy: 'medium', ghostSignals: ['no pay stated'] });
    const button = screen.getByRole('button', { name: 'Ask AI about this job' });
    expect(screen.getByText('Caution').parentElement).not.toContainElement(button);
  });

  it('still offers the check for a doubtful job that came with no listed signals', () => {
    setup({ legitimacy: 'suspicious', ghostSignals: [] });
    expect(screen.getByRole('button', { name: 'Check whether this job is real' })).toBeInTheDocument();
  });

  it('still shows the facts and the posting link', () => {
    setup();
    expect(screen.getByText('internshala')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open posting' })).toHaveAttribute('href', 'https://example.com/p1');
  });
});
