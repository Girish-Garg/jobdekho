import { withBullet } from './tailorReview.js';

// The questions that go through one role or project of a tailoring bullet
// by bullet, for the person who picked "Go through them one by one" (see
// tailorSteps.js, whose step this follows).
export const nameOf = (entry) => [entry.title || 'Untitled', entry.organisation].filter(Boolean).join(' at ');

// The bullets a plan reworded that have the person's own words beside them,
// each with its place in the entry.
export const reworded = (entry) => (entry.bullets ?? []).map((bullet, at) => ({ ...bullet, at })).filter((bullet) => bullet.yours);

// Every reworded bullet of one entry as its own question, the person's
// words above the new ones.
export function eachBulletStep(entry) {
  const changed = reworded(entry);
  return {
    questions: () => changed.map((bullet, i) => ({
      header: `Bullet ${i + 1}`, question: nameOf(entry), detail: `Yours: ${bullet.yours}\nNew: ${bullet.now}`,
      options: [{ label: 'Keep the new one', value: 'new' }, { label: 'Use mine', value: 'mine' }, { label: 'Cut it', value: 'cut' }],
    })),
    apply: (choices, picks) => changed.reduce((now, bullet, i) => {
      const pick = picks[i]?.[0];
      const mine = withBullet(now, 'mine', entry.id, bullet.at, pick === 'mine');
      return withBullet(mine, 'cut', entry.id, bullet.at, pick === 'cut');
    }, choices),
  };
}
