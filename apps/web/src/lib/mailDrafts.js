import { useSyncExternalStore } from 'react';
import { applyProposal, discardProposal, editMailDraft } from '../api.js';
import { trackerChanged } from './trackerSignal.js';

// What has become of each drafted mail since the page opened, outside any
// card: a card scrolled away or a chat switched mid-countdown must neither
// lose the countdown nor send twice. A card draws its saved proposal with
// this on top (see MailCard.jsx).
//
//   { phase, endsAt?, draft?, status?, sentAt?, from?, error? }
//
// `phase` is 'asking' (the resume question is above the box), 'holding'
// (counting down to send), 'sending', 'stopped' (waits for Send) or 'done'.
// Only one mail per chat counts down: a newer one stops the one before.
export const HOLD_MS = 20000;

let states = {};
const holds = new Map();
const listeners = new Set();

function patch(id, next) {
  states = { ...states, [id]: { ...(states[id] ?? {}), ...next } };
  listeners.forEach((listener) => listener());
}

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useMailState = (id) => useSyncExternalStore(subscribe, () => states[id] ?? null);
export const mailState = (id) => states[id] ?? null;
export const setMailPhase = (id, phase, extra = {}) => patch(id, { phase, ...extra });

function clearHold(id) {
  const hold = holds.get(id);
  if (!hold) return false;
  clearTimeout(hold.timer);
  holds.delete(id);
  return true;
}

export async function sendMail(id) {
  clearHold(id);
  if (states[id]?.phase === 'sending' || states[id]?.status === 'applied') return;
  patch(id, { phase: 'sending', error: null });
  try {
    const { proposal } = await applyProposal(id);
    patch(id, { phase: 'done', status: 'applied', sentAt: proposal?.sentAt ?? new Date().toISOString(), from: proposal?.from ?? null });
    trackerChanged();
  } catch (err) {
    patch(id, { phase: 'stopped', error: err.message });
  }
}

export function holdMail(id, group, ms = HOLD_MS) {
  for (const [other, hold] of holds) if (hold.group === group && other !== id && clearHold(other)) patch(other, { phase: 'stopped' });
  clearHold(id);
  holds.set(id, { group, timer: setTimeout(() => sendMail(id), ms) });
  patch(id, { phase: 'holding', endsAt: Date.now() + ms, error: null });
}

export function stopMail(id) {
  clearHold(id);
  patch(id, { phase: 'stopped' });
}

// The person's own change, saved before anything else happens to the mail.
export async function saveMail(id, changes) {
  const { proposal } = await editMailDraft(id, changes);
  const { to, subject, body, attach, attachName, mailedBefore } = proposal;
  patch(id, { draft: { to, subject, body, attach, attachName, mailedBefore } });
  return proposal;
}

export async function discardMail(id) {
  stopMail(id);
  try {
    await discardProposal(id);
    patch(id, { phase: 'done', status: 'discarded' });
  } catch (err) {
    patch(id, { error: err.message });
  }
}

// Tests start each case with no mail in flight.
export function resetMailDrafts() {
  holds.forEach((hold) => clearTimeout(hold.timer));
  holds.clear();
  states = {};
}
