import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
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

describe('PostingDetail and the company', () => {
  it('leads from the company name to all of its jobs, as the posting spells it', () => {
    const onCompany = vi.fn();
    render(<PostingDetail posting={{ ...posting, company: 'PHONEPE LIMITED' }} onClose={() => {}} onStatus={() => {}} onCompany={onCompany} />);
    fireEvent.click(screen.getByRole('button', { name: 'All jobs at PHONEPE LIMITED' }));
    expect(onCompany).toHaveBeenCalledWith('PHONEPE LIMITED');
  });

  it('names the company plainly where there is no feed to narrow', () => {
    setup();
    expect(screen.queryByRole('button', { name: 'All jobs at Acme' })).not.toBeInTheDocument();
    expect(screen.getByText('Acme')).toBeInTheDocument();
  });
});

describe('PostingDetail and AI', () => {
  // The mocks above fail the test if anything here reaches the server for AI.
  it('runs no AI of its own: no results, no refine box, only hand-offs to the chat', () => {
    setup();
    expect(screen.queryByPlaceholderText('What should change?')).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'AI' })).toBeInTheDocument();
  });

  it('opens the chat on this job without starting anything', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Ask AI about this job' }));
    expect(asked).toHaveBeenCalledWith(expect.objectContaining({ posting: expect.objectContaining({ id: 'p1' }), action: null }));
  });

  // The likeliest next steps are one click, but still run in the chat.
  it('hands each action to the chat by name', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Cover letter' }));
    expect(asked).toHaveBeenLastCalledWith(expect.objectContaining({ action: 'cover-letter' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tailor resume' }));
    expect(asked).toHaveBeenLastCalledWith(expect.objectContaining({ action: 'resume-tailor' }));
    fireEvent.click(screen.getByRole('button', { name: 'Is it real?' }));
    expect(asked).toHaveBeenLastCalledWith(expect.objectContaining({ action: 'fake-check' }));
  });

  it('asks whether a doubtful job is real instead, beside the evidence, and starts that check', () => {
    setup({ legitimacy: 'suspicious', ghostSignals: SIGNALS });
    const button = screen.getByRole('button', { name: 'Check whether this job is real' });
    expect(screen.getByRole('region', { name: 'Caution' })).toContainElement(button);
    expect(screen.queryByRole('button', { name: 'Ask AI about this job' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Is it real?' })).not.toBeInTheDocument();
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
    expect(screen.getByRole('region', { name: 'Caution' })).not.toContainElement(button);
  });

  it('still offers the check for a doubtful job that came with no listed signals', () => {
    setup({ legitimacy: 'suspicious', ghostSignals: [] });
    expect(screen.getByRole('button', { name: 'Check whether this job is real' })).toBeInTheDocument();
  });

  it('still shows the facts and the posting link', () => {
    setup();
    expect(screen.getByText('Internshala')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open posting' })).toHaveAttribute('href', 'https://example.com/p1');
  });

  it('names the job in the header, with a monogram and its level as a chip', () => {
    setup();
    expect(screen.getByRole('heading', { name: 'Frontend Intern' })).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'About this job' })).getByText('Internship')).toBeInTheDocument();
  });

  it('says so when a job states no pay, since that is a fact about it', () => {
    setup();
    expect(screen.getByText('Not stated')).toBeInTheDocument();
  });
});
