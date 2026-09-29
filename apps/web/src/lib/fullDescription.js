import { getPosting } from '../api.js';

// The full description of each posting opened this session, so reopening one
// paints it at once instead of flashing the snippet again. Bounded because a
// long triage session can open hundreds, and oldest-first is enough: the one
// a person comes back to is almost always one of the last few.
const LIMIT = 200;
const texts = new Map();
const pending = new Map();

function remember(id, text) {
  texts.delete(id);
  texts.set(id, text);
  if (texts.size > LIMIT) texts.delete(texts.keys().next().value);
}

// undefined means "not fetched yet"; '' means fetched, and the posting has
// no full text stored (a board that only ever gave a preview).
export function cachedDescription(id) {
  return texts.get(id);
}

// One request per posting however many times it is asked for while in
// flight. A failure is not cached, so opening the posting again retries.
export function loadDescription(id) {
  if (texts.has(id)) return Promise.resolve(texts.get(id));
  if (!pending.has(id)) {
    const request = Promise.resolve()
      .then(() => getPosting(id))
      .then((posting) => {
        const text = posting?.descriptionText || '';
        remember(id, text);
        return text;
      })
      .finally(() => pending.delete(id));
    pending.set(id, request);
  }
  return pending.get(id);
}

export function forgetDescriptions() {
  texts.clear();
  pending.clear();
}
