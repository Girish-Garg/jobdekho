import { useEffect, useSyncExternalStore } from 'react';

// The chat's state for the life of the page, not of the panel. It used to
// live in the panel's own component, so closing the panel while an answer
// was on its way threw the question, the progress and the answer away,
// though the CLI kept working and the server saved the turn; opening it
// again showed nothing until the page was reloaded. Held here, the answer
// lands whether the panel is open or not, and a panel opened mid-answer
// shows the question with its clock still running.
//
//   turns    the saved conversation, loaded once (see chatLoad.js)
//   call     the AI call in flight, or null (see chatCall.js):
//            { what, words, provider, label, events, startedAt, remote }
//   error    the last failure, for AiError
//   unseen   an answer landed while no panel was open, for the Ask AI dot
const EMPTY = { turns: [], loaded: false, call: null, error: null, unseen: false };

let state = EMPTY;
let panels = 0;
// Bumped by a reset, so a load or a poll begun before it cannot write into
// the session that replaced it (see chatLoad.js).
let generation = 0;
const listeners = new Set();

export const chatSession = {
  get: () => state,
  set(patch) {
    state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
    listeners.forEach((listener) => listener());
  },
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  // Whether a panel is on screen to show an answer as it lands.
  watched: () => panels > 0,
  generation: () => generation,
};

export function useChatSession() {
  return useSyncExternalStore(chatSession.subscribe, chatSession.get);
}

// Mounted by the panel: while one is open nothing is unseen.
export function useChatWatcher() {
  useEffect(() => {
    panels += 1;
    chatSession.set({ unseen: false });
    return () => { panels -= 1; };
  }, []);
}

export function addTurn(turn) {
  chatSession.set((s) => ({ turns: [...s.turns, turn], unseen: s.unseen || !chatSession.watched() }));
}

// Tests start each case from an empty session.
export function resetChatSession() {
  state = EMPTY;
  panels = 0;
  generation += 1;
}
