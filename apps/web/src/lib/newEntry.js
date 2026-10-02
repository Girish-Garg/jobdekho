// crypto.randomUUID is available in every evergreen browser (and in jsdom
// under test). A fresh id here is what lets a brand new entry get a stable
// React key and survive a reorder before it has ever touched the server,
// which only mints an id for an entry that arrives without one.
const uid = () => crypto.randomUUID();

// No links here, not even an empty list: the first link added writes the
// list (see entryLinks.js), and until then the store reads the old single
// `link`, the one field a proposal from a resume still carries when it is
// merged over a blank entry (see mergeProposals.js). An empty list would
// win over that link and drop it on save.
export function makeEntry() {
  return {
    id: uid(), title: '', organisation: '', location: '', startDate: '', endDate: '',
    bullets: [], tech: [], pinned: false, weight: 0,
  };
}

// The same entry once more, under an id of its own, to start a similar one
// from (a second internship at the same company, say).
export const copyEntry = (entry) => ({ ...entry, id: uid() });

export function makeGroup() {
  return { id: uid(), name: '', items: [] };
}
