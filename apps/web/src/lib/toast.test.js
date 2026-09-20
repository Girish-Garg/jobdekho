import { describe, it, expect, vi } from 'vitest';
import { notify, notifyError, onNotice } from './toast.js';

describe('notify', () => {
  it('dispatches a notice carrying a fresh id and what was asked for', () => {
    const handler = vi.fn();
    const stop = onNotice(handler);
    notify({ title: 'Saved', detail: 'x', kind: 'done' });
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ title: 'Saved', detail: 'x', kind: 'done' }));
    stop();
  });

  it('falls back to error for a kind it does not recognise', () => {
    const handler = vi.fn();
    const stop = onNotice(handler);
    notify({ title: 'x', kind: 'bogus' });
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ kind: 'error' }));
    stop();
  });

  it('stops reaching a handler once its cleanup runs', () => {
    const handler = vi.fn();
    onNotice(handler)();
    notify({ title: 'x' });
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('notifyError', () => {
  it('reads the message as the detail and defaults the title', () => {
    const handler = vi.fn();
    const stop = onNotice(handler);
    notifyError(new Error('boom'));
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Something went wrong', detail: 'boom', kind: 'error',
    }));
    stop();
  });

  it('takes the title it is given', () => {
    const handler = vi.fn();
    const stop = onNotice(handler);
    notifyError(new Error('boom'), 'Cover letter');
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ title: 'Cover letter' }));
    stop();
  });

  // Both a ProviderError and a LatexError travel to the browser as the same
  // plain { error, kind } body (see lib/request.js's failure()) - nothing on
  // the wire says which server module raised it. Only a caller that knows
  // its own call is an AI action passes `actionable`, so the kind becomes a
  // button there and nowhere else.
  it('forwards the kind as the action only when the caller marks it actionable', () => {
    const handler = vi.fn();
    const stop = onNotice(handler);
    const err = Object.assign(new Error('not signed in'), { kind: 'login' });
    notifyError(err, 'Cover letter', { actionable: true });
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ action: 'login' }));
    stop();
  });

  it('does not forward the kind when the caller does not ask for that', () => {
    const handler = vi.fn();
    const stop = onNotice(handler);
    // Same kind a ProviderError would carry, but from a call (a resume
    // compile, a plain save) that never marks itself actionable.
    const err = Object.assign(new Error('No LaTeX installation was found.'), { kind: 'not_found' });
    notifyError(err, 'Resume PDF');
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ action: null }));
    stop();
  });

  it('stringifies a non-Error thrown value rather than reading .message off it', () => {
    const handler = vi.fn();
    const stop = onNotice(handler);
    notifyError('plain string');
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ detail: 'plain string' }));
    stop();
  });
});
