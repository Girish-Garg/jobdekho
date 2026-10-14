import { bulletIs, entryShown, skillOut, withBullet, withEntry, withSkill } from './tailorReview.js';
import { nameOf, reworded } from './tailorBulletSteps.js';

// What going through a tailoring asks, as questions for the dock above the
// chat's box (see questionDock.js), and what each answer does to the
// person's choices (tailorReview.js). Pure: the asking and the saving are
// tailorAsk.js's. A step is { questions(choices), apply(choices, picks) },
// and one with nothing to ask about is never made.
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

function skillsStep(review) {
  const left = review.skills.filter((skill) => skill.leftOut);
  if (!left.length) return null;
  return {
    questions: (choices) => [{
      header: 'Skills', multiSelect: true, submitLabel: 'Done',
      question: 'This job does not ask for these. Leave them out?',
      detail: 'Ticked ones stay out of the Skills rows and every Stack line.',
      options: left.map((skill) => ({ label: skill.name })),
      defaults: left.filter((skill) => skillOut(choices, skill)).map((skill) => skill.name),
    }],
    apply: (choices, [out]) => left.reduce((now, skill) => withSkill(now, skill, out.includes(skill.name)), choices),
  };
}

function projectsStep(review) {
  const unpicked = (review.sections.find((section) => section.key === 'projects')?.entries ?? []).filter((entry) => entry.state !== 'picked');
  if (!unpicked.length) return null;
  return {
    questions: (choices) => [{
      header: 'Projects', multiSelect: true, submitLabel: 'Done',
      question: 'These were not picked for this job. Which should stay on the resume?',
      options: unpicked.map((entry) => ({
        label: entry.title || 'Untitled', value: entry.id,
        description: entry.state === 'fill' ? 'Kept so Projects is not thin' : 'Left out',
      })),
      defaults: unpicked.filter((entry) => entryShown(choices, entry)).map((entry) => entry.id),
    }],
    apply: (choices, [kept]) => unpicked.reduce((now, entry) => withEntry(now, entry, kept.includes(entry.id)), choices),
  };
}

const droppedQuestion = (entry, choices) => ({
  header: 'Left out', multiSelect: true, submitLabel: 'Done',
  question: `${plural(entry.dropped.length, 'bullet', 'bullets')} of yours left out. Put any back?`,
  options: entry.dropped.map((text, at) => ({ label: text, value: at })),
  defaults: entry.dropped.map((_, at) => at).filter((at) => bulletIs(choices, 'back', entry.id, at)),
});

const putBack = (choices, entry, back) => entry.dropped.reduce((now, _, at) => withBullet(now, 'back', entry.id, at, back.includes(at)), choices);

// One planned entry: keep its new wording, take all of it back, or go
// through it bullet by bullet (see tailorBulletSteps.js); with the bullets
// it left out beside, to put any back. Each answer is a list of picks.
function entryStep(entry) {
  const changed = reworded(entry);
  if (!changed.length && !entry.dropped.length) return null;
  return {
    entry,
    questions: (choices) => [
      ...(changed.length ? [{
        header: 'Wording', question: `${nameOf(entry)}: ${plural(changed.length, 'bullet', 'bullets')} reworded.`,
        detail: 'Every fact is from your profile.',
        options: [
          { label: 'Keep the new wording', value: 'new' },
          { label: 'Go through them one by one', value: 'each', description: 'Yours beside the new one, one at a time' },
          { label: 'Use my original wording', value: 'mine' },
        ],
      }] : []),
      ...(entry.dropped.length ? [droppedQuestion(entry, choices)] : []),
    ],
    apply: (choices, picks) => {
      const how = changed.length ? picks[0]?.[0] : null;
      const back = (changed.length ? picks[1] : picks[0]) ?? [];
      const mine = how === 'mine' || how === 'new' ? changed.reduce((now, b) => withBullet(now, 'mine', entry.id, b.at, how === 'mine'), choices) : choices;
      return entry.dropped.length ? putBack(mine, entry, back) : mine;
    },
    wantsEach: (picks) => changed.length > 0 && picks[0]?.[0] === 'each',
  };
}

export function tailorSteps(review) {
  const entries = review.sections.flatMap((section) => section.entries).filter((entry) => entry.state === 'picked' && entry.bullets);
  return [skillsStep(review), projectsStep(review), ...entries.map(entryStep)].filter(Boolean);
}
