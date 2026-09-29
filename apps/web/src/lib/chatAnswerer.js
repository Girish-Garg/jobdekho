import { CHAT_POLICY } from './chatActionKinds.js';

// The CLI that will answer the next question, for the panel to name it. The
// same choice the server makes (apps/server/src/ai/select.js): the person's
// preferred CLI when it is installed, runs and takes a plain call, otherwise
// the first that does. `preferredId` is 'auto' or null when there is none.
export function chatAnswerer(providers, preferredId) {
  if (!Array.isArray(providers)) return null;
  const usable = providers.filter((p) => p.present && p.runs && p.policies?.includes(CHAT_POLICY));
  return usable.find((p) => p.id === preferredId) ?? usable[0] ?? null;
}

// What an answer is signed with: the CLI that wrote it, by its own name.
export function providerLabel(providers, id) {
  if (!id) return 'AI';
  return (Array.isArray(providers) && providers.find((p) => p.id === id)?.label) || 'AI';
}
