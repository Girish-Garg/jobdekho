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
    localStorage.setItem('jobdekho-chat-on-screen', 'job:p1');
    expect(readSavedChat()).toBe('job:p1');
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
