import { describe, it, expect } from 'vitest';
import { progressText } from './aiProgress.js';

describe('progressText', () => {
  it('names the CLI that is answering', () => {
    expect(progressText({ event: 'start', provider: 'claude', path: 'x' }, 'Claude Code')).toBe('Asking Claude Code...');
    expect(progressText({ event: 'progress', stage: 'send', chars: 900 }, 'Claude Code')).toMatch(/Claude Code/);
  });

  it('turns the wait heartbeat into elapsed seconds', () => {
    expect(progressText({ event: 'progress', stage: 'wait', elapsedMs: 5000 }, 'Claude Code')).toBe('Claude Code is reading... 5s');
    expect(progressText({ event: 'progress', stage: 'wait', elapsedMs: 24600 }, 'Claude Code')).toBe('Claude Code is reading... 25s');
  });

  it('says the answer is in once the reply stage arrives', () => {
    expect(progressText({ event: 'progress', stage: 'reply', elapsedMs: 18000, chars: 210 }, 'Claude Code'))
      .toBe('Claude Code answered after 18s. Saving...');
  });

  it('says nothing for a stage it does not know, rather than guessing', () => {
    expect(progressText({ event: 'progress', stage: 'retry' }, 'Claude Code')).toBe('');
  });
});
