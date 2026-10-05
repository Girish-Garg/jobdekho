import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// The chat panel and the job pane, each with its insides swapped for ones
// that throw on a bad posting, the way the drawing broke on data it did not
// expect. Each panel has to keep its way out.
vi.mock('./ChatPanelBody.jsx', () => ({ default: () => { throw new TypeError('the chat broke'); } }));
vi.mock('./PostingDetail.jsx', () => ({
  TITLE_ID: 'posting-title',
  default: ({ posting }) => {
    if (posting.id === 'bad') throw new TypeError('the posting broke');
    return <p>Detail of {posting.title}</p>;
  },
}));

import AiChatPanel from './AiChatPanel.jsx';
import PostingDetailSlot from './PostingDetailSlot.jsx';

let quiet;
beforeEach(() => { quiet = vi.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => { quiet.mockRestore(); });

const bad = { id: 'bad', title: 'Engineer', company: 'Constructor' };
const good = { id: 'good', title: 'Analyst', company: 'Acme' };

describe('a panel that cannot be drawn', () => {
  it('keeps the chat panel closable', () => {
    const onClose = vi.fn();
    render(<AiChatPanel open onClose={onClose} context={{}} apply={{}} />);
    expect(screen.getByText('The chat could not be shown')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('keeps the job pane closable, and draws the next job afresh', () => {
    const onClose = vi.fn();
    const { rerender } = render(<PostingDetailSlot isWide opened={bad} onClose={onClose} onStatus={() => {}} />);
    expect(screen.getByText('This job could not be shown')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
    rerender(<PostingDetailSlot isWide opened={good} onClose={onClose} onStatus={() => {}} />);
    expect(screen.getByText('Detail of Analyst')).toBeInTheDocument();
  });

  it('keeps the job dialog, below the wide breakpoint, named and closable', () => {
    const onClose = vi.fn();
    render(<PostingDetailSlot isWide={false} opened={bad} onClose={onClose} onStatus={() => {}} />);
    expect(screen.getByRole('dialog', { name: 'This job could not be shown' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });
});
