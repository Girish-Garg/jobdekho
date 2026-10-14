import { describe, it, expect } from 'vitest';
import { tailorSteps } from './tailorSteps.js';
import { eachBulletStep } from './tailorBulletSteps.js';
import { NO_CHOICES } from './tailorReview.js';

const INFOBEANS = {
  id: 'e1', title: 'Software Developer', organisation: 'Infobeans', state: 'picked', own: null,
  bullets: [{ now: 'Cut API time by 35%.', yours: 'Reduced API response time by 35%.' }, { now: 'Mentored 2 interns.', yours: '' }, { now: 'Wrote tests.', yours: 'Wrote unit tests with Jest.' }],
  dropped: ['Migrated jQuery pages.'],
};
const REVIEW = {
  skills: [{ name: 'Redis', leftOut: false, asked: true }, { name: 'Kotlin', leftOut: true, asked: false }, { name: 'Firebase', leftOut: true, asked: false }],
  sections: [
    { key: 'experience', title: 'Experience', entries: [INFOBEANS, { id: 'e2', title: 'Intern', organisation: 'Zensar', state: 'picked', bullets: [{ now: 'Same.', yours: '' }], dropped: [], own: null }] },
    { key: 'projects', title: 'Projects', entries: [
      { id: 'p1', title: 'Campus Marketplace', state: 'picked', bullets: [{ now: 'A.', yours: '' }], dropped: [], own: null },
      { id: 'p9', title: 'Expense Tracker', state: 'fill', bullets: null, dropped: [], own: ['x'] },
      { id: 'p8', title: 'Chess Engine', state: 'out', bullets: null, dropped: [], own: ['y'] },
    ] },
  ],
};

describe('tailorSteps', () => {
  const [skills, projects, entry, ...rest] = tailorSteps(REVIEW);

  it('asks about what there is to ask about, and nothing else', () => {
    // Zensar and the picked project kept every word, so they are not asked about.
    expect(rest).toEqual([]);
  });

  it('asks which left-out skills stay out, all ticked to begin with', () => {
    const [question] = skills.questions(NO_CHOICES);
    expect(question).toMatchObject({ header: 'Skills', multiSelect: true, defaults: ['Kotlin', 'Firebase'] });
    expect(question.options.map((o) => o.label)).toEqual(['Kotlin', 'Firebase']);
    expect(skills.apply(NO_CHOICES, [['Firebase']]).skills).toEqual(['Kotlin']);
    expect(skills.questions({ ...NO_CHOICES, skills: ['Kotlin'] })[0].defaults).toEqual(['Firebase']);
  });

  it('asks which unpicked projects stay, the ones the resume carries ticked', () => {
    const [question] = projects.questions(NO_CHOICES);
    expect(question.options).toEqual([
      { label: 'Expense Tracker', value: 'p9', description: 'Kept so Projects is not thin' },
      { label: 'Chess Engine', value: 'p8', description: 'Left out' },
    ]);
    expect(question.defaults).toEqual(['p9']);
    expect(projects.apply(NO_CHOICES, [['p8']]).flipped).toEqual(['p9', 'p8']);
    expect(projects.apply(NO_CHOICES, [['p9']]).flipped).toEqual([]);
  });

  it('asks about one role and its wording, and what it left out, side by side', () => {
    const [wording, dropped] = entry.questions(NO_CHOICES);
    expect(wording.question).toBe('Software Developer at Infobeans: 2 bullets reworded.');
    expect(wording.options.map((o) => o.value)).toEqual(['new', 'each', 'mine']);
    expect(dropped).toMatchObject({ header: 'Left out', multiSelect: true, defaults: [], options: [{ label: 'Migrated jQuery pages.', value: 0 }] });
    expect(entry.apply(NO_CHOICES, [['mine'], [0]])).toMatchObject({ mine: { e1: [0, 2] }, back: { e1: [0] } });
    expect(entry.apply({ ...NO_CHOICES, mine: { e1: [0] } }, [['new'], []])).toMatchObject({ mine: { e1: [] }, back: { e1: [] } });
    expect(entry.wantsEach([['each'], []])).toBe(true);
    expect(entry.wantsEach([['new'], []])).toBe(false);
  });

  it('goes bullet by bullet when asked to, with the original above the new ones', () => {
    const each = eachBulletStep(INFOBEANS);
    const questions = each.questions(NO_CHOICES);
    expect(questions.map((q) => q.header)).toEqual(['Bullet 1', 'Bullet 2']);
    expect(questions[0].detail).toBe('Yours: Reduced API response time by 35%.\nNew: Cut API time by 35%.');
    expect(each.apply(NO_CHOICES, [['mine'], ['cut']])).toMatchObject({ mine: { e1: [0] }, cut: { e1: [2] } });
    expect(each.apply({ ...NO_CHOICES, mine: { e1: [0] }, cut: { e1: [2] } }, [['new'], ['new']])).toMatchObject({ mine: { e1: [] }, cut: { e1: [] } });
  });

  it('asks nothing of a plan that left nothing out and reworded nothing', () => {
    expect(tailorSteps({ skills: [{ name: 'Redis', leftOut: false }], sections: [] })).toEqual([]);
  });
});
