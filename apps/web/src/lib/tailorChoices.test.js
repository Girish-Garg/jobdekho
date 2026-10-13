import { describe, it, expect, vi, beforeEach } from 'vitest';
import { putTailorChoices } from '../api.js';
import { chatStore, resetChatStore } from './chatStore.js';
import { saveTailorChoices, choicesSettled } from './tailorChoices.js';

vi.mock('../api.js', () => ({ putTailorChoices: vi.fn() }));

const record = (choices) => ({ kind: 'resume-tailor', postingId: 'p1', result: { sections: {}, choices } });
const OTHER = { kind: 'cover-letter', postingId: 'p1', result: { letter: 'Dear' } };

beforeEach(() => {
  resetChatStore();
  putTailorChoices.mockReset();
  chatStore.set({ pages: { c1: { chat: { id: 'c1' }, turns: [], results: [record(undefined), OTHER] }, c2: { chat: { id: 'c2' }, turns: [] } } });
});

describe('saveTailorChoices', () => {
  it('saves the choices and puts the saved record where every chat on the page reads it', async () => {
    putTailorChoices.mockResolvedValue(record({ skills: ['Kotlin'] }));
    await saveTailorChoices('p1', { skills: ['Kotlin'] });
    expect(putTailorChoices).toHaveBeenCalledWith('p1', { skills: ['Kotlin'] });
    const { pages } = chatStore.get();
    expect(pages.c1.results[0].result.choices).toEqual({ skills: ['Kotlin'] });
    expect(pages.c1.results[1]).toBe(OTHER);
    expect(pages.c2.results).toEqual([]);
  });

  // Each save sends every choice, so the later click must be the later save.
  it('sends one save at a time, in the order they were asked for', async () => {
    const order = [];
    let release;
    putTailorChoices
      .mockImplementationOnce(() => new Promise((resolve) => { release = () => { order.push('first'); resolve(record({ skills: ['A'] })); }; }))
      .mockImplementationOnce(async () => { order.push('second'); return record({ skills: ['A', 'B'] }); });
    const first = saveTailorChoices('p1', { skills: ['A'] });
    const second = saveTailorChoices('p1', { skills: ['A', 'B'] });
    await Promise.resolve();
    expect(putTailorChoices).toHaveBeenCalledTimes(1);
    release();
    await Promise.all([first, second]);
    expect(order).toEqual(['first', 'second']);
    expect(chatStore.get().pages.c1.results[0].result.choices).toEqual({ skills: ['A', 'B'] });
  });

  it('reports a failed save to its caller and still runs the next', async () => {
    putTailorChoices.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(record({ skills: ['B'] }));
    await expect(saveTailorChoices('p1', { skills: ['A'] })).rejects.toThrow('offline');
    await saveTailorChoices('p1', { skills: ['B'] });
    await choicesSettled();
    expect(chatStore.get().pages.c1.results[0].result.choices).toEqual({ skills: ['B'] });
  });
});
