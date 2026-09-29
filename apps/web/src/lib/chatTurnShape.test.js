import { describe, it, expect } from 'vitest';
import { turnShape } from './chatTurnShape.js';

const BASE = { question: 'Is Acme hiring?', provider: 'claude', createdAt: '2026-09-29T10:00:00.000Z' };

describe('turnShape', () => {
  it('keeps a turn from JobDekho\'s own data as it is, with no web part', () => {
    const turn = turnShape({ ...BASE, answer: 'Two roles here.', refs: [{ id: 'p1' }], actions: [{ type: 'sort', value: 'newest' }] });
    expect(turn).toEqual({
      question: 'Is Acme hiring?', answer: 'Two roles here.', refs: [{ id: 'p1' }], actions: [{ type: 'sort', value: 'newest' }],
      provider: 'claude', createdAt: BASE.createdAt, web: null, webError: null,
    });
  });

  it('keeps both answers of a turn that also searched the web', () => {
    const turn = turnShape({ ...BASE, answer: 'From your feed.', refs: [], actions: [], web: { answer: 'From the web.', sources: ['https://a.example'], provider: 'agy' } });
    expect(turn.answer).toBe('From your feed.');
    expect(turn.web).toEqual({ answer: 'From the web.', sources: ['https://a.example'], provider: 'agy' });
  });

  it('reads a legacy web turn as a web answer with no main answer, sources taken from the top level', () => {
    const turn = turnShape({ ...BASE, web: true, answer: 'Acme raised a Series B.', sources: ['https://news.example/acme'], refs: [], actions: [] });
    expect(turn.answer).toBe('');
    expect(turn.web).toEqual({ answer: 'Acme raised a Series B.', sources: ['https://news.example/acme'], provider: 'claude' });
  });

  it('keeps the reason a search failed', () => {
    expect(turnShape({ ...BASE, answer: 'x', webError: 'Claude Code did not answer.' }).webError).toBe('Claude Code did not answer.');
    expect(turnShape({ ...BASE, answer: 'x', webError: '' }).webError).toBeNull();
  });

  it('drops repeated and non-string sources, and fills in what a turn saved before refs lacks', () => {
    const turn = turnShape({ question: 'q', answer: 'a', web: { answer: 'w', sources: ['https://a.example', 'https://a.example', 7, null] } });
    expect(turn.web.sources).toEqual(['https://a.example']);
    expect(turn.web.provider).toBeNull();
    expect(turn.refs).toEqual([]);
    expect(turn.actions).toEqual([]);
    expect(turn.provider).toBeNull();
  });
});
