import { useSyncExternalStore } from 'react';

// Questions for the person, asked above a chat's box the way Claude Code
// asks: a few options to press, one question at a time (see
// components/QuestionDock.jsx). Anything in the app can ask, in any chat,
// and wait for the answer:
//
//   const [picks] = await askIn(chatId, { title, step, questions })
//
// Each question is { header, question, detail?, options: [{ label,
// description?, value? }], multiSelect?, defaults?, submitLabel?, skipLabel? }
// and the answer is one list of picked values per question (an option's
// value, else its label). A chat holds one ask at a time; a new one, or the
// person pressing Stop, ends the one before with AskStopped. The questions
// a chat's AI asks back come with its answer instead (see chatQuestions.js).
export class AskStopped extends Error {
  constructor() {
    super('The person stopped answering.');
    this.name = 'AskStopped';
  }
}

let asks = {};
let nextId = 0;
const listeners = new Set();

// Own entries only, so a chat id named like an object property finds none.
const own = (id) => (id && Object.hasOwn(asks, id) ? asks[id] : null);

function set(next) {
  asks = next;
  listeners.forEach((listener) => listener());
}

function take(chatId) {
  const ask = own(chatId);
  if (ask) set(Object.fromEntries(Object.entries(asks).filter(([id]) => id !== chatId)));
  return ask;
}

export function askIn(chatId, { title = '', step = null, questions }) {
  take(chatId)?.reject(new AskStopped());
  return new Promise((resolve, reject) => {
    nextId += 1;
    set({ ...asks, [chatId]: { id: nextId, title, step, questions, resolve, reject } });
  });
}

// The person's picks for the ask on screen; an ask that has since been
// replaced takes none.
export function answerAsk(chatId, id, picks) {
  if (own(chatId)?.id === id) take(chatId).resolve(picks);
}

export function stopAsking(chatId) {
  take(chatId)?.reject(new AskStopped());
}

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function useAsk(chatId) {
  return useSyncExternalStore(subscribe, () => own(chatId));
}

// The ask waiting in a chat, outside React.
export const currentAsk = (chatId) => own(chatId);

// Tests start each case with nothing asked.
export function resetQuestionDock() {
  asks = {};
}
