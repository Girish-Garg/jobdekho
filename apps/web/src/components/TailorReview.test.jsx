import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import TailorReview from './TailorReview.jsx';
import { NO_CHOICES } from '../lib/tailorReview.js';
import { notePdfLength } from '../lib/pdfLength.js';
import { resetChatStore } from '../lib/chatStore.js';
import { getTailorReview, getTailorFit, tailorPreview, putTailorChoices, createDocument } from '../api.js';

vi.mock('../api.js', () => ({
  getTailorReview: vi.fn(), getTailorFit: vi.fn(), tailorPreview: vi.fn(), putTailorChoices: vi.fn(), createDocument: vi.fn(),
}));

const JOB = { id: 'p1', title: 'Backend Engineer', company: 'Acme Systems' };
const REVIEW = {
  posting: JOB, createdAt: '2026-10-13T00:00:00.000Z', choices: NO_CHOICES, factCheck: { flags: [], ok: true }, coverage: null,
  skills: [
    { name: 'Redis', leftOut: false, asked: true }, { name: 'Git', leftOut: false, asked: false }, { name: 'Kotlin', leftOut: true, asked: false },
  ],
  sections: [
    { key: 'experience', title: 'Experience', entries: [{
      id: 'e1', title: 'Software Developer Intern', organisation: 'Zensar', state: 'picked', own: null,
      bullets: [{ now: 'Designed REST APIs.', yours: 'Built REST APIs for an internal tool.' }, { now: 'Mentored 2 interns.', yours: '' }],
      dropped: ['Migrated 15 jQuery pages.'],
    }] },
    { key: 'projects', title: 'Projects', entries: [
      { id: 'p9', title: 'Expense Tracker', organisation: '', state: 'fill', bullets: null, dropped: [], own: ['Android app in Kotlin.'] },
      { id: 'p8', title: 'Chess Engine', organisation: '', state: 'out', bullets: null, dropped: [], own: ['A chess engine.'] },
    ] },
  ],
};
const FIT = {
  enough: true,
  cuts: [
    { key: 'entry:p9', label: 'Project: Expense Tracker', why: 'Not picked for this job', patch: { flipped: ['p9'] }, saves: 4 },
    { key: 'section:achievements', label: 'Section: Achievements', why: 'One entry', patch: { flipped: ['a1'] }, saves: 0 },
    { key: 'compact', label: 'Compact layout', why: 'Tighter spacing, nothing removed', patch: { compact: true }, saves: 5 },
  ],
};

const page = (pages, lastLines) => notePdfLength(new Blob(['%PDF']), { get: (name) => ({ 'x-pdf-pages': String(pages), 'x-pdf-last-lines': String(lastLines) })[name] ?? null });
// A choice is saved a moment after the click: saves queue, one at a time.
const expectSaved = (choices) => waitFor(() => expect(putTailorChoices).toHaveBeenLastCalledWith('p1', choices));

async function open({ review = REVIEW, pages = 2 } = {}) {
  getTailorReview.mockResolvedValue(review);
  tailorPreview.mockResolvedValue(page(pages, 6));
  const onClose = vi.fn();
  const onMade = vi.fn();
  render(<TailorReview job={JOB} onClose={onClose} onMade={onMade} />);
  await screen.findByRole('region', { name: 'Skills' });
  return { onClose, onMade };
}

beforeEach(() => {
  resetChatStore();
  vi.clearAllMocks();
  URL.createObjectURL = vi.fn(() => 'blob:page');
  URL.revokeObjectURL = vi.fn();
  getTailorFit.mockResolvedValue(FIT);
  putTailorChoices.mockImplementation(async (id, choices) => ({ kind: 'resume-tailor', postingId: id, result: { choices } }));
});

