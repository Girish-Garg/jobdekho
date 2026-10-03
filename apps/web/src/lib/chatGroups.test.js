import { describe, it, expect } from 'vitest';
import { chatGroups, rowState, rowTitle } from './chatGroups.js';
import { compareChat, documentChat, generalChat, jobChat } from '../test/fixtures/chats.js';

const LIST = [
  generalChat('g1', 'Which remote jobs pay the most?'),
  jobChat('pB'),
  compareChat('cmp', ['pA', 'pB']),
  jobChat('pA'),
  documentChat('d1', 'Classic resume'),
];

const titles = (groups) => groups.map((group) => [group.title, group.rows.map((row) => row.id)]);

describe('chatGroups', () => {
  it('puts the open job\'s chat first, then the other jobs, the comparisons, the documents and the general chats', () => {
    expect(titles(chatGroups(LIST, jobChat('pA')))).toEqual([
      ['This job', ['c-pA']],
      ['Other jobs', ['c-pB']],
      ['Comparing', ['cmp']],
      ['Documents', ['c-d1']],
      ['General', ['g1']],
    ]);
  });

  it('names the first group for a document on the Resume page', () => {
    expect(titles(chatGroups(LIST, documentChat('d1', 'Classic resume')))[0]).toEqual(['This document', ['c-d1']]);
    expect(titles(chatGroups(LIST, documentChat('d1', 'Classic resume')))).toContainEqual(['Jobs', ['c-pB', 'c-pA']]);
  });

  it('shows a job with no chat yet first all the same, and nothing when nothing is open', () => {
    const fresh = { ...jobChat('p9'), id: 'job:p9', placeholder: true };
    expect(titles(chatGroups([], fresh))).toEqual([['This job', ['job:p9']]]);
    expect(chatGroups([], null)).toEqual([]);
  });
});

describe('rowState', () => {
  it('says what is going on in a chat, with a ring while it runs and a dot for an answer not seen', () => {
    expect(rowState(jobChat('pA'), { busy: { label: 'Is it real?' } })).toEqual({ text: 'AlphaCo · checking if it is real...', mark: 'busy' });
    expect(rowState(jobChat('pA'), { unseen: true })).toEqual({ text: 'AlphaCo · answer ready', mark: 'unseen' });
    expect(rowState(compareChat('cmp', ['pA', 'pB']), { when: 'today' })).toEqual({ text: '2 jobs · today', mark: null });
    expect(rowState(generalChat('g1', 'Hi'), { when: '1d ago' }).text).toBe('Whole feed · 1d ago');
  });

  it('marks a job JobDekho no longer lists, a follow-up waiting, a missed answer and a chat not made yet', () => {
    expect(rowState(jobChat('pA', { listed: false }), {}).text).toBe('AlphaCo · no longer listed');
    expect(rowState(jobChat('pA', { waiting: true }), {}).text).toBe('AlphaCo · a follow-up waits');
    expect(rowState(jobChat('pA', { failed: true }), {}).text).toBe('AlphaCo · no answer this time');
    expect(rowState({ ...jobChat('pA'), placeholder: true }, {}).text).toBe('AlphaCo · no messages yet');
  });

  it('counts the letters of a comparison\'s cover letters as they are written', () => {
    expect(rowState(compareChat('cmp', ['pA', 'pB']), { busy: { label: 'Cover letter 2 of 3' } }).text).toBe('2 jobs · writing letter 2 of 3...');
  });

  it('titles a job\'s chat by its role, and any other by its own title', () => {
    expect(rowTitle(jobChat('pA'))).toBe('Job A Engineer');
    expect(rowTitle(compareChat('cmp', ['pA', 'pB']))).toBe('AlphaCo vs BetaCo');
  });
});
