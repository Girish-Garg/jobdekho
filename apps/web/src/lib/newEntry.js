// crypto.randomUUID is available in every evergreen browser (and in jsdom
// under test). A fresh id here is what lets a brand new entry get a stable
// React key and survive a reorder before it has ever touched the server,
// which only mints an id for an entry that arrives without one.
const uid = () => crypto.randomUUID();

export function makeEntry() {
  return {
    id: uid(), title: '', organisation: '', location: '', startDate: '', endDate: '',
    bullets: [], tech: [], link: '', pinned: false, weight: 0,
  };
}

export function makeGroup() {
  return { id: uid(), name: '', items: [] };
}
