import { StrictMode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ApplyAssistButton from './ApplyAssistButton.jsx';
import PostingFooter from './PostingFooter.jsx';
import { resetApplyBrowser } from '../lib/useApplyBrowser.js';
import * as api from '../api/apply.js';
import { connectApply } from '../lib/applySocket.js';

vi.mock('../api/apply.js', () => ({
  getApplyBrowser: vi.fn(),
  openApply: vi.fn(),
  currentApply: vi.fn(),
  closeApply: vi.fn(async () => null),
  fillApply: vi.fn(async () => ({})),
  takeOverApply: vi.fn(async () => ({})),
  showApplyWindow: vi.fn(async () => ({})),
  getApplyCopy: vi.fn(async () => ({ rows: [{ label: 'Email', value: 'demo@example.com' }], coverLetter: 'Dear Hiring Team,', hasResume: true })),
  askApply: vi.fn(),
  stopApplyAsk: vi.fn(async () => ({ stopped: true })),
  APPLY_RESUME_URL: '/api/apply/resume',
  applyFileUrl: (id, kind) => `/f/${id}/${kind}`,
  applySocketUrl: (id) => `ws://test/${id}`,
}));
vi.mock('../lib/applySocket.js', () => ({ connectApply: vi.fn(() => ({ send: vi.fn(), close: vi.fn() })) }));

const POSTING = { id: 'p1', source: 'lever:cred', title: 'SRE', company: 'CRED', url: 'https://jobs.lever.co/cred/abc', status: null };
const VIEW = {
  id: 's1', postingId: 'p1', state: 'yours', reason: 'check-page', message: 'This page is filled as far as JobDekho can go.',
  url: 'https://jobs.lever.co/cred/abc/apply', title: 'Apply', browser: 'Microsoft Edge', canPopOut: true, shown: false,
  rows: [{ fid: 'f1', label: 'Full name', status: 'filled', preview: 'Demo Candidate', rect: { x: 0, y: 0, w: 10, h: 10 } }],
  submit: null, files: { resume: 'Demo Candidate Resume.pdf', cover: null }, picker: null, chooser: null, dialog: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  resetApplyBrowser();
  api.getApplyBrowser.mockResolvedValue({ browser: { name: 'Microsoft Edge' }, canPopOut: true });
  api.openApply.mockResolvedValue({ session: VIEW, token: 'tok' });
});

