import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CoverLetterResult from './CoverLetterResult.jsx';

const PROVIDERS = [{ id: 'claude', label: 'Claude Code' }];
const RESULT = {
  letter: 'Dear Hiring Team at Acme,\n\nI built a kanban board in React at Startup Co.\n\nRegards',
  usedFromResume: ['Built a kanban board in React'],
  notClaimed: ['2+ years with AWS'],
};
const record = (over = {}) => ({
  kind: 'cover-letter', postingId: 'p1', provider: 'claude', createdAt: new Date().toISOString(), result: { ...RESULT, ...over },
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CoverLetterResult', () => {
  it('shows the letter in an editable textarea and says edits are not saved', () => {
    render(<CoverLetterResult record={record()} providers={PROVIDERS} />);
    const textarea = screen.getByDisplayValue(/Dear Hiring Team at Acme/);
    expect(textarea.tagName).toBe('TEXTAREA');
    fireEvent.change(textarea, { target: { value: 'Edited letter text.' } });
    expect(screen.getByDisplayValue('Edited letter text.')).toBeInTheDocument();
    expect(screen.getByText(/not saved/i)).toBeInTheDocument();
  });

  it('lists what the letter drew on and what it left out', () => {
    render(<CoverLetterResult record={record()} providers={PROVIDERS} />);
    expect(screen.getByText('Draws on')).toBeInTheDocument();
    expect(screen.getByText('Built a kanban board in React')).toBeInTheDocument();
    expect(screen.getByText('Left out because your resume does not show it')).toBeInTheDocument();
    expect(screen.getByText('2+ years with AWS')).toBeInTheDocument();
  });

  it('leaves the lists out when there is nothing to say', () => {
    render(<CoverLetterResult record={record({ usedFromResume: [], notClaimed: [] })} providers={PROVIDERS} />);
    expect(screen.queryByText('Draws on')).not.toBeInTheDocument();
    expect(screen.queryByText('Left out because your resume does not show it')).not.toBeInTheDocument();
  });

  it('copies the current text of the textarea, edits included', async () => {
    const writeText = vi.fn(async () => {});
    Object.assign(navigator, { clipboard: { writeText } });
    render(<CoverLetterResult record={record()} providers={PROVIDERS} />);
    fireEvent.change(screen.getByDisplayValue(/Dear Hiring/), { target: { value: 'Changed.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    expect(writeText).toHaveBeenCalledWith('Changed.');
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument();
  });

  it('reports a failed copy without throwing', async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn(async () => { throw new Error('denied'); }) } });
    render(<CoverLetterResult record={record()} providers={PROVIDERS} />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    expect(await screen.findByText(/could not copy/i)).toBeInTheDocument();
  });

  it('says when it was written and by which CLI', () => {
    render(<CoverLetterResult record={record()} providers={PROVIDERS} />);
    expect(screen.getByText('Written today by Claude Code')).toBeInTheDocument();
  });

  it('never uses the ember accent outside an error', () => {
    const { container } = render(<CoverLetterResult record={record()} providers={PROVIDERS} />);
    expect(container.innerHTML).not.toMatch(/ember/);
  });
});
