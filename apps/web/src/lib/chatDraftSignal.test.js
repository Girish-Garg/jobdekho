import { describe, it, expect, vi } from 'vitest';
import { startChatDraft, onChatDraft, takeDraft } from './chatDraftSignal.js';

describe('chatDraftSignal', () => {
  it('carries the words to start with, each draft with its own id', () => {
    const handler = vi.fn();
    const stop = onChatDraft(handler);
    startChatDraft('Add a project: ');
    startChatDraft('Add a job: ');
    stop();
    const [first, second] = handler.mock.calls.map(([draft]) => draft);
    expect(first.text).toBe('Add a project: ');
    expect(second.id).toBeGreaterThan(first.id);
  });

  // A box that remounts must not put back a draft already sent or cleared.
  it('lets each draft be taken exactly once', () => {
    let draft;
    const stop = onChatDraft((d) => { draft = d; });
    startChatDraft('Add a skill: ');
    stop();
    expect(takeDraft(draft)).toBe(true);
    expect(takeDraft(draft)).toBe(false);
    expect(takeDraft(null)).toBe(false);
  });
});
