// The waiting card's checklist for one AI call, built from the events in
// apps/server/src/ai/events.js rather than from a guess at how far along it
// is: handed over, the CLI at work, the web (only once the chat has actually
// gone there), then writing it up. Each step is 'done', 'current' or 'next',
// and exactly one is current until the answer lands.
//
// `doing` is the caller's word for the work ("thinking", "checking the
// web"), so a check that browses for minutes does not say it is reading.
const capital = (text) => text.charAt(0).toUpperCase() + text.slice(1);

export function aiSteps(events, { label = '', doing = 'thinking' } = {}) {
  const stages = events.map((event) => event.stage ?? event.event);
  const webAt = stages.indexOf('web');
  const repliedAt = (from, to = stages.length) => stages.slice(from, to).includes('reply');
  // Reaching the web means the first answer came back, and anything later
  // means what came before it happened, even when an event was missed.
  const worked = webAt !== -1 || repliedAt(0);
  const sent = worked || stages.includes('send');
  const steps = [
    { key: 'send', text: label ? `Sent to ${label}` : 'Sending', done: sent },
    { key: 'work', text: capital(doing), done: worked },
  ];
  if (webAt !== -1) steps.push({ key: 'web', text: 'Checking the web', done: repliedAt(webAt) });
  steps.push({ key: 'write', text: 'Writing it up', done: false });

  const current = steps.findIndex((step) => !step.done);
  return steps.map((step, i) => ({ key: step.key, text: step.text, state: step.done ? 'done' : i === current ? 'current' : 'next' }));
}

// "12s" under a minute, "1:05" past it: a wait of a minute or two is read
// at a glance as minutes, and seconds alone past sixty make the eye count.
export function elapsedText(ms) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
