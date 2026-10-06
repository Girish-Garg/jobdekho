import { getPosting, describePosting } from '../api.js';
import { announceDescribed } from './postingDescribedSignal.js';

// Each posting opened this session, whole: the full text, its sections and
// facts, and every tag with its evidence, as GET /api/postings/:id gives
// it. Reopening one paints it at once instead of flashing the snippet
// again. Bounded because a long triage session can open hundreds, and
// oldest-first is enough: the one a person comes back to is almost always
// one of the last few.
const LIMIT = 200;
const details = new Map();
const pending = new Map();
const describing = new Map();
const refusals = new Map();

function remember(id, posting) {
  details.delete(id);
  details.set(id, posting);
  if (details.size > LIMIT) details.delete(details.keys().next().value);
}

// undefined means "not fetched yet".
export const cachedDetail = (id) => details.get(id);

// A board's one-line teaser (the server's `descriptionPartial`, see core's
// teaser.js) is not the description: the pane asks for the whole of it.
export const hasText = (posting) => Boolean(String(posting?.descriptionText || '').trim()) && !posting?.descriptionPartial;

// One request per posting however many times it is asked for while in
// flight. A failure is not kept, so opening the posting again retries.
export function loadDetail(id) {
  if (details.has(id)) return Promise.resolve(details.get(id));
  if (!pending.has(id)) {
    const request = Promise.resolve()
      .then(() => getPosting(id))
      .then((posting) => {
        remember(id, posting);
        return posting;
      })
      .finally(() => pending.delete(id));
    pending.set(id, request);
  }
  return pending.get(id);
}

// The statuses whose words the server wrote to be shown (see the server's
// describe route); anything else reads as the plain line DescribeNote.jsx
// falls back to.
const SAID = new Set([403, 409, 429, 502]);

// Why this session's fetch of the description failed, if it did:
// { status, message }.
export const describeRefusal = (id) => refusals.get(id) ?? null;

// Fetches a description the posting does not have, once. The described
// posting replaces the cached one, and the feed hears of it so the row takes
// its new tags. A refusal is kept for the session, so reopening the posting
// never asks again in a loop; the one exception is LinkedIn switched off
// (403), which a visit to Settings changes.
export function describeDetail(id) {
  if (!describing.has(id)) {
    const request = Promise.resolve()
      .then(() => describePosting(id))
      .then(({ posting }) => {
        remember(id, posting);
        announceDescribed(posting);
        return posting;
      }, (err) => {
        const refusal = { status: err?.status ?? null, message: SAID.has(err?.status) ? err.message : '' };
        if (refusal.status !== 403) refusals.set(id, refusal);
        throw refusal;
      })
      .finally(() => describing.delete(id));
    describing.set(id, request);
  }
  return describing.get(id);
}

export function forgetDetails() {
  details.clear();
  pending.clear();
  describing.clear();
  refusals.clear();
}
