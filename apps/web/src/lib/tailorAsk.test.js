import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTailorReview, getTailorFit, tailorPreview, putTailorChoices, createDocument } from '../api.js';
import { goThroughTailoring } from './tailorAsk.js';
import { answerAsk, currentAsk, resetQuestionDock, stopAsking } from './questionDock.js';
import { NO_CHOICES } from './tailorReview.js';
import { notePdfLength } from './pdfLength.js';
import { takeOpenRequest } from './openDocumentSignal.js';
import { resetChatStore } from './chatStore.js';
import { onNotice } from './toast.js';

vi.mock('../api.js', () => ({
  getTailorReview: vi.fn(), getTailorFit: vi.fn(), tailorPreview: vi.fn(), putTailorChoices: vi.fn(), createDocument: vi.fn(),
}));

const POSTING = { id: 'p1', title: 'Backend Engineer', company: 'Acme Systems' };
const REVIEW = {
  posting: POSTING, choices: NO_CHOICES,
  skills: [{ name: 'Kotlin', leftOut: true }, { name: 'Firebase', leftOut: true }, { name: 'Redis', leftOut: false }],
  sections: [
    { key: 'experience', entries: [{ id: 'e1', title: 'Software Developer', organisation: 'Infobeans', state: 'picked', own: null, dropped: [],
      bullets: [{ now: 'Cut API time by 35%.', yours: 'Reduced API response time by 35%.' }, { now: 'Wrote tests.', yours: 'Wrote unit tests with Jest.' }] }] },
    { key: 'projects', entries: [{ id: 'p9', title: 'Expense Tracker', state: 'fill', bullets: null, dropped: [], own: ['x'] }] },
  ],
};
const FIT = { enough: true, cuts: [
  { key: 'section:achievements', label: 'Section: Achievements', why: 'One entry', patch: { flipped: ['a1'] }, saves: 3 },
  { key: 'compact', label: 'Compact layout', why: 'Tighter spacing, nothing removed', patch: { compact: true }, saves: 0 },
] };
const page = (pages, lastLines = 4) => notePdfLength(new Blob(['%PDF']), { get: (name) => ({ 'x-pdf-pages': String(pages), 'x-pdf-last-lines': String(lastLines) })[name] ?? null });

let last = 0;
async function nextAsk() {
  await vi.waitFor(() => expect(currentAsk('c1')?.id ?? last).not.toBe(last));
  last = currentAsk('c1').id;
  return currentAsk('c1');
}
async function answer(picks) {
  const ask = await nextAsk();
  answerAsk('c1', ask.id, picks);
  return ask;
}
const saved = () => putTailorChoices.mock.calls.at(-1)?.[1];

beforeEach(() => {
  vi.clearAllMocks();
  resetQuestionDock();
  resetChatStore();
  getTailorReview.mockResolvedValue(REVIEW);
  getTailorFit.mockResolvedValue(FIT);
  tailorPreview.mockResolvedValue(page(2));
  putTailorChoices.mockImplementation(async (id, choices) => ({ kind: 'resume-tailor', postingId: id, result: { choices } }));
  createDocument.mockResolvedValue({ id: 'd7' });
});

describe('going through a tailoring', () => {
  it('asks a question at a time, saves each answer, fits the page and makes the resume', async () => {
    const toResume = vi.fn();
    const done = goThroughTailoring({ chatId: 'c1', posting: POSTING, toResume });
    const skills = await answer([['Firebase']]);
    expect(skills).toMatchObject({ title: 'Your tailored resume', step: { at: 1, of: 5 } });
    await vi.waitFor(() => expect(saved()).toMatchObject({ skills: ['Kotlin'] }));
    await answer([[]]);
    await vi.waitFor(() => expect(saved()).toMatchObject({ flipped: ['p9'] }));
    const wording = await answer([['each']]);
    expect(wording.questions[0].header).toBe('Wording');
    const each = await answer([['mine'], ['cut']]);
    expect(each.questions.map((q) => q.header)).toEqual(['Bullet 1', 'Bullet 2']);
    await vi.waitFor(() => expect(saved()).toMatchObject({ mine: { e1: [0] }, cut: { e1: [1] } }));
    tailorPreview.mockResolvedValue(page(1));
    const fit = await answer([['section:achievements']]);
    expect(fit.step).toEqual({ at: 4, of: 5 });
    expect(fit.questions[0]).toMatchObject({ header: 'Fit', question: 'It runs to 2 pages, about 4 lines over. What should go?', skipLabel: 'Keep two pages' });
    // A cut that would save nothing is not offered.
    expect(fit.questions[0].options.map((o) => o.value)).toEqual(['section:achievements']);
    const ready = await answer([['make']]);
    expect(ready.questions[0].question).toBe('Ready: 1 page.');
    await done;
    expect(saved()).toMatchObject({ flipped: ['p9', 'a1'] });
    expect(createDocument).toHaveBeenCalledWith({ kind: 'resume', templateId: 'classic', postingId: 'p1', fromPlan: true });
    expect(takeOpenRequest()).toBe('d7');
    expect(toResume).toHaveBeenCalledTimes(1);
  });

  it('asks again while it still runs over, and stops asking on "Keep two pages"', async () => {
    const done = goThroughTailoring({ chatId: 'c1', posting: POSTING });
    for (let i = 0; i < 3; i += 1) await answer([[]]);
    const first = await answer([['section:achievements']]);
    expect(first.questions[0].header).toBe('Fit');
    const again = await answer([[]]);
    expect(again.questions[0].question).toMatch(/^Still 2 pages/);
    expect(again.questions[0].defaults).toEqual(['section:achievements']);
    await answer([['later']]);
    await done;
    expect(createDocument).not.toHaveBeenCalled();
  });

  it('skips the fit without LaTeX, and ends quietly when the person stops', async () => {
    tailorPreview.mockRejectedValue(new Error('LaTeX is not installed'));
    const heard = vi.fn();
    const off = onNotice(heard);
    const done = goThroughTailoring({ chatId: 'c1', posting: POSTING });
    for (let i = 0; i < 2; i += 1) await answer([[]]);
    await answer([['new']]);
    const ready = await nextAsk();
    expect(ready.questions[0]).toMatchObject({ header: 'Done', question: 'Ready.' });
    stopAsking('c1');
    await done;
    off();
    expect(heard).not.toHaveBeenCalled();
    expect(createDocument).not.toHaveBeenCalled();
  });
});
