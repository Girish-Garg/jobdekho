// The resume card's checklist while the AI reads a resume, from the events
// in apps/server/src/ai/events.js: handed over once the prompt is sent,
// finding things while the CLI works, then comparing what came back with
// the profile, which happens here the moment the answer lands. Each step
// is 'done', 'current' or 'next', and exactly one is current until the end.
export function fillSteps(events, { label = 'your AI', finished = false } = {}) {
  const stages = new Set(events.map((event) => event.stage ?? event.event));
  const read = finished || stages.has('reply');
  const sent = read || stages.has('send') || stages.has('wait') || stages.has('retry');
  const steps = [
    { key: 'send', text: sent ? `Handed to ${label}` : `Handing to ${label}`, done: sent },
    { key: 'read', text: 'Finding roles, projects and skills', done: read },
    { key: 'compare', text: 'Comparing with your profile', done: finished },
    { key: 'ready', text: 'Ready for you to review', done: finished },
  ];
  const current = steps.findIndex((step) => !step.done);
  return steps.map(({ done, ...step }, i) => ({ ...step, state: done ? 'done' : i === current ? 'current' : 'next' }));
}

// The CLI was mid sign-in and is being asked again; said, or the wait reads
// as a hang.
export const retrying = (events) => events.at(-1)?.stage === 'retry';

// How quickly the bar closes on its ceiling: most of the way by thirty
// seconds, the middle of the usual twenty to forty.
const PACE_MS = 15000;
const CEILING = 0.9;

// Where the bar stands. It eases towards nine tenths over the usual read
// and fills only once the answer is in, so it never claims to know how far
// along the CLI really is.
export function fillFraction(elapsedMs, finished = false) {
  if (finished) return 1;
  return CEILING * (1 - Math.exp(-Math.max(0, elapsedMs) / PACE_MS));
}
