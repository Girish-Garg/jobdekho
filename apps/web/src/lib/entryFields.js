// The small fields that share the row under an entry's title, in the order
// they sit; 'ongoing' is the "Still going" switch. A section names its own
// (see profileSections.js), and these are the dated sections' ones.
export const DATED = ['location', 'startDate', 'endDate', 'ongoing'];

// A field the section leaves out still shows on an entry that already holds
// something in it, so nothing typed before is ever hidden from the person
// while the resume goes on printing it.
export function smallFields(meta, entry) {
  const own = meta.small ?? DATED;
  return DATED.filter((key) => own.includes(key) || (key !== 'ongoing' && String(entry[key] ?? '').trim()));
}

// An end date that says the thing is still going on. An empty one has
// always read as "Present" on this page, so it counts too.
const ONGOING = /^(present|current|now|ongoing|till date|to date)$/i;
export const isOngoing = (endDate) => !String(endDate ?? '').trim() || ONGOING.test(String(endDate).trim());

// When, for a closed entry's subline: "Jan 2025 to now", "Jan 2023 to Mar
// 2024", or whichever date there is. Where the section has no switch (a
// certification, an achievement), an empty end is no end at all.
export function datesText(entry, ongoing) {
  const start = String(entry.startDate ?? '').trim();
  const end = String(entry.endDate ?? '').trim();
  if (ongoing && isOngoing(end)) return start ? `${start} to now` : '';
  if (start && end) return `${start} to ${end}`;
  return start || end;
}
