import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import TrackerView from './TrackerView.jsx';
import { getTracker, addTrackerEntry, updateTrackerEntry, removeTrackerEntry } from '../api.js';
import { onChatDraft } from '../lib/chatDraftSignal.js';
import { trackerChanged } from '../lib/trackerSignal.js';

vi.mock('../api.js', () => ({ getTracker: vi.fn(), addTrackerEntry: vi.fn(), updateTrackerEntry: vi.fn(), removeTrackerEntry: vi.fn() }));

const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
const ev = (stage, text, at) => ({ id: `${stage}-${text}`, stage, text, at });
const ENTRIES = [
  { id: 'e1', company: 'Globex', role: 'Frontend developer', postingId: 'p1', contact: null, stage: 'interview', stageAt: daysAgo(1), events: [ev('interview', 'Round 1 on Friday', daysAgo(1))] },
  { id: 'e2', company: 'Acme Labs', role: 'Backend intern', postingId: null, contact: { name: 'Priya', email: 'priya@acme.example' }, stage: 'emailed', stageAt: daysAgo(6), events: [ev('emailed', 'Mailed Priya (priya@acme.example): Backend internship', daysAgo(6))] },
  { id: 'e3', company: 'Initech', role: '', postingId: null, contact: null, stage: 'applied', stageAt: null, events: [ev('applied', 'Marked Applied in JobDekho', null)] },
];

beforeEach(() => {
  vi.clearAllMocks();
  getTracker.mockResolvedValue({ entries: ENTRIES });
  updateTrackerEntry.mockImplementation(async (id, patch) => ({ entry: { ...ENTRIES.find((e) => e.id === id), ...patch } }));
  addTrackerEntry.mockImplementation(async (fields) => ({ entry: { id: 'new', ...fields, contact: null, stageAt: null, events: [] } }));
  removeTrackerEntry.mockResolvedValue(null);
});

async function mount() {
  await act(async () => {
    render(<TrackerView />);
  });
}

const rows = () => within(screen.getByRole('list', { name: 'Your applications' })).getAllByRole('listitem');
const companies = () => rows().map((row) => row.querySelector('.font-semibold').textContent);

describe('TrackerView', () => {
  it('lists each application with what happened last, and counts who is waiting', async () => {
    await mount();
    expect(screen.getByText('3 applications, 2 waiting on a reply')).toBeInTheDocument();
    expect(companies()).toEqual(['Globex', 'Acme Labs', 'Initech']);
    expect(screen.getByText('Round 1 on Friday')).toBeInTheDocument();
    expect(screen.getByText('date not known')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Waiting 2' }));
    expect(companies()).toEqual(['Acme Labs', 'Initech']);
  });

  it('moves a stage in place', async () => {
    await mount();
    await act(async () => fireEvent.change(screen.getByLabelText('Stage for Initech'), { target: { value: 'closed' } }));
    expect(updateTrackerEntry).toHaveBeenCalledWith('e3', { stage: 'closed' });
  });

  it('offers a follow-up for a mail with no answer after five days, started in the chat', async () => {
    const drafts = [];
    const stop = onChatDraft((draft) => drafts.push(draft.text));
    await mount();
    fireEvent.click(screen.getByRole('button', { name: /Write a follow-up/ }));
    stop();
    expect(drafts[0]).toMatch(/^Write a follow-up mail to priya@acme\.example about Backend intern at Acme Labs\. I mailed them on /);
  });

  it('adds one applied for elsewhere', async () => {
    await mount();
    fireEvent.click(screen.getByRole('button', { name: /Add one/ }));
    fireEvent.change(screen.getByLabelText('Company'), { target: { value: 'Northwind' } });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Add' })));
    expect(addTrackerEntry).toHaveBeenCalledWith(expect.objectContaining({ company: 'Northwind', stage: 'applied' }));
    expect(companies()[0]).toBe('Northwind');
  });

  it('reads the entries again when a mail sent from the chat changed them', async () => {
    await mount();
    getTracker.mockResolvedValue({ entries: [{ ...ENTRIES[1], id: 'e9', company: 'Northwind' }] });
    await act(async () => trackerChanged());
    expect(companies()).toEqual(['Northwind']);
  });

  it('says how to start when nothing is tracked', async () => {
    getTracker.mockResolvedValue({ entries: [] });
    await mount();
    expect(screen.getByText(/Nothing tracked yet/)).toBeInTheDocument();
  });
});
