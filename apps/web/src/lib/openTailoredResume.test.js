import { describe, it, expect, vi, beforeEach } from 'vitest';
import { openTailoredResume } from './openTailoredResume.js';
import { takeOpenRequest } from './openDocumentSignal.js';

vi.mock('../api.js', () => ({ createDocument: vi.fn() }));

import { createDocument } from '../api.js';

beforeEach(() => {
  vi.clearAllMocks();
  takeOpenRequest();
});

describe('openTailoredResume', () => {
  it('drafts a resume from the job\'s saved plan, asks for it to be opened, then goes to the Resume page', async () => {
    createDocument.mockResolvedValue({ id: 'd7', name: 'Resume for Staff Engineer at Initech' });
    const goToResume = vi.fn(() => expect(takeOpenRequest()).toBe('d7'));
    const doc = await openTailoredResume({ id: 'p9', title: 'Staff Engineer' }, goToResume);
    expect(createDocument).toHaveBeenCalledWith({ kind: 'resume', templateId: 'classic', postingId: 'p9', fromPlan: true });
    expect(goToResume).toHaveBeenCalledTimes(1);
    expect(doc.id).toBe('d7');
  });

  it('goes nowhere when the server refuses, and says why', async () => {
    createDocument.mockRejectedValue(new Error('Tailor your resume for this job first.'));
    const goToResume = vi.fn();
    await expect(openTailoredResume({ id: 'p9' }, goToResume)).rejects.toThrow('Tailor your resume for this job first.');
    expect(goToResume).not.toHaveBeenCalled();
    expect(takeOpenRequest()).toBeNull();
  });
});
