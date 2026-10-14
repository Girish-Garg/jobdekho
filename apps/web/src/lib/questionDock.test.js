import { describe, it, expect, beforeEach } from 'vitest';
import { AskStopped, answerAsk, askIn, currentAsk, resetQuestionDock, stopAsking } from './questionDock.js';

const QUESTION = { header: 'Fit', question: 'What should go?', options: [{ label: 'Achievements' }, { label: 'Compact layout' }] };

beforeEach(() => resetQuestionDock());

describe('askIn', () => {
  it('waits for the picks of the ask on screen in that chat', async () => {
    const asked = askIn('c1', { title: 'Your tailored resume', step: { at: 1, of: 3 }, questions: [QUESTION] });
    const ask = currentAsk('c1');
    expect(ask).toMatchObject({ title: 'Your tailored resume', step: { at: 1, of: 3 }, questions: [QUESTION] });
    expect(currentAsk('c2')).toBeNull();
    answerAsk('c1', ask.id, [['Achievements']]);
    await expect(asked).resolves.toEqual([['Achievements']]);
    expect(currentAsk('c1')).toBeNull();
  });

  it('ends the ask before with AskStopped when another is asked in the same chat', async () => {
    const first = askIn('c1', { questions: [QUESTION] });
    const stale = currentAsk('c1').id;
    const second = askIn('c1', { questions: [QUESTION] });
    await expect(first).rejects.toBeInstanceOf(AskStopped);
    // Picks for the ask that was replaced answer nothing.
    answerAsk('c1', stale, [['Achievements']]);
    expect(currentAsk('c1')).not.toBeNull();
    answerAsk('c1', currentAsk('c1').id, [[]]);
    await expect(second).resolves.toEqual([[]]);
  });

  it('ends with AskStopped when the person stops, and leaves other chats alone', async () => {
    const here = askIn('c1', { questions: [QUESTION] });
    const there = askIn('c2', { questions: [QUESTION] });
    stopAsking('c1');
    await expect(here).rejects.toThrow('The person stopped answering.');
    expect(currentAsk('c2')).not.toBeNull();
    stopAsking('nowhere');
    answerAsk('c2', currentAsk('c2').id, [['Compact layout']]);
    await expect(there).resolves.toEqual([['Compact layout']]);
  });

  it('finds no ask for a chat id named like an object property', () => {
    expect(currentAsk('constructor')).toBeNull();
  });
});
