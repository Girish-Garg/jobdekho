import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import TrackerView from './TrackerView.jsx';
import { getTracker, addTrackerEntry, updateTrackerEntry, removeTrackerEntry, markNotAJob } from '../api.js';
import { onChatDraft } from '../lib/chatDraftSignal.js';
import { trackerChanged } from '../lib/trackerSignal.js';

vi.mock('../api.js', () => ({
  getTracker: vi.fn(), addTrackerEntry: vi.fn(), updateTrackerEntry: vi.fn(), removeTrackerEntry: vi.fn(),
  getMailScan: vi.fn(async () => ({ connected: false })), startMailScan: vi.fn(), undoMailScan: vi.fn(), getMail: vi.fn(async () => ({ connected: false })),
  markNotAJob: vi.fn(),
}));

const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
const ev = (stage, text, at, from) => ({ id: `${stage}-${text}`, stage, text, at, ...(from ? { from } : {}) });
const ENTRIES = [
  { id: 'e1', company: 'Globex', role: 'Frontend developer', postingId: 'p1', contact: null, stage: 'interview', stageAt: daysAgo(1), events: [ev('applied', 'Applied on their site', daysAgo(9), 'Greenhouse mail'), ev('interview', 'Round 1 on Friday', daysAgo(1))] },
  { id: 'e2', company: 'Acme Labs', role: 'Backend intern', postingId: null, contact: { name: 'Priya', email: 'priya@acme.example' }, stage: 'emailed', stageAt: daysAgo(6), events: [ev('emailed', 'Mailed Priya (priya@acme.example): Backend internship', daysAgo(6))] },
  { id: 'e3', company: 'Initech', role: '', postingId: null, contact: null, stage: 'applied', stageAt: null, events: [ev('applied', 'Marked Applied in JobDekho', null)] },
  { id: 'e4', company: 'Cyberdyne', role: 'ML intern', postingId: null, contact: null, stage: 'closed', stageAt: daysAgo(20), events: [ev('closed', 'Not moving forward', daysAgo(20))] },
  { id: 'e5', company: 'PrepCo', role: '', postingId: null, contact: null, source: 'mail', stage: 'interview', stageAt: daysAgo(3), events: [{ ...ev('interview', 'Interview: crack it', daysAgo(3), 'Mail from prepco.example'), mailId: '<p1>', sender: 'prepco.example', via: 'company' }] },
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

const lane = (name) => screen.getByRole('region', { name });
const cardsIn = (name) => within(lane(name)).queryAllByRole('button', { pressed: false }).concat(within(lane(name)).queryAllByRole('button', { pressed: true }))
  .map((b) => b.getAttribute('aria-label').split(', ')[0]);
const card = (company) => screen.getByRole('button', { name: new RegExp(`^${company}`) });

describe('TrackerView, the board', () => {
  it('puts each application in its lane, Closed folded, and counts what waits on you', async () => {
    await mount();
    expect(screen.getByText('5 applications, 1 waiting on you')).toBeInTheDocument();
    expect(cardsIn('Applied')).toEqual(['Initech']);
    expect(cardsIn('Emailed')).toEqual(['Acme Labs']);
    expect(cardsIn('In process')).toEqual(['Globex', 'PrepCo']);
    expect(card('Acme Labs')).toHaveAccessibleName('Acme Labs, Backend intern, Follow up');
    expect(within(lane('Emailed')).getByText('This week, 1')).toBeInTheDocument();
    expect(within(lane('Applied')).getByText('Earlier, 1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show the 1 closed' }));
    expect(cardsIn('Closed')).toEqual(['Cyberdyne']);
  });

  it('moves a card dropped on another lane, at once, and closes one dropped on the strip', async () => {
    await mount();
    fireEvent.dragStart(card('Initech'));
    fireEvent.dragOver(lane('Emailed'));
    await act(async () => fireEvent.drop(lane('Emailed')));
    expect(updateTrackerEntry).toHaveBeenCalledWith('e3', { stage: 'emailed' });
    expect(cardsIn('Emailed')).toContain('Initech');
    fireEvent.dragStart(card('Globex'));
    await act(async () => fireEvent.drop(screen.getByRole('button', { name: 'Show the 1 closed' })));
    expect(updateTrackerEntry).toHaveBeenCalledWith('e1', { stage: 'closed' });
  });

  it('opens a card over the board, with its history, and moves it from the stage bar', async () => {
    await mount();
    fireEvent.click(card('Globex'));
    const panel = screen.getByRole('complementary', { name: 'Globex, details' });
    expect(within(panel).getAllByText('Greenhouse mail').length).toBeGreaterThan(0);
    await act(async () => fireEvent.click(within(panel).getByRole('button', { name: 'Offer' })));
    expect(updateTrackerEntry).toHaveBeenCalledWith('e1', { stage: 'offer' });
    await act(async () => fireEvent.click(within(panel).getByRole('button', { name: 'Mark it closed' })));
    expect(updateTrackerEntry).toHaveBeenCalledWith('e1', { stage: 'closed' });
    fireEvent.click(within(panel).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });

  it('closes the sidebar on Esc, and offers Not a job only for what the mail scan filed', async () => {
    await mount();
    fireEvent.click(card('Globex'));
    expect(screen.queryByRole('button', { name: 'Not a job' })).not.toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    fireEvent.click(card('PrepCo'));
    fireEvent.click(screen.getByRole('button', { name: 'Not a job' }));
    expect(screen.getByText(/every card from mail from prepco.example/)).toBeInTheDocument();
    markNotAJob.mockResolvedValue({ removed: 1, domains: ['prepco.example'], companies: [] });
    getTracker.mockResolvedValue({ entries: ENTRIES.filter((e) => e.id !== 'e5') });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Yes, not a job' })));
    expect(markNotAJob).toHaveBeenCalledWith('e5');
    expect(cardsIn('In process')).toEqual(['Globex']);
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });

  it('offers a follow-up as the next step, started in the chat', async () => {
    const drafts = [];
    const stop = onChatDraft((draft) => drafts.push(draft.text));
    await mount();
    fireEvent.click(card('Acme Labs'));
    expect(screen.getByText('No reply yet. A short follow-up keeps it alive.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Write a follow-up' }));
    stop();
    expect(drafts[0]).toMatch(/^Write a follow-up mail to priya@acme\.example about Backend intern at Acme Labs\. I mailed them on /);
  });

  it('narrows the board by search and to what needs you', async () => {
    await mount();
    fireEvent.change(screen.getByLabelText('Find an application'), { target: { value: 'glo' } });
    expect(cardsIn('Applied')).toEqual([]);
    expect(cardsIn('In process')).toEqual(['Globex']);
    fireEvent.change(screen.getByLabelText('Find an application'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Needs you, 1' }));
    expect(cardsIn('Emailed')).toEqual(['Acme Labs']);
    expect(cardsIn('In process')).toEqual([]);
  });

  it('stops tracking one only on the second press', async () => {
    await mount();
    fireEvent.click(card('Initech'));
    fireEvent.click(screen.getByRole('button', { name: 'Stop tracking' }));
    expect(removeTrackerEntry).not.toHaveBeenCalled();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Yes, stop tracking' })));
    expect(removeTrackerEntry).toHaveBeenCalledWith('e3');
    expect(cardsIn('Applied')).toEqual([]);
  });

  it('adds one applied for elsewhere', async () => {
    await mount();
    fireEvent.click(screen.getByRole('button', { name: /Add one/ }));
    fireEvent.change(screen.getByLabelText('Company'), { target: { value: 'Northwind' } });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Add' })));
    expect(addTrackerEntry).toHaveBeenCalledWith(expect.objectContaining({ company: 'Northwind', stage: 'applied' }));
    expect(cardsIn('Applied')).toContain('Northwind');
  });

  it('reads the entries again when a mail sent from the chat changed them, and says how to start when empty', async () => {
    await mount();
    getTracker.mockResolvedValue({ entries: [] });
    await act(async () => trackerChanged());
    expect(screen.getByText(/Nothing tracked yet/)).toBeInTheDocument();
  });
});
