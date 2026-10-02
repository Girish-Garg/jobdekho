import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BlockCompanyConfirm from './BlockCompanyConfirm.jsx';

vi.mock('../api.js', () => ({ getCareersPage: vi.fn(async () => false) }));

import { getCareersPage } from '../api.js';

beforeEach(() => vi.clearAllMocks());

const setup = (props = {}) => {
  const onBlock = props.onBlock ?? vi.fn(async () => {});
  const onCancel = vi.fn();
  render(<BlockCompanyConfirm company="Acme Foundation" onBlock={onBlock} onCancel={onCancel} />);
  return { onBlock, onCancel };
};

const blockButton = () => screen.getByRole('button', { name: 'Block' });

describe('BlockCompanyConfirm', () => {
  it('asks in place whether to hide every job from the company, now and later', async () => {
    setup();
    expect(screen.getByRole('group', { name: 'Hide every job from Acme Foundation, now and in future refreshes?' })).toBeInTheDocument();
    expect(getCareersPage).toHaveBeenCalledWith('Acme Foundation');
    await waitFor(() => expect(blockButton()).toBeEnabled());
  });

  // Job boards carry every other company too, so a company only they carry
  // has no page of its own to stop reading.
  it('offers no careers page choice for a company without one, and blocks without it', async () => {
    const { onBlock } = setup();
    await waitFor(() => expect(blockButton()).toBeEnabled());
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    fireEvent.click(blockButton());
    expect(onBlock).toHaveBeenCalledWith({ stopFetching: false });
  });

  it('offers to stop fetching the careers page where there is one, ticked to begin with', async () => {
    getCareersPage.mockResolvedValueOnce(true);
    const { onBlock } = setup();
    const box = await screen.findByRole('checkbox', { name: "Also stop fetching Acme Foundation's careers page" });
    expect(box).toBeChecked();
    fireEvent.click(blockButton());
    expect(onBlock).toHaveBeenCalledWith({ stopFetching: true });
  });

  it('keeps reading the careers page when the box is unticked', async () => {
    getCareersPage.mockResolvedValueOnce(true);
    const { onBlock } = setup();
    fireEvent.click(await screen.findByRole('checkbox'));
    fireEvent.click(blockButton());
    expect(onBlock).toHaveBeenCalledWith({ stopFetching: false });
  });

  // A click before the answer would block with a choice never shown.
  it('waits for the careers page answer before it can block', () => {
    getCareersPage.mockReturnValueOnce(new Promise(() => {}));
    setup();
    expect(blockButton()).toBeDisabled();
  });

  it('can be put away with Cancel', async () => {
    const { onCancel, onBlock } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
    expect(onBlock).not.toHaveBeenCalled();
  });

  // The failure's own notice says why; the question stays for another try.
  it('says it is blocking, and stays to be tried again when the block fails', async () => {
    let fail;
    const onBlock = vi.fn(() => new Promise((resolve, reject) => { fail = reject; }));
    setup({ onBlock });
    await waitFor(() => expect(blockButton()).toBeEnabled());
    fireEvent.click(blockButton());
    expect(screen.getByRole('button', { name: 'Blocking...' })).toBeDisabled();
    fail(new Error('offline'));
    await waitFor(() => expect(blockButton()).toBeEnabled());
  });

  // No answer is no page to offer, not a stuck question.
  it('blocks without the choice when the careers page cannot be asked about', async () => {
    getCareersPage.mockRejectedValueOnce(new Error('offline'));
    setup();
    await waitFor(() => expect(blockButton()).toBeEnabled());
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });
});
