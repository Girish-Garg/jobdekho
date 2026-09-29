// One line for the person watching an AI call, built from the events in
// apps/server/src/ai/events.js. The elapsed seconds come from the wait
// heartbeats: the model can take twenty seconds or more, and a control that
// says nothing for that long reads as a hang.
//
// `noun` is what was handed over (the resume, the posting) and `doing` is
// what the CLI is at while the person waits; both come from the caller,
// because a check that browses the web for three minutes should not claim to
// be "reading" the whole time.
export function progressText(event, label, { noun, doing = 'reading' } = {}) {
  const seconds = Math.round((event.elapsedMs ?? 0) / 1000);
  if (event.event === 'start') return `Asking ${label}...`;
  if (event.stage === 'send') return `${noun} handed to ${label}. Waiting for it to read...`;
  if (event.stage === 'wait') return `${label} is ${doing}... ${seconds}s`;
  if (event.stage === 'reply') return `${label} answered after ${seconds}s. Saving...`;
  // The CLI was mid token refresh and is being asked again; without a line
  // for it the progress went blank for the wait, which reads as a hang.
  if (event.stage === 'retry') return `${label} was busy signing itself in. Trying again (attempt ${event.attempt})...`;
  return '';
}
