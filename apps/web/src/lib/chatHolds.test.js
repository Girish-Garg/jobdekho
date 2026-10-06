import { describe, it, expect } from 'vitest';
import { ITEM_LIMITS } from '@jobdekho/store/chat-items.js';
import { ROOM, chatOffers, heldJob } from './chatHolds.js';
import { compareChat, documentChat, generalChat, jobChat, POSTINGS, DOCUMENTS } from '../test/fixtures/chats.js';

const job = (id) => ({ type: 'job', ...POSTINGS[id] });
const doc = (id) => ({ type: 'document', ...DOCUMENTS[id] });

describe('heldJob', () => {
  it('is a job chat\'s own job, until the person leaves it out', () => {
    expect(heldJob(jobChat('pA'))).toMatchObject({ id: 'pA' });
    expect(heldJob(jobChat('pA', { homeLeftOut: true }))).toBeNull();
    expect(heldJob(compareChat('cmp', ['pA', 'pB']))).toBeNull();
    expect(heldJob(null)).toBeNull();
  });
});

describe('chatOffers', () => {
  // A pill the server would refuse is a pill that only says no.
  it('has room for what the server lets each kind hold, a job\'s chat taking a job as a comparison', () => {
    for (const kind of Object.keys(ITEM_LIMITS)) {
      expect(ROOM[kind].document, kind).toBe(ITEM_LIMITS[kind].documents[1]);
      expect(ROOM[kind].job, kind).toBe(kind === 'job' ? Infinity : ITEM_LIMITS[kind].jobs[1]);
    }
  });

  it('offers what was opened lately that the chat does not hold, newest first, three at most', () => {
    const opened = [doc('d1'), job('pB'), job('pA'), job('p9'), doc('d2')];
    expect(chatOffers(jobChat('pA'), opened).map((one) => one.id)).toEqual(['d1', 'pB', 'p9']);
    expect(chatOffers(jobChat('pA', { documents: [{ ...DOCUMENTS.d1, exists: true }] }), opened).map((one) => one.id)).toEqual(['pB', 'p9', 'd2']);
    // The chat's own job, left out, has its own pill rather than an offer.
    expect(chatOffers(jobChat('pA', { homeLeftOut: true }), [job('pA')])).toEqual([]);
  });

  it('offers a general chat no job, and a full chat nothing more of what fills it', () => {
    const opened = [job('pA'), doc('d1')];
    expect(chatOffers(generalChat('g1'), opened).map((one) => one.id)).toEqual(['d1']);
    const five = compareChat('cmp', ['pA', 'pB', 'p9', 'x1', 'x2']);
    expect(chatOffers(five, [job('pA'), job('pB'), doc('d1')]).map((one) => one.id)).toEqual(['d1']);
    const full = documentChat('d9', 'Base', { documents: ['d9', 'd8', 'd7'].map((id) => ({ id, name: id, exists: true })) });
    expect(chatOffers(full, opened).map((one) => one.id)).toEqual(['pA']);
    expect(chatOffers(null, opened)).toEqual([]);
  });
});
