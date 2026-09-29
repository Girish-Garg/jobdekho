import { describe, it, expect } from 'vitest';
import { buildConversation, versionsOf } from './conversation.js';

const turn = (at, q = 'q') => ({ question: q, answer: 'a', actions: [], createdAt: at });
const LETTER = {
  kind: 'cover-letter', postingId: 'p1', provider: 'claude', createdAt: '2026-09-29T10:05:00.000Z', result: { letter: 'Short' },
  versions: [
    { instruction: '', provider: 'claude', createdAt: '2026-09-29T10:01:00.000Z', result: { letter: 'Long' } },
    { instruction: 'make it shorter', provider: 'claude', createdAt: '2026-09-29T10:05:00.000Z', result: { letter: 'Short' } },
  ],
};

describe('buildConversation', () => {
  it('interleaves questions and action answers in the order they happened', () => {
    const entries = buildConversation(
      [turn('2026-09-29T10:00:00.000Z', 'first'), turn('2026-09-29T10:03:00.000Z', 'second')],
      [LETTER],
    );
    expect(entries.map((e) => (e.type === 'turn' ? e.turn.question : e.record.instruction || 'run'))).toEqual([
      'first', 'run', 'second', 'make it shorter',
    ]);
  });

  it('gives every version its own entry, shaped like a saved record, and marks only the newest', () => {
    const entries = buildConversation([], [LETTER]);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ type: 'result', kind: 'cover-letter', latest: false });
    expect(entries[1]).toMatchObject({ latest: true, record: { kind: 'cover-letter', result: { letter: 'Short' }, instruction: 'make it shorter' } });
    expect(new Set(entries.map((e) => e.key)).size).toBe(2);
  });

  it('is only the questions when no job is in scope', () => {
    expect(buildConversation([turn('a')], []).map((e) => e.type)).toEqual(['turn']);
  });
});

describe('versionsOf', () => {
  it('is empty for nothing saved', () => {
    expect(versionsOf(null)).toEqual([]);
  });

  it('passes a record\'s own versions through unchanged', () => {
    expect(versionsOf(LETTER)).toBe(LETTER.versions);
  });

  it('reads a record with no versions as its one answer, instruction empty', () => {
    const old = { kind: 'fake-check', provider: 'claude', createdAt: 'x', result: { verdict: 'unclear' } };
    expect(versionsOf(old)).toEqual([{ instruction: '', provider: 'claude', createdAt: 'x', result: { verdict: 'unclear' } }]);
  });
});
