import { describe, it, expect } from 'vitest';
import { progressText } from './aiProgress.js';

const RESUME = { noun: 'Resume' };

describe('progressText', () => {
  it('names the CLI that is answering', () => {
    expect(progressText({ event: 'start', provider: 'claude', path: 'x' }, 'Claude Code', RESUME)).toBe('Asking Claude Code...');
    expect(progressText({ event: 'progress', stage: 'send', chars: 900 }, 'Claude Code', RESUME)).toMatch(/Claude Code/);
  });

  it('says what was handed over, in the caller\'s word', () => {
    expect(progressText({ event: 'progress', stage: 'send', chars: 900 }, 'Claude Code', RESUME))
      .toBe('Resume handed to Claude Code. Waiting for it to read...');
    expect(progressText({ event: 'progress', stage: 'send', chars: 900 }, 'Claude Code', { noun: 'Posting' }))
      .toBe('Posting handed to Claude Code. Waiting for it to read...');
  });

  it('turns the wait heartbeat into elapsed seconds', () => {
    expect(progressText({ event: 'progress', stage: 'wait', elapsedMs: 5000 }, 'Claude Code', RESUME)).toBe('Claude Code is reading... 5s');
    expect(progressText({ event: 'progress', stage: 'wait', elapsedMs: 24600 }, 'Claude Code', RESUME)).toBe('Claude Code is reading... 25s');
  });

  it('lets the caller say what the CLI is doing while it waits', () => {
    expect(progressText({ event: 'progress', stage: 'wait', elapsedMs: 65000 }, 'Claude Code', { noun: 'Posting', doing: 'checking the web' }))
      .toBe('Claude Code is checking the web... 65s');
  });

  it('says the answer is in once the reply stage arrives', () => {
    expect(progressText({ event: 'progress', stage: 'reply', elapsedMs: 18000, chars: 210 }, 'Claude Code', RESUME))
      .toBe('Claude Code answered after 18s. Saving...');
  });

  it('says nothing for a stage it does not know, rather than guessing', () => {
    expect(progressText({ event: 'progress', stage: 'rewinding' }, 'Claude Code', RESUME)).toBe('');
  });

  // A blank line while the CLI waits on its own token refresh read as a hang.
  it('says the CLI is being asked again after it was busy', () => {
    expect(progressText({ event: 'progress', stage: 'retry', attempt: 2 }, 'Claude Code', RESUME))
      .toBe('Claude Code was busy signing itself in. Trying again (attempt 2)...');
  });

  it('says the chat is searching the web, and what went out', () => {
    expect(progressText({ event: 'progress', stage: 'web' }, 'Claude Code', RESUME))
      .toBe('Searching the web with your question, not your profile...');
  });
});
