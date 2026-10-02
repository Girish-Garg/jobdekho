import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PostingPaneHeader from './PostingPaneHeader.jsx';

vi.mock('../api.js', () => ({ getCareersPage: vi.fn(async () => true) }));

beforeEach(() => vi.clearAllMocks());

const posting = { id: 'p1', company: 'PHONEPE LIMITED', title: 'Backend Engineer', source: 'internshala' };
const question = () => screen.queryByRole('group', { name: /Hide every job from/ });

describe('PostingPaneHeader and blocking the company', () => {
  // Block acts on the whole company, so it sits with the company's name.
  it('offers to block the company beside its name only where the feed can block', () => {
    const { rerender } = render(<PostingPaneHeader posting={posting} onCompany={() => {}} />);
    expect(screen.queryByRole('button', { name: 'Block company' })).not.toBeInTheDocument();
    rerender(<PostingPaneHeader posting={posting} onCompany={() => {}} onBlock={() => {}} />);
    expect(screen.getByRole('button', { name: 'Block company' })).toHaveAttribute('aria-expanded', 'false');
    expect(question()).not.toBeInTheDocument();
  });

  it('offers nothing to block for a posting that names no company', () => {
    render(<PostingPaneHeader posting={{ ...posting, company: '  ' }} onBlock={() => {}} />);
    expect(screen.queryByRole('button', { name: 'Block company' })).not.toBeInTheDocument();
  });

  it('asks first, in place, and blocks the company as the posting spells it', async () => {
    const onBlock = vi.fn(async () => {});
    render(<PostingPaneHeader posting={posting} onBlock={onBlock} />);
    fireEvent.click(screen.getByRole('button', { name: 'Block company' }));
    expect(screen.getByRole('button', { name: 'Block company' })).toHaveAttribute('aria-expanded', 'true');
    expect(question()).toBeInTheDocument();
    await screen.findByRole('checkbox', { name: "Also stop fetching PHONEPE LIMITED's careers page" });
    fireEvent.click(screen.getByRole('button', { name: 'Block' }));
    expect(onBlock).toHaveBeenCalledWith('PHONEPE LIMITED', { stopFetching: true });
  });

  it('puts the question away with Cancel or a second press, and blocks nothing', async () => {
    const onBlock = vi.fn();
    render(<PostingPaneHeader posting={posting} onBlock={onBlock} />);
    fireEvent.click(screen.getByRole('button', { name: 'Block company' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(question()).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Block company' }));
    fireEvent.click(screen.getByRole('button', { name: 'Block company' }));
    await waitFor(() => expect(question()).not.toBeInTheDocument());
    expect(onBlock).not.toHaveBeenCalled();
  });

  // j and k move the pane to the next job without remounting the header.
  it('asks about one job only, so the next job opens without the question', () => {
    const { rerender } = render(<PostingPaneHeader posting={posting} onBlock={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Block company' }));
    rerender(<PostingPaneHeader posting={{ ...posting, id: 'p2', company: 'Acme' }} onBlock={() => {}} />);
    expect(question()).not.toBeInTheDocument();
  });
});
