import { createDocument, getTailorFit, getTailorReview, tailorPreview } from '../api.js';
import { askIn, AskStopped } from './questionDock.js';
import { choicesSettled, saveTailorChoices } from './tailorChoices.js';
import { choicesOf } from './tailorReview.js';
import { cutMade, withCut } from './tailorCuts.js';
import { overBy, pdfLength } from './pdfLength.js';
import { tailorSteps } from './tailorSteps.js';
import { eachBulletStep } from './tailorBulletSteps.js';
import { requestOpenDocument } from './openDocumentSignal.js';
import { notifyError } from './toast.js';

// Going through a tailoring with the person, a question at a time above the
// chat's box (see questionDock.js): the skills it left out, the projects it
// did not pick, each role's new wording, then, if the page runs past one,
// what should go to fit it, and last whether to make the resume. Each
// answer is saved as it comes (tailorChoices.js), so stopping anywhere
// keeps what was chosen. Nothing here asks the AI for anything.
const TITLE = 'Your tailored resume';
const ROUNDS = 3;
const lines = (n) => `saves ${n} ${n === 1 ? 'line' : 'lines'}`;

// How long the page runs now; null without LaTeX, or when it cannot be measured.
async function lengthNow(postingId) {
  await choicesSettled();
  return tailorPreview(postingId).then(pdfLength).catch(() => null);
}

function fitQuestion(length, cuts, choices, enough, round) {
  return {
    header: 'Fit', multiSelect: true, submitLabel: 'Cut these', skipLabel: 'Keep two pages',
    question: round ? `Still ${length.pages} pages${overBy(length)}. Pick more, or keep two pages.` : `It runs to ${length.pages} pages${overBy(length)}. What should go?`,
    detail: enough === false ? 'Even all of these together will not bring it to one page.' : 'Least useful for this job first. Lines are counted on the real page.',
    options: cuts.map((cut) => ({ label: cut.label, value: cut.key, description: [cut.why, cut.saves ? lines(cut.saves) : ''].filter(Boolean).join(', ') })),
    defaults: cuts.filter((cut) => cutMade(choices, cut.patch)).map((cut) => cut.key),
  };
}

// Asked again while it still runs over and the person keeps picking cuts.
async function fitStep({ postingId, ask, current, save }) {
  let length = await lengthNow(postingId);
  if (!length || length.pages < 2) return length;
  const { cuts = [], enough = null } = await getTailorFit(postingId).catch(() => ({}));
  const offered = cuts.filter((cut) => cut.saves !== 0);
  for (let round = 0; round < ROUNDS && length?.pages > 1 && offered.length; round += 1) {
    const [picked = []] = await ask([fitQuestion(length, offered, current(), enough, round)]);
    if (!picked.length) break;
    save(offered.reduce((now, cut) => withCut(now, cut.patch, picked.includes(cut.key)), current()));
    length = await lengthNow(postingId);
  }
  return length;
}

const doneQuestion = (length) => ({
  header: 'Done',
  question: length ? `Ready: ${length.pages === 1 ? '1 page' : `${length.pages} pages`}.` : 'Ready.',
  detail: 'Your choices are saved. Type below to change anything else.',
  options: [
    { label: 'Make the resume', value: 'make', description: 'Opens it on the Resume page' },
    { label: 'Not now', value: 'later', description: 'Your choices are kept' },
  ],
});

// The resume made from the plan as the person left it, opened on the Resume
// page, once their last choice is saved: the server makes it from what is.
export async function makeTailoredResume(posting, toResume) {
  await choicesSettled();
  requestOpenDocument((await createDocument({ kind: 'resume', templateId: 'classic', postingId: posting.id, fromPlan: true })).id);
  toResume?.();
}

export async function goThroughTailoring({ chatId, posting, toResume }) {
  try {
    const review = await getTailorReview(posting.id);
    let choices = choicesOf(review);
    const steps = tailorSteps(review);
    const of = steps.length + 2;
    const asker = (at) => (questions) => askIn(chatId, { title: TITLE, step: { at, of }, questions });
    const save = (next) => {
      choices = next;
      saveTailorChoices(posting.id, next).catch((err) => notifyError(err, 'Could not save that change'));
    };
    for (const [i, step] of steps.entries()) {
      const picks = await asker(i + 1)(step.questions(choices));
      save(step.apply(choices, picks));
      if (step.wantsEach?.(picks)) {
        const each = eachBulletStep(step.entry);
        save(each.apply(choices, await asker(i + 1)(each.questions(choices))));
      }
    }
    const length = await fitStep({ postingId: posting.id, ask: asker(of - 1), current: () => choices, save });
    const [[done]] = await asker(of)([doneQuestion(length)]);
    if (done === 'make') await makeTailoredResume(posting, toResume);
  } catch (err) {
    if (!(err instanceof AskStopped)) notifyError(err, 'Could not go through the tailoring');
  }
}
