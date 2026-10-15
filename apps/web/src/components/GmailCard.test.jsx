import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import GmailCard from './GmailCard.jsx';
import { getMail, connectMail, disconnectMail } from '../api.js';

vi.mock('../api.js', () => ({ getMail: vi.fn(), connectMail: vi.fn(), disconnectMail: vi.fn(), getMailScan: vi.fn(async () => ({ connected: false })) }));

// Made-up values only.
const NONE = { connected: false, address: null, keptIn: null, savedAt: null, sentToday: 0 };
const ON = { connected: true, address: 'me@example.com', keptIn: 'windows', savedAt: '2026-10-15T00:00:00.000Z', sentToday: 3 };

beforeEach(() => {
  vi.clearAllMocks();
  getMail.mockResolvedValue(NONE);
  connectMail.mockResolvedValue(ON);
  disconnectMail.mockResolvedValue(NONE);
});

async function mount() {
  await act(async () => {
    render(<GmailCard />);
  });
}

const type = (address, password) => {
  fireEvent.change(screen.getByLabelText('Gmail address'), { target: { value: address } });
  fireEvent.change(screen.getByLabelText('App password'), { target: { value: password } });
};

describe('GmailCard', () => {
  it('says how to make an app password, and connects only with both fields', async () => {
    await mount();
    expect(screen.getByText('Not connected.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'myaccount.google.com/apppasswords' })).toHaveAttribute('href', 'https://myaccount.google.com/apppasswords');
    expect(screen.getByRole('button', { name: 'Connect' })).toBeDisabled();
    type('me@example.com', 'abcd efgh ijkl mnop');
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Connect' })));
    expect(connectMail).toHaveBeenCalledWith({ address: 'me@example.com', password: 'abcd efgh ijkl mnop' });
    expect(screen.getByText('Connected as me@example.com')).toBeInTheDocument();
    expect(screen.getByText(/protected storage\. 3 mails sent in the last 24 hours/)).toBeInTheDocument();
    expect(screen.getByLabelText('App password')).toHaveValue('');
  });

  it('says what Gmail said, and empties the password field either way', async () => {
    connectMail.mockRejectedValue(new Error('Gmail did not accept this address and app password.'));
    await mount();
    type('me@example.com', 'abcdefghijklmnop');
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Connect' })));
    expect(screen.getByText('Gmail did not accept this address and app password.')).toBeInTheDocument();
    expect(screen.getByLabelText('App password')).toHaveValue('');
  });

  it('disconnects', async () => {
    getMail.mockResolvedValue(ON);
    await mount();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Disconnect' })));
    await waitFor(() => expect(screen.getByText('Not connected.')).toBeInTheDocument());
    expect(disconnectMail).toHaveBeenCalled();
  });
});
