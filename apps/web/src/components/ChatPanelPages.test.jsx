import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AiChatPanel from './AiChatPanel.jsx';
import { announceOpenPosting, onOpenPostingRequest } from '../lib/openPostingSignal.js';
import { announceOpenDocument } from '../lib/openDocumentSignal.js';

vi.mock('../api.js', () => ({
  getProviders: vi.fn(),
  getProviderPreference: vi.fn(async () => ({ provider: 'auto' })),
  getChatHistory: vi.fn(),
  sendChatMessage: vi.fn(),
  clearChatHistory: vi.fn(async () => null),
  getPostingAiResults: vi.fn(async () => []),
  runPostingAction: vi.fn(),
}));

import { getProviders, getChatHistory, sendChatMessage, getPostingAiResults } from '../api.js';

const CLAUDE = { id: 'claude', label: 'Claude Code', policies: ['none', 'web'], present: true, runs: true };
const JOB = { id: 'p9', title: 'Staff Engineer', company: 'Initech', legitimacy: 'high' };
const FILTERS = { levels: [], workModes: [], q: '', minFit: '' };
const TURN = {
  question: 'which are remote?', answer: 'Two of these are remote.', provider: 'claude', createdAt: '2026-09-29T10:00:00.000Z',
  refs: [{ id: 'p1', title: 'Frontend Intern', company: 'Acme', fit: 55 }],
  actions: [{ type: 'filters', patch: { workModes: ['remote'] }, label: 'Show remote' }],
};

function setup(page) {
  const apply = { setFilters: vi.fn(), setSort: vi.fn(), setView: vi.fn() };
  render(<AiChatPanel open onClose={() => {}} context={{ filters: FILTERS, sort: 'match', page }} apply={apply} />);
  return apply;
}

beforeEach(() => {
  vi.clearAllMocks();
  getProviders.mockResolvedValue([CLAUDE]);
  getChatHistory.mockResolvedValue({ turns: [] });
  sendChatMessage.mockResolvedValue(TURN);
  announceOpenPosting(JOB);
});

describe('the chat on a page other than the feed', () => {
  it('leaves the job in scope out, with its actions, and offers the page\'s own questions', async () => {
    setup('profile');
    fireEvent.click(await screen.findByRole('button', { name: 'Add a project I built' }));
    await waitFor(() => expect(sendChatMessage).toHaveBeenCalledWith(
      { message: 'Add a project I built', filters: FILTERS, sort: 'match', openPostingId: null, page: 'profile' },
      { onEvent: expect.any(Function) },
    ));
    expect(screen.queryByText('Staff Engineer')).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Actions for this job' })).not.toBeInTheDocument();
    expect(getPostingAiResults).not.toHaveBeenCalled();
  });

  it('suggests document requests on the resume page', async () => {
    setup('resume');
    expect(await screen.findByRole('button', { name: 'Make it fit one page' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Write a cover letter' })).toBeInTheDocument();
  });

  it('names the open document on the resume page and sends its id with the question', async () => {
    announceOpenDocument({ id: 'd1', name: 'Classic resume', kind: 'resume' });
    setup('resume');
    expect(await screen.findByText('Classic resume')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Make it fit one page' }));
    await waitFor(() => expect(sendChatMessage).toHaveBeenCalledWith(
      { message: 'Make it fit one page', filters: FILTERS, sort: 'match', openPostingId: null, page: 'resume', documentId: 'd1' },
      { onEvent: expect.any(Function) },
    ));
    announceOpenDocument(null);
  });

  it('sends no document on the resume page when none is open, so the chat can offer a new one', async () => {
    announceOpenDocument(null);
    setup('resume');
    fireEvent.click(await screen.findByRole('button', { name: 'Write a cover letter' }));
    await waitFor(() => expect(sendChatMessage).toHaveBeenCalledWith(
      expect.objectContaining({ page: 'resume', documentId: null }),
      expect.anything(),
    ));
    expect(screen.queryByText('Working on')).not.toBeInTheDocument();
  });

  it('takes the person to the feed when an answer\'s feed action is applied there', async () => {
    getChatHistory.mockResolvedValue({ turns: [TURN] });
    const apply = setup('settings');
    fireEvent.click(await screen.findByRole('button', { name: 'Show remote' }));
    expect(apply.setFilters).toHaveBeenCalledWith({ ...FILTERS, workModes: ['remote'] });
    expect(apply.setView).toHaveBeenCalledWith('postings');
  });

  it('takes the person to the feed when a job the answer named is clicked there, then opens it', async () => {
    getChatHistory.mockResolvedValue({ turns: [TURN] });
    const opened = vi.fn();
    const stop = onOpenPostingRequest(opened);
    const apply = { setFilters: vi.fn(), setSort: vi.fn(), setView: vi.fn() };
    const panel = (page) => <AiChatPanel open onClose={() => {}} context={{ filters: FILTERS, sort: 'match', page }} apply={apply} />;
    const { rerender } = render(panel('profile'));
    fireEvent.click(await screen.findByRole('button', { name: /Frontend Intern/ }));
    expect(apply.setView).toHaveBeenCalledWith('postings');
    expect(opened).not.toHaveBeenCalled();
    rerender(panel('postings'));
    await waitFor(() => expect(opened).toHaveBeenCalledWith('p1'));
    stop();
  });
});

describe('the chat on the feed', () => {
  it('keeps the job in scope and sends the page with the question', async () => {
    const apply = setup('postings');
    expect(await screen.findByText('Staff Engineer')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'How well do I fit this job?' }));
    await waitFor(() => expect(sendChatMessage).toHaveBeenCalledWith(
      expect.objectContaining({ openPostingId: 'p9', page: 'postings' }),
      expect.anything(),
    ));
    expect(apply.setView).not.toHaveBeenCalled();
  });
});
