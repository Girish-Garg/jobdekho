import { describe, it, expect, vi } from 'vitest';
import { announceMemoryChanged, onMemoryChanged } from './memorySignal.js';
import { landTurn } from './chatLanding.js';
import { chatSession } from './chatSession.js';

describe('memorySignal', () => {
  it('tells every listener, until it stops listening', () => {
    const heard = vi.fn();
    const stop = onMemoryChanged(heard);
    announceMemoryChanged();
    stop();
    announceMemoryChanged();
    expect(heard).toHaveBeenCalledTimes(1);
  });

  it('is announced by an answer that saved what its message asked to remember, and by no other', () => {
    const heard = vi.fn();
    const stop = onMemoryChanged(heard);
    landTurn({ id: 't1', question: 'which are remote?', answer: 'Two.', memory: [{ status: 'suggested', text: 'Only remote roles' }] });
    landTurn({ id: 't2', question: 'hi', answer: 'Hello.' });
    expect(heard).not.toHaveBeenCalled();
    landTurn({ id: 't3', question: 'remember: only remote roles', answer: 'Sure.', memory: [{ status: 'saved', id: 'm1', text: 'Only remote roles' }] });
    expect(heard).toHaveBeenCalledTimes(1);
    expect(chatSession.get().turns.map((turn) => turn.id)).toEqual(['t1', 't2', 't3']);
    stop();
  });
});
