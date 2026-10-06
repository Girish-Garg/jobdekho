import { describe, it, expect, afterEach } from 'vitest';
import { realId, entryFor } from './chatStore.js';
import { readSavedChat } from './savedChat.js';

afterEach(() => localStorage.clear());

// The chat on screen is read back from browser storage, which anything on
// this computer can change: an id every plain object answers to
// ("constructor") once found a function for a page and blanked the app.
describe('a chat id named like a property every object has', () => {
  it('is never read back as the chat on screen', () => {
    for (const id of ['constructor', 'toString', '__proto__']) {
      localStorage.setItem('jobdekho-chat-on-screen', id);
      expect(readSavedChat()).toBeNull();
    }
    localStorage.setItem('jobdekho-chat-on-screen', '4b8e7c1a-2f3d-4e5f-8a9b-0c1d2e3f4a5b');
    expect(readSavedChat()).toBe('4b8e7c1a-2f3d-4e5f-8a9b-0c1d2e3f4a5b');
  });

  // Nothing is open in a new session, so a chat that followed what was
  // open is not brought back: the chat starts general.
  it('does not bring back a job or document chat that followed what was open', () => {
    for (const id of ['job:p1', 'document:d1']) {
      localStorage.setItem('jobdekho-chat-on-screen', id);
      expect(readSavedChat()).toBeNull();
    }
  });

  it('finds no chat under it', () => {
    const s = { alias: {}, pages: { 'job:p1': { chat: { id: 'job:p1' } } } };
    for (const id of ['constructor', 'toString', '__proto__']) {
      expect(realId(id, s)).toBe(id);
      expect(entryFor(s.pages, id, s)).toBeNull();
    }
    expect(entryFor(s.pages, 'job:p1', s)).toEqual({ chat: { id: 'job:p1' } });
  });
});
