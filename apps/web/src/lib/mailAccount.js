import { useEffect, useSyncExternalStore } from 'react';
import { getMail } from '../api.js';

// Whether Gmail is connected, read once and shared by every mail card, and
// told when Settings connects or disconnects (see useMailAccount.js), so a
// card already on screen offers Send the moment Gmail is connected.
let asked = null;
let known;
const listeners = new Set();

export function noteMailAccount(view) {
  known = view ?? null;
  asked = Promise.resolve(known);
  listeners.forEach((listener) => listener());
}

// Resolves the connection as the server describes it, or null unread.
export function mailAccount() {
  asked ??= getMail().catch(() => null).then((view) => {
    noteMailAccount(view);
    return view;
  });
  return asked;
}

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

// undefined while it is being read, then true or false.
export function useMailConnected() {
  const view = useSyncExternalStore(subscribe, () => known);
  useEffect(() => { mailAccount(); }, []);
  return view === undefined ? undefined : Boolean(view?.connected);
}

// Tests start each case with nothing read.
export function resetMailAccount() {
  asked = null;
  known = undefined;
}
