import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import BlockedCompaniesCard from './BlockedCompaniesCard.jsx';

vi.mock('../api.js', () => ({
  getBlockedCompanies: vi.fn(async () => []),
  unblockCompany: vi.fn(async () => null),
}));

import { getBlockedCompanies, unblockCompany } from '../api.js';

beforeEach(() => vi.clearAllMocks());

const ENTRIES = [
  { key: 'acmefoundation', name: 'Acme Foundation', blockedAt: '2026-10-02T10:00:00.000Z', stopFetching: true, careersPage: true },
  { key: 'beta', name: 'Beta Labs', blockedAt: '2026-09-28T10:00:00.000Z', stopFetching: false, careersPage: true },
  { key: 'gamma', name: 'Gamma', blockedAt: '2026-09-20T10:00:00.000Z', stopFetching: false, careersPage: false },
];

const card = () => screen.getByRole('region', { name: 'Blocked companies' });

describe('BlockedCompaniesCard', () => {
  it('says how to block a company while none is blocked', async () => {
    render(<BlockedCompaniesCard />);
    const empty = 'To block a company, open one of its jobs and press Block company beside its name, or ask the chat to block it.';
    expect(await within(card()).findByText(empty)).toBeInTheDocument();
    expect(within(card()).queryByRole('list')).not.toBeInTheDocument();
  });

  it('lists each company with when it was blocked and what became of its careers page', async () => {
    getBlockedCompanies.mockResolvedValueOnce(ENTRIES);
    render(<BlockedCompaniesCard />);
    const rows = await within(card()).findAllByRole('listitem');
    // The details are each chip's hover, and are read out with its name.
    expect(rows.map((row) => row.textContent)).toEqual([
      'Acme Foundation, Blocked 2 Oct  ·  careers page not fetched',
      'Beta Labs, Blocked 28 Sep  ·  careers page still fetched',
      'Gamma, Blocked 20 Sep',
    ]);
    expect(within(rows[0]).getByTitle(/^Blocked 2 Oct .* careers page not fetched$/)).toHaveTextContent('Acme Foundation');
  });

  // A row per company grew past everything else in Settings.
  it('shows the newest twelve, the rest behind Show all, and a search past that many', async () => {
    const many = Array.from({ length: 15 }, (_, i) => ({ key: `co${i}`, name: `Company ${i}`, blockedAt: '2026-10-02T10:00:00.000Z', stopFetching: false, careersPage: false }));
    getBlockedCompanies.mockResolvedValueOnce(many);
    render(<BlockedCompaniesCard />);
    expect(await within(card()).findAllByRole('listitem')).toHaveLength(12);
    fireEvent.click(screen.getByRole('button', { name: 'Show all 15' }));
    expect(within(card()).getAllByRole('listitem')).toHaveLength(15);
    fireEvent.change(screen.getByLabelText('Find a blocked company'), { target: { value: 'company 1' } });
    expect(within(card()).getAllByRole('listitem').map((li) => li.textContent.split(',')[0])).toEqual(['Company 1', 'Company 10', 'Company 11', 'Company 12', 'Company 13', 'Company 14']);
    fireEvent.change(screen.getByLabelText('Find a blocked company'), { target: { value: 'zzz' } });
    expect(screen.getByText('No blocked company matches "zzz".')).toBeInTheDocument();
  });

  it('unblocks by the key the list gave, and takes the row away', async () => {
    getBlockedCompanies.mockResolvedValueOnce(ENTRIES);
    render(<BlockedCompaniesCard />);
    fireEvent.click(await screen.findByRole('button', { name: 'Unblock Beta Labs' }));
    expect(unblockCompany).toHaveBeenCalledWith('beta');
    await waitFor(() => expect(screen.queryByText('Beta Labs')).not.toBeInTheDocument());
    expect(screen.getByText('Acme Foundation')).toBeInTheDocument();
  });

  // The call's own notice says why; the company is still blocked.
  it('keeps the row when the unblock fails', async () => {
    getBlockedCompanies.mockResolvedValueOnce(ENTRIES);
    unblockCompany.mockRejectedValueOnce(new Error('offline'));
    render(<BlockedCompaniesCard />);
    fireEvent.click(await screen.findByRole('button', { name: 'Unblock Gamma' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Unblock Gamma' })).toBeEnabled());
    expect(screen.getByText('Gamma')).toBeInTheDocument();
  });

  it('says so when the list cannot be read, rather than that nothing is blocked', async () => {
    getBlockedCompanies.mockRejectedValueOnce(new Error('offline'));
    render(<BlockedCompaniesCard />);
    expect(await within(card()).findByText('Could not read the blocked companies.')).toBeInTheDocument();
    expect(screen.queryByText(/To block a company/)).not.toBeInTheDocument();
  });
});
