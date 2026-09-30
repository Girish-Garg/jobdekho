import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
  it('shows the letter in an editable textarea and says documents are made from it as edited', () => {
    render(<CoverLetterResult record={record()} providers={PROVIDERS} />);
    const textarea = screen.getByDisplayValue(/Dear Hiring Team at Acme/);
    expect(textarea.tagName).toBe('TEXTAREA');
    fireEvent.change(textarea, { target: { value: 'Edited letter text.' } });
    expect(screen.getByDisplayValue('Edited letter text.')).toBeInTheDocument();
    expect(screen.getByText(/made from the text as it is here/)).toBeInTheDocument();
  });

  // The documents take the letter as the person left it, not as saved.
  it('makes the letter, or the letter and a tailored resume, from the edited text', async () => {
    const onMakeLetter = vi.fn(async () => {});
    const onMakeBoth = vi.fn(async () => {});
    render(<CoverLetterResult record={record()} providers={PROVIDERS} onMakeLetter={onMakeLetter} onMakeBoth={onMakeBoth} />);
    fireEvent.change(screen.getByDisplayValue(/Dear Hiring Team/), { target: { value: 'My version.' } });
    fireEvent.click(screen.getByRole('button', { name: /Just the letter/ }));
    expect(onMakeLetter).toHaveBeenCalledWith('My version.');
    await waitFor(() => expect(screen.getByRole('button', { name: /Tailor my resume and make both/ })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: /Tailor my resume and make both/ }));
    expect(onMakeBoth).toHaveBeenCalledWith('My version.', false);
    expect(screen.getByText(/Tailoring your resume for this job runs first/)).toBeInTheDocument();
  });

  it('says it will use the tailoring already made for the job', () => {
    render(<CoverLetterResult record={record()} providers={PROVIDERS} tailored onMakeLetter={vi.fn()} onMakeBoth={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Make the letter and a tailored resume/ })).toBeInTheDocument();
    expect(screen.getByText(/from this job's tailoring/)).toBeInTheDocument();
  });

  it('offers no document buttons where nothing can make one', () => {
    render(<CoverLetterResult record={record()} providers={PROVIDERS} />);
    expect(screen.queryByRole('button', { name: /Just the letter/ })).not.toBeInTheDocument();
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
