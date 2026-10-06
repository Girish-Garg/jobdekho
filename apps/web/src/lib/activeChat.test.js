import { describe, it, expect, vi, beforeEach } from 'vitest';
import { onScreenId, onOpenChat, openChat, pick, setPage, setPinned } from './activeChat.js';
import { announceOpenPosting } from './openPostingSignal.js';
import { announceOpenDocument } from './openDocumentSignal.js';
import { chatStore } from './chatStore.js';

const A = { id: 'pA', title: 'Job A Engineer', company: 'AlphaCo' };
const B = { id: 'pB', title: 'Job B Analyst', company: 'BetaCo' };

beforeEach(() => {
  announceOpenPosting(null);
  announceOpenDocument(null);
  pick('c-general');
});

describe('which chat is on screen', () => {
  it('follows the job opened in the pane, each in its own chat', () => {
    announceOpenPosting(A);
    expect(onScreenId()).toBe('job:pA');
    announceOpenPosting(B);
    expect(onScreenId()).toBe('job:pB');
  });

  it('goes back to the chat on screen before the pane opened one when the pane closes', () => {
    announceOpenPosting(A);
    announceOpenPosting(B);
    announceOpenPosting(null);
    expect(onScreenId()).toBe('c-general');
  });

  it('stays on a chat the person chose while the pane was open, when the pane closes', () => {
    announceOpenPosting(A);
    pick('c-compare');
    announceOpenPosting(null);
    expect(onScreenId()).toBe('c-compare');
  });

  it('keeps the chat put with the pin on, whatever the pane opens', () => {
    announceOpenPosting(A);
    setPinned(true);
    announceOpenPosting(B);
    expect(onScreenId()).toBe('job:pA');
    announceOpenPosting(null);
    expect(onScreenId()).toBe('job:pA');
  });

  it('follows again once the pin is off and the pane opens another job', () => {
    setPinned(true);
    announceOpenPosting(A);
    setPinned(false);
    expect(onScreenId()).toBe('c-general');
    announceOpenPosting(B);
    expect(onScreenId()).toBe('job:pB');
  });

  // A job or a document no longer looked at is no longer what the chat is
  // about: kept, "Classic resume" stayed on every page after the Resume page.
  it('puts back the chat from before on leaving the page, as closing the pane does', () => {
    announceOpenPosting(A);
    setPage('profile');
    announceOpenPosting(null);
    expect(onScreenId()).toBe('c-general');
    setPage('resume');
    announceOpenDocument({ id: 'd1', name: 'Classic resume', kind: 'resume' });
    expect(onScreenId()).toBe('document:d1');
    setPage('postings');
    expect(onScreenId()).toBe('c-general');
  });

  it('keeps the chat it had on leaving the page with the pin on', () => {
    announceOpenPosting(A);
    setPinned(true);
    setPage('profile');
    expect(onScreenId()).toBe('job:pA');
    setPinned(false);
  });

  it('follows the open document on the Resume page, and a job only on the feed', () => {
    setPage('resume');
    announceOpenDocument({ id: 'd1', name: 'Classic resume', kind: 'resume' });
    expect(onScreenId()).toBe('document:d1');
    announceOpenPosting(A);
    expect(onScreenId()).toBe('document:d1');
  });

  it('follows the open document again on coming back to the Resume page', () => {
    setPage('resume');
    announceOpenDocument({ id: 'd1', name: 'Classic resume', kind: 'resume' });
    setPage('settings');
    pick('c-general');
    setPage('resume');
    announceOpenDocument({ id: 'd1', name: 'Classic resume', kind: 'resume' });
    expect(onScreenId()).toBe('document:d1');
  });

  it('counts a chat the person picks that is the one already followed as no change', () => {
    chatStore.set({ alias: { 'job:pA': 'c-pA' } });
    announceOpenPosting(A);
    pick('c-pA');
    announceOpenPosting(null);
    expect(onScreenId()).toBe('c-general');
  });

  it('opens a chat from outside the panel, and asks for the panel to open', () => {
    const heard = vi.fn();
    const stop = onOpenChat(heard);
    openChat('c-other');
    stop();
    expect(onScreenId()).toBe('c-other');
    expect(heard).toHaveBeenCalledWith('c-other');
  });

  it('remembers the chosen chat for the next page', () => {
    pick('c-kept');
    expect(localStorage.getItem('jobdekho-chat-on-screen')).toBe('c-kept');
  });
});
