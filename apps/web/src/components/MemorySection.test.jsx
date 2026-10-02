import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor, act } from '@testing-library/react';
import MemorySection from './MemorySection.jsx';
import { announceMemoryChanged } from '../lib/memorySignal.js';

vi.mock('../api.js', () => ({
  getMemory: vi.fn(),
  saveMemory: vi.fn(async () => ({ item: {}, replaced: null })),
  editMemory: vi.fn(async () => ({ item: {} })),
  deleteMemory: vi.fn(async () => null),
  forgetMemory: vi.fn(async () => null),
  setMemoryEnabled: vi.fn(async (enabled) => ({ enabled })),
}));

import { getMemory, saveMemory, editMemory, deleteMemory, forgetMemory, setMemoryEnabled } from '../api.js';

const item = (id, text, scope, quote = null) => ({ id, text, scope, quote, createdAt: null, updatedAt: null, replaces: null, archived: false });
const ITEMS = [
  item('m1', 'Keep my resume to one page', 'resume', 'keep my resume to one page'),
  item('m2', 'Only show me remote roles', 'jobs', 'only show me remote roles'),
  item('m3', 'Use Indian English', 'everywhere'),
];
const holding = (items = ITEMS, extra = {}) => getMemory.mockResolvedValue({ enabled: true, items, archived: 0, ...extra });

beforeEach(() => {
  vi.clearAllMocks();
  holding();
});

const section = () => screen.getByRole('region', { name: 'What the AI knows about you' });
const loaded = async () => within(section()).findByRole('switch');

describe('What the AI knows about you', () => {
  it('says what it is for while nothing is saved, the switch on', async () => {
    holding([]);
    render(<MemorySection />);
    expect(await loaded()).toHaveAttribute('aria-checked', 'true');
    expect(section()).toHaveTextContent('The chat will suggest things to remember as you talk, and nothing is saved without your click.');
    expect(within(section()).getByRole('switch', { name: 'Let the chat suggest and use memories' })).toBeInTheDocument();
    expect(within(section()).queryByRole('button', { name: 'Forget everything' })).not.toBeInTheDocument();
  });

  it('groups what is saved by where it applies, each with where it came from', async () => {
    render(<MemorySection />);
    await loaded();
    const groups = within(section()).getAllByRole('list').map((list) => list.getAttribute('aria-label'));
    expect(groups).toEqual(['Everywhere', 'Jobs', 'Resume']);
    const resume = within(section()).getByRole('list', { name: 'Resume' });
    expect(resume).toHaveTextContent("Keep my resume to one pageFrom the chat: 'keep my resume to one page'");
    expect(within(section()).getByRole('list', { name: 'Everywhere' })).toHaveTextContent('Written by you');
    expect(section()).not.toHaveTextContent('nothing is saved without your click');
  });

  it('adds one written by hand, with where it applies', async () => {
    render(<MemorySection />);
    await loaded();
    fireEvent.click(within(section()).getByRole('button', { name: 'Add' }));
    const form = screen.getByRole('form', { name: 'Add a memory' });
    fireEvent.change(within(form).getByRole('textbox', { name: 'What to remember' }), { target: { value: 'Keep my letters short' } });
    fireEvent.change(within(form).getByRole('combobox', { name: 'Where it applies' }), { target: { value: 'letters' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(saveMemory).toHaveBeenCalledWith({ text: 'Keep my letters short', scope: 'letters' }));
    await waitFor(() => expect(screen.queryByRole('form', { name: 'Add a memory' })).not.toBeInTheDocument());
    expect(getMemory).toHaveBeenCalledTimes(2);
  });

  it('keeps the words, and says why, when the server refuses them', async () => {
    saveMemory.mockRejectedValueOnce(new Error('You already have that one saved.'));
    render(<MemorySection />);
    await loaded();
    fireEvent.click(within(section()).getByRole('button', { name: 'Add' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'What to remember' }), { target: { value: 'use indian english' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('You already have that one saved.');
    expect(screen.getByRole('textbox', { name: 'What to remember' })).toHaveValue('use indian english');
  });

  it('edits one in place, its words and where it applies', async () => {
    render(<MemorySection />);
    await loaded();
    fireEvent.click(within(section()).getByRole('button', { name: 'Edit: Only show me remote roles' }));
    const form = screen.getByRole('form', { name: 'Change: Only show me remote roles' });
    expect(within(form).getByRole('combobox', { name: 'Where it applies' })).toHaveValue('jobs');
    fireEvent.change(within(form).getByRole('textbox', { name: 'What to remember' }), { target: { value: 'Remote or hybrid roles' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(editMemory).toHaveBeenCalledWith('m2', { text: 'Remote or hybrid roles', scope: 'jobs' }));
  });

  it('deletes one at once', async () => {
    render(<MemorySection />);
    await loaded();
    fireEvent.click(within(section()).getByRole('button', { name: 'Delete: Use Indian English' }));
    await waitFor(() => expect(deleteMemory).toHaveBeenCalledWith('m3'));
  });

  it('turns memory off with the switch', async () => {
    render(<MemorySection />);
    fireEvent.click(await loaded());
    await waitFor(() => expect(setMemoryEnabled).toHaveBeenCalledWith(false));
  });

  it('forgets everything only once confirmed in place', async () => {
    render(<MemorySection />);
    await loaded();
    fireEvent.click(within(section()).getByRole('button', { name: 'Forget everything' }));
    const confirm = within(section()).getByRole('group', { name: 'Forget everything' });
    expect(confirm).toHaveTextContent('there is no undo');
    fireEvent.click(within(confirm).getByRole('button', { name: 'Keep it' }));
    expect(forgetMemory).not.toHaveBeenCalled();
    fireEvent.click(within(section()).getByRole('button', { name: 'Forget everything' }));
    fireEvent.click(within(section()).getByRole('button', { name: 'Forget it all' }));
    await waitFor(() => expect(forgetMemory).toHaveBeenCalledTimes(1));
  });

  it('offers to forget the replaced lines kept for an Undo, even with none in force', async () => {
    holding([], { archived: 2 });
    render(<MemorySection />);
    await loaded();
    expect(within(section()).getByRole('button', { name: 'Forget everything' })).toBeInTheDocument();
  });

  it('reads the list again when a chat chip changes it', async () => {
    holding([]);
    render(<MemorySection />);
    await loaded();
    holding([ITEMS[0]]);
    act(() => announceMemoryChanged());
    expect(await within(section()).findByText('Keep my resume to one page')).toBeInTheDocument();
  });

  it('says so, with a way to try again, when the list cannot be read', async () => {
    getMemory.mockRejectedValueOnce(new Error('offline'));
    render(<MemorySection />);
    expect(await screen.findByText('Could not load what the AI knows.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await loaded()).toBeInTheDocument();
  });
});
