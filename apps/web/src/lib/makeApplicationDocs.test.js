import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeApplicationDocs, makeLetterDoc } from './makeApplicationDocs.js';
import { takeOpenRequest } from './openDocumentSignal.js';

vi.mock('../api.js', () => ({ createDocument: vi.fn() }));

import { createDocument } from '../api.js';

const POSTING = { id: 'p1' };

beforeEach(() => {
  vi.clearAllMocks();
  createDocument.mockImplementation(async (body) => ({ id: body.kind === 'resume' ? 'r1' : 'l1', ...body }));
});

describe('makeLetterDoc', () => {
  it('makes the letter from the text given and opens it on the Resume page', async () => {
    const goToResume = vi.fn();
    const doc = await makeLetterDoc({ posting: POSTING, text: 'Mine.', goToResume });
    expect(createDocument).toHaveBeenCalledWith({ kind: 'cover-letter', templateId: 'letter', postingId: 'p1', text: 'Mine.' });
    expect(doc.id).toBe('l1');
    expect(goToResume).toHaveBeenCalled();
  });
});

describe('makeApplicationDocs', () => {
  it('uses the saved tailoring as it is, without running another', async () => {
    const tailor = vi.fn();
    const { letter, resume } = await makeApplicationDocs({ posting: POSTING, text: 'Mine.', tailored: true, tailor });
    expect(tailor).not.toHaveBeenCalled();
    expect(letter.id).toBe('l1');
    expect(resume).toMatchObject({ id: 'r1', kind: 'resume', fromPlan: true, postingId: 'p1' });
  });

  it('tailors first when there is no tailoring, then makes the resume and opens it', async () => {
    const tailor = vi.fn(async () => ({ kind: 'resume-tailor' }));
    const { resume } = await makeApplicationDocs({ posting: POSTING, text: 'Mine.', tailored: false, tailor, goToResume: () => {} });
    expect(tailor).toHaveBeenCalled();
    expect(createDocument.mock.calls.map(([body]) => body.kind)).toEqual(['cover-letter', 'resume']);
    expect(resume.id).toBe('r1');
    expect(takeOpenRequest()).toBe('r1');
  });

  it('keeps and opens the letter when the tailoring does not come back', async () => {
    const { letter, resume } = await makeApplicationDocs({ posting: POSTING, text: 'Mine.', tailored: false, tailor: async () => null, goToResume: () => {} });
    expect(letter.id).toBe('l1');
    expect(resume).toBeNull();
    expect(createDocument).toHaveBeenCalledTimes(1);
  });
});
