// One line for the person watching an AI call, built from the events in
// apps/server/src/ai/events.js. The elapsed seconds come from the wait
// heartbeats: the model can take twenty seconds or more, and a control that
// says nothing for that long reads as a hang.
export function progressText(event, label) {
  const seconds = Math.round((event.elapsedMs ?? 0) / 1000);
  if (event.event === 'start') return `Asking ${label}...`;
  if (event.stage === 'send') return `Resume handed to ${label}. Waiting for it to read...`;
  if (event.stage === 'wait') return `${label} is reading... ${seconds}s`;
  if (event.stage === 'reply') return `${label} answered after ${seconds}s. Saving...`;
  return '';
}
