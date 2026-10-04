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
  legitimacy: 'high', ghostSignals: [], caution: [],
};
const FEE = [{ code: 'fee', reason: 'Asks applicants to pay a ₹1,500 registration fee', evidence: 'Pay Rs 1500 to register.' }];

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

  it('leads with whether a job with a caution is real, beside its reasons, and starts that check', () => {
    setup({ legitimacy: 'low', ghostSignals: [FEE[0].reason], caution: FEE });
    const card = screen.getByRole('region', { name: 'Caution' });
    const button = screen.getByRole('button', { name: 'Check whether this job is real' });
    expect(card).toContainElement(button);
    expect(card).toHaveTextContent('Asks applicants to pay a ₹1,500 registration fee');
    expect(screen.queryByText('Worth a second look')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ask AI about this job' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Is it real?' })).not.toBeInTheDocument();
    fireEvent.click(button);
    expect(asked).toHaveBeenCalledWith(expect.objectContaining({ action: 'fake-check' }));
  });

  // No pay and a short text are not doubts: without a stated red flag there
  // is no Caution card and no lead check.
  it('keeps the ordinary controls and no Caution card for a posting with no caution', () => {
    setup({ legitimacy: 'low', ghostSignals: ['no pay stated'], caution: [] });
    expect(screen.queryByRole('region', { name: 'Caution' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ask AI about this job' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Is it real?' })).toBeInTheDocument();
  });

  it('notes a thin posting quietly in grey, with no caution', () => {
    setup({ fewDetails: true });
    expect(screen.getByText('Few details.')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Caution' })).not.toBeInTheDocument();
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
