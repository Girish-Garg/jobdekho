import { describe, it, expect, vi } from 'vitest';
import {
  announceOpenDocument, currentOpenDocument, onOpenDocumentChange, requestOpenDocument, takeOpenRequest, onOpenDocumentRequest,
} from './openDocumentSignal.js';

describe('openDocumentSignal', () => {
  it('remembers only the id, name and kind of the open document', () => {
    announceOpenDocument({ id: 'd1', name: 'Classic resume', kind: 'resume', tex: '\documentclass{article}' });
    expect(currentOpenDocument()).toEqual({ id: 'd1', name: 'Classic resume', kind: 'resume' });
    announceOpenDocument(null);
    expect(currentOpenDocument()).toBeNull();
  });

  it('tells a listener when the open document changes', () => {
    const handler = vi.fn();
    const stop = onOpenDocumentChange(handler);
    announceOpenDocument({ id: 'd2', name: 'Letter', kind: 'cover-letter' });
    stop();
    announceOpenDocument(null);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ id: 'd2', name: 'Letter', kind: 'cover-letter' });
  });

  // The chat asks before the workspace exists: asking is what takes the
  // person to the Resume page, where the workspace then mounts.
  it('keeps a request to open a document until a workspace takes it, once', () => {
    const handler = vi.fn();
    const stop = onOpenDocumentRequest(handler);
    requestOpenDocument('d9');
    stop();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(takeOpenRequest()).toBe('d9');
    expect(takeOpenRequest()).toBeNull();
  });
});
