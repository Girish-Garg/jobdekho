import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import MadeByAiMenu from './MadeByAiMenu.jsx';
import { onScreenId, onOpenChat } from '../lib/activeChat.js';
import { takeOpenRequest } from '../lib/openDocumentSignal.js';

vi.mock('../api.js', () => ({ getMadeByAi: vi.fn() }));

import { getMadeByAi } from '../api.js';

const today = new Date().toISOString();
const MADE = [
  { kind: 'cover-letter', at: today, postingId: 'pA', job: { title: 'Job A Engineer', company: 'AlphaCo' }, versions: 2 },
  { kind: 'document', at: today, documentId: 'd1', name: 'Classic resume', documentKind: 'resume', postingId: null, job: null },
  { kind: 'profile', at: today, summary: 'Add Go', chatId: 'g1' },
];

beforeEach(() => {
  vi.clearAllMocks();
  getMadeByAi.mockResolvedValue(MADE);
});

describe('Made by AI on the Resume page', () => {
  it('lists everything the AI made, read when it opens', async () => {
    render(<MadeByAiMenu />);
    expect(getMadeByAi).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Made by AI' }));
    const list = await screen.findByRole('dialog', { name: 'Made by AI' });
    expect(await within(list).findByText('Job A Engineer')).toBeInTheDocument();
    expect(within(list).getByText('Classic resume')).toBeInTheDocument();
    expect(within(list).getByText('Add Go')).toBeInTheDocument();
  });

  it('shows a job\'s results in the job\'s own chat, opening the panel on it', async () => {
    const opened = vi.fn();
    const stop = onOpenChat(opened);
    render(<MadeByAiMenu />);
    fireEvent.click(screen.getByRole('button', { name: 'Made by AI' }));
    const [jobRow] = await screen.findAllByRole('button', { name: 'Show in the chat' });
    fireEvent.click(jobRow);
    stop();
    expect(onScreenId()).toBe('job:pA');
    expect(opened).toHaveBeenCalledWith('job:pA');
  });

  it('opens a document in the workspace, and a profile change in the chat it was offered in', async () => {
    render(<MadeByAiMenu />);
    fireEvent.click(screen.getByRole('button', { name: 'Made by AI' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Open it' }));
    expect(takeOpenRequest()).toBe('d1');
    const rows = screen.getAllByRole('button', { name: 'Show in the chat' });
    fireEvent.click(rows.at(-1));
    expect(onScreenId()).toBe('g1');
  });
});