describe('TailorReview', () => {
  it('names the job, shows the page beside the list and says how long it runs', async () => {
    await open();
    expect(screen.getByText('Backend Engineer at Acme Systems')).toBeInTheDocument();
    expect(await screen.findByTitle('PDF preview')).toHaveAttribute('src', expect.stringContaining('blob:page'));
    expect(screen.getAllByText('2 pages, about 6 lines over')).toHaveLength(2);
    expect(tailorPreview).toHaveBeenCalledWith('p1');
  });

  it('lists what could go to fit one page, content before layout, with the lines each saves', async () => {
    await open();
    const fit = await screen.findByRole('region', { name: 'Fit on one page' });
    await within(fit).findByText('Project: Expense Tracker');
    expect(within(fit).getByText('saves 4 lines')).toBeInTheDocument();
    expect(within(fit).getByText('Tighter spacing, nothing removed')).toBeInTheDocument();
    // A cut that would save nothing is not offered.
    expect(within(fit).queryByText('Section: Achievements')).not.toBeInTheDocument();
    const boxes = within(fit).getAllByRole('checkbox');
    expect(boxes).toHaveLength(2);
    fireEvent.click(boxes[0]);
    await expectSaved({ ...NO_CHOICES, flipped: ['p9'] });
    expect(boxes[0]).toBeChecked();
    // The page is drawn again once the choice is saved.
    await waitFor(() => expect(tailorPreview).toHaveBeenCalledTimes(2));
    fireEvent.click(boxes[1]);
    await expectSaved({ ...NO_CHOICES, flipped: ['p9'], compact: true });
  });

  it('does not measure cuts for a resume that fits and was never cut', async () => {
    await open({ pages: 1 });
    await screen.findByTitle('PDF preview');
    expect(screen.getByText('1 page')).toBeInTheDocument();
    expect(getTailorFit).not.toHaveBeenCalled();
    expect(screen.queryByRole('region', { name: 'Fit on one page' })).not.toBeInTheDocument();
  });

  it('says so when every cut together is still not enough', async () => {
    getTailorFit.mockResolvedValue({ ...FIT, enough: false });
    await open();
    expect(await screen.findByText(/Even with all of these it runs past one page/)).toBeInTheDocument();
  });

  it('puts a left-out skill back and takes any other out', async () => {
    await open();
    fireEvent.click(screen.getByRole('button', { name: 'Put Kotlin back' }));
    await expectSaved({ ...NO_CHOICES, skills: ['Kotlin'] });
    fireEvent.click(screen.getByRole('button', { name: 'Leave Git out' }));
    await expectSaved({ ...NO_CHOICES, skills: ['Kotlin'], skillsOut: ['Git'] });
    expect(screen.getByRole('button', { name: 'Put Git back' })).toBeInTheDocument();
    expect(screen.getByText('The saffron ones are skills this job asks for.')).toBeInTheDocument();
  });

  it('takes a whole entry out or puts one back with its switch', async () => {
    await open();
    expect(screen.getByText('Not picked for this job, in so Projects is not thin')).toBeInTheDocument();
    expect(screen.queryByText('A chess engine.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('switch', { name: 'Chess Engine, in the resume' }));
    await expectSaved({ ...NO_CHOICES, flipped: ['p8'] });
    expect(screen.getByText('A chess engine.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('switch', { name: 'Software Developer Intern at Zensar, in the resume' }));
    await expectSaved({ ...NO_CHOICES, flipped: ['p8', 'e1'] });
    expect(screen.queryByText('Designed REST APIs.')).not.toBeInTheDocument();
  });

  it('shows each bullet with the original under it, and lets it be taken back, cut or put back', async () => {
    await open();
    const section = screen.getByRole('region', { name: 'Experience' });
    expect(within(section).getByText('Yours: Built REST APIs for an internal tool.')).toBeInTheDocument();
    fireEvent.click(within(section).getByRole('button', { name: 'Use mine' }));
    await expectSaved({ ...NO_CHOICES, mine: { e1: [0] } });
    expect(within(section).getByText('Built REST APIs for an internal tool.')).toBeInTheDocument();
    expect(within(section).getByText('Reworded: Designed REST APIs.')).toBeInTheDocument();
    fireEvent.click(within(section).getAllByRole('button', { name: 'Cut' })[1]);
    await expectSaved({ ...NO_CHOICES, mine: { e1: [0] }, cut: { e1: [1] } });
    // The cut bullet and the dropped one each offer "Put back"; the dropped one is last.
    const back = within(section).getAllByRole('button', { name: 'Put back' });
    expect(back).toHaveLength(2);
    fireEvent.click(back[1]);
    await expectSaved({ ...NO_CHOICES, mine: { e1: [0] }, cut: { e1: [1] }, back: { e1: [0] } });
    expect(within(section).getByRole('button', { name: 'Leave out' })).toBeInTheDocument();
  });

  it('starts from the choices already saved', async () => {
    await open({ review: { ...REVIEW, choices: { ...NO_CHOICES, skills: ['Kotlin'], flipped: ['p9'] } } });
    expect(screen.getByRole('button', { name: 'Leave Kotlin out' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Expense Tracker, in the resume' })).toHaveAttribute('aria-checked', 'false');
  });

  it('makes the resume from the plan as chosen, and hands it on', async () => {
    createDocument.mockResolvedValue({ id: 'd7', name: 'Resume for Backend Engineer at Acme Systems' });
    const { onMade } = await open();
    fireEvent.click(screen.getByRole('button', { name: 'Make the resume' }));
    await waitFor(() => expect(onMade).toHaveBeenCalledWith({ id: 'd7', name: 'Resume for Backend Engineer at Acme Systems' }));
    expect(createDocument).toHaveBeenCalledWith({ kind: 'resume', templateId: 'classic', postingId: 'p1', fromPlan: true });
  });

  it('closes on the cross', async () => {
    const { onClose } = await open();
    fireEvent.click(screen.getByRole('button', { name: 'Close the review' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('says why when there is no tailoring to review, with a way back', async () => {
    getTailorReview.mockRejectedValue(new Error('Tailor your resume for this job first.'));
    const onClose = vi.fn();
    render(<TailorReview job={JOB} onClose={onClose} onMade={() => {}} />);
    expect(await screen.findByText('Tailor your resume for this job first.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back to your documents' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