describe('ApplyAssistButton', () => {
  const ON_BOARD = { ...POSTING, id: 'b1', source: 'linkedin', url: 'https://in.linkedin.com/jobs/view/1' };

  // One application the person picked, on a board too: they sign in and
  // submit themselves, and the panel says once what the board's terms say.
  it('opens a job-board posting in Apply assist like any other, with the board\'s note', async () => {
    const note = "LinkedIn's terms do not allow tools in your account.";
    api.openApply.mockResolvedValueOnce({ session: { ...VIEW, postingId: 'b1', board: note }, token: 'tok' });
    render(<ApplyAssistButton posting={ON_BOARD} />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Apply assist' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Apply assist' }));
    await waitFor(() => expect(api.openApply).toHaveBeenCalledWith('b1'));
    expect(await screen.findByText(note)).toBeInTheDocument();
  });

  it('is not there for a posting with no link', () => {
    render(<ApplyAssistButton posting={{ ...ON_BOARD, url: '' }} />);
    expect(screen.queryByRole('button', { name: 'Apply assist' })).not.toBeInTheDocument();
  });

  it('waits, with the reason, on a computer with no Chrome or Edge', async () => {
    api.getApplyBrowser.mockResolvedValue({ browser: null });
    render(<ApplyAssistButton posting={POSTING} />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Apply assist' })).toBeDisabled());
    expect(screen.getByRole('button', { name: 'Apply assist' })).toHaveAttribute('title', expect.stringMatching(/needs Google Chrome or Microsoft Edge/));
  });

  it('sits beside Open posting in the footer', async () => {
    render(<PostingFooter posting={POSTING} onStatus={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Apply assist' })).toBeEnabled());
    expect(screen.getByRole('link', { name: /Open posting/ })).toBeInTheDocument();
  });
});

describe('ApplyPanel', () => {
  async function openPanel(onStatus = vi.fn()) {
    render(<ApplyAssistButton posting={POSTING} onStatus={onStatus} />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Apply assist' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Apply assist' }));
    await waitFor(() => expect(connectApply).toHaveBeenCalled());
    return connectApply.mock.calls[0][0];
  }

  it('opens the session, joins its socket with the token, and shows the page and its checklist', async () => {
    const link = await openPanel();
    expect(api.openApply).toHaveBeenCalledWith('p1');
    expect(link).toMatchObject({ url: 'ws://test/s1', token: 'tok' });
    expect(screen.getByText('jobs.lever.co')).toBeInTheDocument();
    expect(screen.getByText(/Your turn/)).toBeInTheDocument();
    // The AI to ask comes first; the checklist is a tab away.
    expect(screen.getByRole('region', { name: 'Ask AI about this form' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'On this page' }));
    expect(screen.getByText('Full name')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Fill this page' }));
    expect(api.fillApply).toHaveBeenCalledWith('s1');
  });

  it('follows the view the socket sends, up to the final review', async () => {
    const link = await openPanel();
    act(() => link.onView({ ...VIEW, state: 'review', reason: 'review', message: 'JobDekho has not pressed Submit and never will.' }));
    expect(screen.getByText(/Review and submit it yourself/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Submit/ })).not.toBeInTheDocument();
  });

  it('hands over a file chooser, and pops the same window out on request', async () => {
    const link = await openPanel();
    act(() => link.onView({ ...VIEW, chooser: { multiple: false } }));
    expect(screen.getByRole('dialog', { name: 'The site asks for a file' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Pop out' }));
    expect(api.showApplyWindow).toHaveBeenCalledWith('s1', true);
  });

  it('keeps the details to copy one press away, and closes the browser on Close', async () => {
    await openPanel();
    fireEvent.click(screen.getByRole('tab', { name: 'Copy your details' }));
    await waitFor(() => expect(screen.getByText('demo@example.com')).toBeInTheDocument());
    expect(screen.getByText('Dear Hiring Team,')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Demo Candidate Resume.pdf' })).toHaveAttribute('href', '/f/s1/resume');
    fireEvent.click(screen.getByRole('button', { name: 'Close Apply assist' }));
    await waitFor(() => expect(api.closeApply).toHaveBeenCalledWith('s1'));
  });

  it('keeps to one session and one socket when React mounts the panel twice', async () => {
    // Development rehearses every mount: two opens, the second answered
    // "already open" by the server, which starts one browser at a time.
    api.openApply
      .mockResolvedValueOnce({ session: VIEW, token: 'tok' })
      .mockRejectedValueOnce(Object.assign(new Error('An application is already open: SRE at CRED.'), { status: 409 }));
    api.currentApply.mockResolvedValue({ session: VIEW, token: 'tok' });
    render(<StrictMode><ApplyAssistButton posting={POSTING} /></StrictMode>);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Apply assist' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Apply assist' }));
    await waitFor(() => expect(screen.getByRole('region', { name: 'Ask AI about this form' })).toBeInTheDocument());
    expect(api.openApply).toHaveBeenCalledTimes(2);
    expect(connectApply).toHaveBeenCalledTimes(1);
    expect(connectApply.mock.calls[0][0]).toMatchObject({ url: 'ws://test/s1', token: 'tok' });
    expect(api.closeApply).not.toHaveBeenCalled();
  });

  it('closes a session that was still opening when the person closed the panel', async () => {
    let answer;
    api.openApply.mockImplementation(() => new Promise((resolve) => { answer = resolve; }));
    render(<ApplyAssistButton posting={POSTING} />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Apply assist' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Apply assist' }));
    await screen.findByText(/Opening the application/);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await act(async () => answer({ session: VIEW, token: 'tok' }));
    expect(api.closeApply).toHaveBeenCalledWith('s1');
    expect(connectApply).not.toHaveBeenCalled();
  });

  it('reports another posting\'s open session without closing it on its own', async () => {
    api.openApply.mockRejectedValue(Object.assign(new Error('An application is already open: X at Y.'), { status: 409 }));
    api.currentApply.mockResolvedValue({ session: { ...VIEW, id: 's9', postingId: 'p9' }, token: 't9' });
    render(<ApplyAssistButton posting={POSTING} />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Apply assist' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Apply assist' }));
    await waitFor(() => expect(screen.getByText('Another application is still open')).toBeInTheDocument());
    expect(api.closeApply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Close that one and open this' }));
    await waitFor(() => expect(api.closeApply).toHaveBeenCalledWith('s9'));
  });
});
