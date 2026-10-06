import { describe, it, expect } from 'vitest';
import { busyText, chatHeading, chatPlace, itemName, readyTitle } from './chatNames.js';
import { compareChat, documentChat, generalChat, jobChat } from '../test/fixtures/chats.js';

describe('chatPlace', () => {
  it('names a chat inside a sentence as shortly as it can be said', () => {
    expect(chatPlace(jobChat('pA'))).toBe('AlphaCo\'s chat');
    expect(chatPlace(documentChat('d1', 'Classic resume'))).toBe('Classic resume\'s chat');
    expect(chatPlace(compareChat('cmp', ['pA', 'pB']))).toBe('the AlphaCo vs BetaCo chat');
    expect(chatPlace(generalChat('g1', 'Which remote jobs pay the most?'))).toBe('the chat "Which remote jobs pay the most?"');
  });

  it('takes the company from a job chat\'s stored title when the chat has not been read', () => {
    expect(chatPlace(null, 'Frontend Engineer · Razorpay')).toBe('Razorpay\'s chat');
    expect(chatPlace(null, 'Which remote jobs pay the most?')).toBe('the chat "Which remote jobs pay the most?"');
  });
});

describe('busyText', () => {
  it('says what runs where, and that sending waits for it', () => {
    expect(busyText({ label: 'Is it real?' }, jobChat('pA'))).toBe('Is it real? is running in AlphaCo\'s chat. You can send once it\'s done.');
  });

  it('says a question is being answered by the CLI that answers it', () => {
    expect(busyText({ label: 'Answering' }, jobChat('pB'), 'Antigravity')).toBe('Antigravity is answering in BetaCo\'s chat. You can send once it\'s done.');
    expect(busyText({ label: 'Answering', title: 'Hi' }, null)).toBe('The AI is answering in the chat "Hi". You can send once it\'s done.');
  });
});

describe('readyTitle', () => {
  it('names the chat and what is ready in it', () => {
    expect(readyTitle(jobChat('pA'), { kind: 'action', label: 'Is it real?' })).toBe('AlphaCo · Is it real? is ready');
    expect(readyTitle(jobChat('pB'), { kind: 'question', label: 'Answering' })).toBe('BetaCo · Your answer is ready');
    expect(readyTitle(compareChat('cmp', ['pA', 'pB']), { kind: 'combined', label: 'Cover letter 2 of 2', say: 'Cover letter for each' }))
      .toBe('AlphaCo vs BetaCo · Cover letter for each is ready');
  });
});

describe('chatHeading', () => {
  it('names the chat on screen and what kind of chat it is', () => {
    expect(chatHeading(jobChat('pA'))).toEqual({ title: 'Job A Engineer', about: 'AlphaCo · this job\'s chat' });
    expect(chatHeading(jobChat('pA', { listed: false })).about).toBe('AlphaCo · this job\'s chat · no longer listed');
    expect(chatHeading(compareChat('cmp', ['pA', 'pB']))).toEqual({ title: 'AlphaCo vs BetaCo', about: 'Comparing 2 jobs' });
    expect(chatHeading(documentChat('d1', 'Classic resume')).about).toBe('Resume · this document\'s chat');
    expect(chatHeading(generalChat('g1')).about).toBe('General chat');
  });

  // The x on a chat's own job or document, and a comparison the person
  // took jobs out of, say so where the kind of chat is said.
  it('says when the chat\'s own job or document is left out, and how few jobs a comparison has left', () => {
    expect(chatHeading(jobChat('pA', { homeLeftOut: true })).about).toBe('AlphaCo · left out of this chat');
    expect(chatHeading(documentChat('d1', 'Classic resume', { homeLeftOut: true })).about).toBe('Resume · left out of this chat');
    expect(chatHeading(compareChat('cmp', ['pA'])).about).toBe('1 job left in this comparison');
    expect(chatHeading(compareChat('cmp', [])).about).toBe('0 jobs left in this comparison');
  });
});

describe('itemName', () => {
  it('names a job by its title and company, and a document by its name', () => {
    expect(itemName('job', { title: 'Job A Engineer', company: 'AlphaCo' })).toBe('Job A Engineer · AlphaCo');
    expect(itemName('job', { id: 'gone' })).toBe('A job no longer listed');
    expect(itemName('document', { name: 'Classic resume' })).toBe('Classic resume');
    expect(itemName('document', { id: 'gone' })).toBe('A document that was deleted');
  });
});
