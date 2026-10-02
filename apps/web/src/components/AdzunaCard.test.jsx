import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import AdzunaCard from './AdzunaCard.jsx';

vi.mock('../api.js', () => ({
  getAdzunaKey: vi.fn(),
  saveAdzunaKey: vi.fn(),
  removeAdzunaKey: vi.fn(),
  checkAdzunaKey: vi.fn(),
}));

import { getAdzunaKey, saveAdzunaKey, removeAdzunaKey, checkAdzunaKey } from '../api.js';

const NONE = { configured: false, from: null, appId: null, keyEnd: null, lastRun: null };
const SAVED = { configured: true, from: 'settings', appId: 'myappid', keyEnd: '1a2b', lastRun: null };
const KEY = 'f00dfeedcafe0000beef999912341a2b';

beforeEach(() => {
  vi.clearAllMocks();
  getAdzunaKey.mockResolvedValue(NONE);
  saveAdzunaKey.mockResolvedValue(SAVED);
  removeAdzunaKey.mockResolvedValue(NONE);
  checkAdzunaKey.mockResolvedValue({ ok: true, message: 'Adzuna accepted this key.' });
});

async function mount() {
  await act(async () => {
    render(<AdzunaCard />);
  });
  await waitFor(() => expect(screen.queryByText(/Looking for a saved key/)).not.toBeInTheDocument());
}

const idField = () => screen.getByLabelText('App id');
const keyField = () => screen.getByLabelText('App key');
const button = (name) => screen.getByRole('button', { name });

function type(appId, appKey) {
  fireEvent.change(idField(), { target: { value: appId } });
  fireEvent.change(keyField(), { target: { value: appKey } });
}

describe('AdzunaCard', () => {
  it('explains Adzuna in its own terms and links to a free key', async () => {
    await mount();
    expect(screen.getByRole('heading', { level: 3, name: 'Adzuna' })).toBeInTheDocument();
    expect(screen.getByText(/It says it searches thousands of job sites/)).toBeInTheDocument();
    expect(screen.getByText(/only its search terms and your key, never your profile or resume/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'developer.adzuna.com' })).toHaveAttribute('href', 'https://developer.adzuna.com');
    expect(screen.queryByText(/LinkedIn|Naukri/)).not.toBeInTheDocument();
  });

  it('says there is no key yet, and offers nothing to check or remove', async () => {
    await mount();
    expect(screen.getByText('No key yet, so refreshes leave Adzuna out.')).toBeInTheDocument();
    expect(button('Save')).toBeDisabled();
    expect(button('Check key')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
  });

  it('shows the saved key by its last four and where it came from', async () => {
    getAdzunaKey.mockResolvedValue(SAVED);
    await mount();
    expect(screen.getByText('Key ending 1a2b, from Settings')).toBeInTheDocument();
    expect(idField()).toHaveValue('myappid');
    expect(keyField()).toHaveValue('');
    expect(keyField()).toHaveAttribute('placeholder', 'Saved key ends 1a2b');
  });

  it('says so when the key comes from the environment, with nothing in Settings to remove', async () => {
    getAdzunaKey.mockResolvedValue({ ...SAVED, from: 'environment', keyEnd: '9z9z' });
    await mount();
    expect(screen.getByText('Key ending 9z9z, from ADZUNA_APP_ID and ADZUNA_APP_KEY')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
  });

  it('keeps the key hidden until asked to show it', async () => {
    await mount();
    expect(keyField()).toHaveAttribute('type', 'password');
    expect(keyField()).toHaveAttribute('autocomplete', 'off');
    fireEvent.click(button('Show key'));
    expect(keyField()).toHaveAttribute('type', 'text');
    expect(button('Show key')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(button('Show key'));
    expect(keyField()).toHaveAttribute('type', 'password');
  });

  it('saves both fields, then empties the key field and shows the saved state', async () => {
    await mount();
    type('myappid', KEY);
    fireEvent.click(button('Save'));
    await waitFor(() => expect(screen.getByText('Key ending 1a2b, from Settings')).toBeInTheDocument());
    expect(saveAdzunaKey).toHaveBeenCalledWith({ appId: 'myappid', appKey: KEY });
    expect(keyField()).toHaveValue('');
    expect(screen.getByText('Saved. Every refresh now includes Adzuna.')).toBeInTheDocument();
    expect(document.body.textContent).not.toContain(KEY);
  });

  it('shows the server\'s sentence when a save is refused, keeping what was typed', async () => {
    saveAdzunaKey.mockRejectedValue(new Error('An Adzuna app id and key are letters and numbers only.'));
    await mount();
    type('myappid', 'bad key');
    fireEvent.click(button('Save'));
    await waitFor(() => expect(screen.getByText(/letters and numbers only/)).toHaveClass('text-ember'));
    expect(keyField()).toHaveValue('bad key');
  });

  it('checks the typed pair before it is saved', async () => {
    checkAdzunaKey.mockResolvedValue({ ok: false, problem: 'rejected', message: 'Adzuna did not accept this app id and key.' });
    await mount();
    type('myappid', KEY);
    fireEvent.click(button('Check key'));
    await waitFor(() => expect(screen.getByText('Adzuna did not accept this app id and key.')).toHaveClass('text-ember'));
    expect(checkAdzunaKey).toHaveBeenCalledWith({ appId: 'myappid', appKey: KEY });
    expect(saveAdzunaKey).not.toHaveBeenCalled();
  });

  it('checks the key in use when nothing is typed', async () => {
    getAdzunaKey.mockResolvedValue(SAVED);
    await mount();
    fireEvent.click(button('Check key'));
    await waitFor(() => expect(screen.getByText('Adzuna accepted this key.')).toHaveClass('text-applied'));
    expect(checkAdzunaKey).toHaveBeenCalledWith({});
  });

  it('removes the saved key', async () => {
    getAdzunaKey.mockResolvedValue(SAVED);
    await mount();
    fireEvent.click(button('Remove'));
    await waitFor(() => expect(screen.getByText('No key yet, so refreshes leave Adzuna out.')).toBeInTheDocument());
    expect(removeAdzunaKey).toHaveBeenCalledTimes(1);
    expect(idField()).toHaveValue('');
    expect(screen.getByText('Removed from Settings.')).toBeInTheDocument();
  });

  it('says the environment key takes over once the saved one is removed', async () => {
    getAdzunaKey.mockResolvedValue(SAVED);
    removeAdzunaKey.mockResolvedValue({ ...SAVED, from: 'environment', appId: 'envid', keyEnd: '9z9z' });
    await mount();
    fireEvent.click(button('Remove'));
    await waitFor(() => expect(screen.getByText(/The key from ADZUNA_APP_ID and ADZUNA_APP_KEY is used instead/)).toBeInTheDocument());
    expect(screen.getByText('Key ending 9z9z, from ADZUNA_APP_ID and ADZUNA_APP_KEY')).toBeInTheDocument();
  });

  it('shows how Adzuna did in the last refresh', async () => {
    getAdzunaKey.mockResolvedValue({ ...SAVED, lastRun: { at: null, ok: false, count: 0, error: 'HTTP 401 for https://api.adzuna.com/x?app_key=REDACTED' } });
    await mount();
    expect(screen.getByText('Last refresh: Adzuna failed.')).toHaveAttribute('title', expect.stringContaining('HTTP 401'));
  });

  it('says so when the key could not be read', async () => {
    getAdzunaKey.mockRejectedValue(new Error('down'));
    await mount();
    expect(screen.getByText(/Could not read the Adzuna key/)).toBeInTheDocument();
  });
});
