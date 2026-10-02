import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import MemoryChips from './MemoryChips.jsx';
import ChatTurn from './ChatTurn.jsx';
import { onMemoryChanged } from '../lib/memorySignal.js';

vi.mock('../api.js', () => ({
  saveMemory: vi.fn(),
  editMemory: vi.fn(),
  deleteMemory: vi.fn(),
}));

import { saveMemory, editMemory, deleteMemory } from '../api.js';

const ONE_PAGE = { text: 'Keep my resume to one page', scope: 'resume', quote: 'keep my resume to one page' };
const ITEM = { id: 'm1', ...ONE_PAGE, replaces: null, archived: false };
const gone = () => Object.assign(new Error('That one is no longer saved.'), { status: 404 });

beforeEach(() => {
  vi.clearAllMocks();
  saveMemory.mockResolvedValue({ item: ITEM, replaced: null });
  editMemory.mockImplementation(async (id, change) => ({ item: { ...ITEM, id, ...change } }));
  deleteMemory.mockResolvedValue(null);
});

const chip = () => screen.getByRole('group', { name: /^Memory: / });
const press = (name) => fireEvent.click(within(chip()).getByRole('button', { name }));

describe('a suggested memory', () => {
  it('asks, and saves only on Save, as the person\'s words with where they came from', async () => {
    const heard = vi.fn();
    const stop = onMemoryChanged(heard);
    render(<MemoryChips items={[{ status: 'suggested', ...ONE_PAGE }]} />);
    expect(chip()).toHaveTextContent("Remember: 'Keep my resume to one page'?");
    expect(saveMemory).not.toHaveBeenCalled();
    press('Save');
    expect(await screen.findByText("Remembered: 'Keep my resume to one page'")).toBeInTheDocument();
    expect(saveMemory).toHaveBeenCalledWith({ ...ONE_PAGE, replaces: null });
    expect(within(chip()).getByRole('button', { name: 'Undo' })).toBeInTheDocument();
    expect(heard).toHaveBeenCalledTimes(1);
    stop();
  });

  it('saves the words as edited', async () => {
    render(<MemoryChips items={[{ status: 'suggested', ...ONE_PAGE }]} />);
    press('Edit');
    const box = screen.getByRole('textbox', { name: 'What to remember' });
    expect(box).toHaveValue(ONE_PAGE.text);
    fireEvent.change(box, { target: { value: 'Keep my resume to one page, always' } });
    press('Save');
    await waitFor(() => expect(saveMemory).toHaveBeenCalledWith({ ...ONE_PAGE, text: 'Keep my resume to one page, always', replaces: null }));
  });

  it('goes quiet on Not now, and saves nothing', () => {
    render(<MemoryChips items={[{ status: 'suggested', ...ONE_PAGE }]} />);
    press('Not now');
    expect(chip()).toHaveTextContent("Not saved: 'Keep my resume to one page'");
    expect(within(chip()).queryAllByRole('button')).toHaveLength(0);
    expect(saveMemory).not.toHaveBeenCalled();
  });

  it('says what it would replace, and once saved, what it replaced', async () => {
    saveMemory.mockResolvedValue({ item: { ...ITEM, replaces: 'm0' }, replaced: { id: 'm0', text: 'Two pages are fine' } });
    render(<MemoryChips items={[{ status: 'suggested', ...ONE_PAGE, replaces: 'm0', replacedText: 'Two pages are fine' }]} />);
    expect(chip()).toHaveTextContent("Replaces: 'Two pages are fine'");
    press('Save');
    expect(await screen.findByText("Replaced: 'Two pages are fine'")).toBeInTheDocument();
    expect(saveMemory).toHaveBeenCalledWith({ ...ONE_PAGE, replaces: 'm0' });
  });

  it('keeps the suggestion, and says why, when the server will not keep it', async () => {
    saveMemory.mockRejectedValue(new Error('You have 150 things saved, the most JobDekho keeps. Delete one first.'));
    render(<MemoryChips items={[{ status: 'suggested', ...ONE_PAGE }]} />);
    press('Save');
    expect(await screen.findByRole('alert')).toHaveTextContent('You have 150 things saved');
    expect(chip()).toHaveTextContent("Remember: 'Keep my resume to one page'?");
  });
});

describe('a memory saved because the message said remember', () => {
  it('says so, and Undo deletes it and offers it again', async () => {
    render(<MemoryChips items={[{ status: 'saved', id: 'm1', ...ONE_PAGE }]} />);
    expect(chip()).toHaveTextContent("Remembered: 'Keep my resume to one page'");
    press('Undo');
    expect(await screen.findByText("Remember: 'Keep my resume to one page'?")).toBeInTheDocument();
    expect(deleteMemory).toHaveBeenCalledWith('m1');
    expect(editMemory).not.toHaveBeenCalled();
  });

  it('brings back what it replaced on Undo, even when the new one is gone already', async () => {
    deleteMemory.mockRejectedValue(gone());
    render(<MemoryChips items={[{ status: 'saved', id: 'm1', ...ONE_PAGE, replaces: 'm0', replacedText: 'Two pages are fine' }]} />);
    expect(chip()).toHaveTextContent("Replaced: 'Two pages are fine'");
    press('Undo');
    await waitFor(() => expect(editMemory).toHaveBeenCalledWith('m0', { restore: true }));
    expect(await screen.findByText("Remember: 'Keep my resume to one page'?")).toBeInTheDocument();
  });

  it('changes the saved words on Edit', async () => {
    render(<MemoryChips items={[{ status: 'saved', id: 'm1', ...ONE_PAGE }]} />);
    press('Edit');
    fireEvent.change(screen.getByRole('textbox', { name: 'What to remember' }), { target: { value: 'One page, two at most' } });
    press('Save');
    expect(await screen.findByText("Remembered: 'One page, two at most'")).toBeInTheDocument();
    expect(editMemory).toHaveBeenCalledWith('m1', { text: 'One page, two at most' });
  });
});

describe('the chips in a chat turn', () => {
  it('sit under the answer, one each, and none on a turn that offered nothing', () => {
    const turn = { question: 'From now on keep my resume to one page', answer: 'Sure.', actions: [], refs: [], provider: 'claude' };
    const { rerender } = render(<ChatTurn turn={{ ...turn, memory: [{ status: 'suggested', ...ONE_PAGE }, { status: 'saved', id: 'm2', text: 'Use Indian English', scope: 'everywhere', quote: 'Indian English' }] }} providers={[]} onApply={vi.fn()} onOpenRef={vi.fn()} />);
    const list = screen.getByRole('list', { name: 'Things to remember' });
    expect(within(list).getAllByRole('group')).toHaveLength(2);
    expect(screen.getByText('Sure.').compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    rerender(<ChatTurn turn={turn} providers={[]} onApply={vi.fn()} onOpenRef={vi.fn()} />);
    expect(screen.queryByRole('list', { name: 'Things to remember' })).not.toBeInTheDocument();
  });
});
