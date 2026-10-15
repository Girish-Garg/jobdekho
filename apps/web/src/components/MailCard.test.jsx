import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import MailCard from './MailCard.jsx';
import { applyProposal, discardProposal, editMailDraft, getMail, listDocuments } from '../api.js';
import { holdMail, resetMailDrafts } from '../lib/mailDrafts.js';
import { resetMailAccount } from '../lib/mailAccount.js';
import { resetQuestionDock } from '../lib/questionDock.js';

vi.mock('../api.js', () => ({
  applyProposal: vi.fn(), discardProposal: vi.fn(), editMailDraft: vi.fn(), getMail: vi.fn(), listDocuments: vi.fn(),
}));

let n = 0;
const MAIL = () => ({
  id: `card${(n += 1)}`, kind: 'mail', summary: 'Mail to Priya', status: 'pending', to: 'priya@acme.example', name: 'Priya',
  company: 'Acme Labs', role: 'Backend intern', subject: 'Backend internship', body: 'Hi Priya,\n\nI read your post.',
  attach: 'd1', attachName: 'Jane Doe Resume', mailedBefore: null, sentAt: null, from: null, reason: '',
});

beforeEach(() => {
  vi.clearAllMocks();
  resetMailDrafts();
  resetQuestionDock();
  resetMailAccount();
  getMail.mockResolvedValue({ connected: true, address: 'jane@example.com' });
  listDocuments.mockResolvedValue([]);
  applyProposal.mockResolvedValue({ proposal: { status: 'applied', sentAt: '2026-10-15T10:00:00.000Z', from: 'jane@example.com' } });
  editMailDraft.mockImplementation(async (id, patch) => ({ proposal: { id, ...patch } }));
});

async function mount(proposal, props = {}) {
  await act(async () => {
    render(<MailCard proposal={proposal} chatId="chat1" {...props} />);
  });
}

const button = (name) => screen.getByRole('button', { name });

describe('MailCard', () => {
  it('shows the mail as it will go, and waits for Send when it is from before', async () => {
    await mount(MAIL());
    expect(screen.getByText('Priya <priya@acme.example>')).toBeInTheDocument();
    expect(screen.getByText('Backend internship')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe Resume.pdf')).toBeInTheDocument();
    expect(screen.getByText('It goes only when you press Send.')).toBeInTheDocument();
    fireEvent.click(button('Send'));
    await waitFor(() => expect(screen.getByText('from jane@example.com.')).toBeInTheDocument());
    expect(applyProposal).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'See it in your Tracker' })).toBeInTheDocument();
  });

  it('counts down with Stop, Edit and Send now, and Stop leaves it waiting', async () => {
    const one = MAIL();
    await mount(one);
    act(() => holdMail(one.id, 'chat1'));
    expect(screen.getByText(/Sends in 0:2\d/)).toBeInTheDocument();
    expect(button('Send now')).toBeInTheDocument();
    fireEvent.click(button('Stop'));
    expect(screen.getByText('It goes only when you press Send.')).toBeInTheDocument();
    expect(applyProposal).not.toHaveBeenCalled();
  });

  it('saves an edit as the mail that will go, without sending it', async () => {
    const one = MAIL();
    await mount(one);
    fireEvent.click(button('Edit'));
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'About the internship' } });
    await act(async () => fireEvent.click(button('Save changes')));
    expect(editMailDraft).toHaveBeenCalledWith(one.id, { to: 'priya@acme.example', subject: 'About the internship', body: one.body });
    expect(screen.getByText('About the internship')).toBeInTheDocument();
    expect(applyProposal).not.toHaveBeenCalled();
  });

  it('asks to connect Gmail instead of offering Send when there is none', async () => {
    getMail.mockResolvedValue({ connected: false });
    const toSettings = vi.fn();
    await mount(MAIL(), { onOpenSettings: toSettings });
    expect(screen.getByText('Connect Gmail in Settings to send it.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send' })).not.toBeInTheDocument();
    fireEvent.click(button('Open Settings'));
    expect(toSettings).toHaveBeenCalled();
  });

  it('says why a mail cannot be sent, and when an address was mailed before', async () => {
    await mount({ ...MAIL(), status: 'refused', reason: 'JobDekho only mails an address you typed in this chat.' });
    expect(screen.getByText('JobDekho only mails an address you typed in this chat.')).toBeInTheDocument();
    await mount({ ...MAIL(), mailedBefore: '2026-10-01T10:00:00.000Z' });
    expect(screen.getByText(/so this one waits for you to press Send/)).toBeInTheDocument();
  });

  it('discards it', async () => {
    discardProposal.mockResolvedValue(null);
    await mount(MAIL());
    await act(async () => fireEvent.click(button('Discard')));
    expect(screen.getByText('Discarded. Nothing was sent.')).toBeInTheDocument();
  });
});
