import { describe, it, expect } from 'vitest';
import { proposalsOf } from './proposalShape.js';

const PROFILE = {
  id: 'p1', kind: 'profile', summary: 'Add the CLI project', status: 'pending', ops: [{ op: 'add' }],
  diff: [
    { label: 'Projects: add', before: '', after: 'CLI tool (2024): Go\n- Built a CLI' },
    { label: 'Headline', before: 'Backend engineer', after: 'Backend engineer, CLIs' },
    { label: 'Skill groups: remove', before: 'Old: a, b', after: '' },
  ],
};
const DOCUMENT = {
  id: 'p2', kind: 'document', summary: 'Fit to one page', status: 'applied', appliedAt: '2026-09-30T10:00:00.000Z',
  documentId: 'd1', documentKind: 'resume', name: 'Classic resume', tex: '\\documentclass{article}\n', baseAt: '2026-09-30T09:00:00.000Z',
  factFlags: ['40%', 7, ''], problems: ['\\input is not allowed'],
};

describe('proposalsOf', () => {
  it('reads a turn saved before proposals existed as offering none', () => {
    expect(proposalsOf({ question: 'hi' })).toEqual([]);
    expect(proposalsOf(undefined)).toEqual([]);
    expect(proposalsOf({ proposals: 'nope' })).toEqual([]);
  });

  it('says for each profile diff row whether it adds, removes or changes, with its lines split', () => {
    const [card] = proposalsOf({ proposals: [PROFILE] });
    expect(card).toMatchObject({ id: 'p1', kind: 'profile', summary: 'Add the CLI project', status: 'pending', appliedAt: null });
    expect(card.diff).toEqual([
      { label: 'Projects: add', change: 'add', before: [], after: ['CLI tool (2024): Go', '- Built a CLI'] },
      { label: 'Headline', change: 'change', before: ['Backend engineer'], after: ['Backend engineer, CLIs'] },
      { label: 'Skill groups: remove', change: 'remove', before: ['Old: a, b'], after: [] },
    ]);
  });

  it('keeps a document proposal\'s target, source, flags and problems, dropping anything not text', () => {
    const [card] = proposalsOf({ proposals: [DOCUMENT] });
    expect(card).toEqual({
      id: 'p2', kind: 'document', summary: 'Fit to one page', status: 'applied', appliedAt: '2026-09-30T10:00:00.000Z',
      documentId: 'd1', documentKind: 'resume', name: 'Classic resume', tex: '\\documentclass{article}\n',
      baseAt: '2026-09-30T09:00:00.000Z', factFlags: ['40%'], problems: ['\\input is not allowed'],
    });
  });

  it('reads a new document as one with no id yet', () => {
    const [card] = proposalsOf({ proposals: [{ ...DOCUMENT, documentId: null, documentKind: 'cover-letter', baseAt: null }] });
    expect(card).toMatchObject({ documentId: null, documentKind: 'cover-letter', baseAt: null });
  });

  it('leaves out a proposal with no id or of an unknown kind, and treats an unknown status as pending', () => {
    const cards = proposalsOf({ proposals: [{ kind: 'profile' }, { id: 'x', kind: 'calendar' }, { ...PROFILE, status: 'weird' }, null] });
    expect(cards).toHaveLength(1);
    expect(cards[0].status).toBe('pending');
  });
});
