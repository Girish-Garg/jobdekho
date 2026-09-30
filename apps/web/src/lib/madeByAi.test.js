import { describe, it, expect } from 'vitest';
import { describeMade, scopeFor, isJobItem } from './madeByAi.js';

const today = new Date().toISOString();
const JOB = { title: 'Backend Engineer', company: 'Razorpay' };

describe('describeMade', () => {
  it('names an answer about a job by the job, with its versions, and a gone job as gone', () => {
    expect(describeMade({ kind: 'resume-tailor', at: today, postingId: 'j1', job: JOB, versions: 3 }))
      .toEqual({ word: 'Tailored resume', title: 'Backend Engineer', detail: 'Razorpay, 3 versions, today' });
    expect(describeMade({ kind: 'fake-check', at: today, postingId: 'x', job: null, versions: 1 }))
      .toEqual({ word: 'Is it real? check', title: 'A job JobDekho no longer lists', detail: 'today' });
  });

  it('names a document by its name and the job it was made for, or as a chat change', () => {
    expect(describeMade({ kind: 'document', at: today, name: 'Letter', documentKind: 'cover-letter', job: JOB }))
      .toEqual({ word: 'Cover letter document', title: 'Letter', detail: 'For Backend Engineer at Razorpay, today' });
    expect(describeMade({ kind: 'document', at: today, name: 'CV', documentKind: 'resume', job: null }).detail).toBe('Changed from the chat, today');
  });

  it('names a profile change by its summary and the conversation it came from', () => {
    expect(describeMade({ kind: 'profile', at: today, summary: 'Add Go', current: true }))
      .toEqual({ word: 'Profile change', title: 'Add Go', detail: 'In this conversation, today' });
    expect(describeMade({ kind: 'profile', at: today, summary: 'Add Go', current: false }).detail).toBe('In an earlier conversation, today');
  });
});

describe('scopeFor and isJobItem', () => {
  it('shape a job-bound item as the chat\'s scope, gone or not', () => {
    expect(scopeFor({ postingId: 'j1', job: JOB })).toEqual({ id: 'j1', title: 'Backend Engineer', company: 'Razorpay' });
    expect(scopeFor({ postingId: 'x', job: null })).toEqual({ id: 'x', title: 'A job JobDekho no longer lists', company: '' });
    expect(isJobItem({ kind: 'cover-letter' })).toBe(true);
    expect(isJobItem({ kind: 'document' })).toBe(false);
  });
});
