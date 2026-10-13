// What a tailoring plan changed, as things the person can take back one at a
// time, and their choices about it (the server's
// actions/resume-tailor-choices.js names the shape and checks it).
const SECTIONS = ['experience', 'projects', 'education', 'certifications', 'achievements'];

export const NO_CHOICES = { skills: [], projects: [], mine: {}, back: {} };

export const choicesOf = (result) => ({ ...NO_CHOICES, ...(result?.choices ?? {}) });

// Case, spacing and a closing full stop apart: a bullet kept as written is
// not a rewording, and is not listed as one.
const plain = (text) => String(text).toLowerCase().replace(/\s+/g, ' ').replace(/[.\s]+$/, '').trim();

const headingOf = (entry) => [entry.title || 'Untitled', entry.organisation].filter(Boolean).join(' at ');

// Every bullet the plan reworded that has the person's own beside it, then
// every bullet it left out, entry by entry in the resume's order.
//
//   { type: 'reworded', id, at, heading, yours, now }
//   { type: 'dropped',  id, at, heading, yours }
//
// `id` and `at` are the entry and the place in its `bullets` or `dropped`,
// which is how a choice names it.
export function tailorItems(sections) {
  return SECTIONS.flatMap((key) => (sections?.[key] ?? []).flatMap((entry) => {
    const heading = headingOf(entry);
    const reworded = (entry.bullets ?? [])
      .map((now, at) => ({ type: 'reworded', id: entry.id, at, heading, yours: (entry.was?.[at] ?? []).join(' '), now }))
      .filter((item) => item.yours && plain(item.yours) !== plain(item.now));
    const dropped = (entry.dropped ?? []).map((yours, at) => ({ type: 'dropped', id: entry.id, at, heading, yours }));
    return [...reworded, ...dropped];
  }));
}

// Own lists only, so an entry id named like an object property finds none.
const listOf = (map, id) => (map && Object.hasOwn(map, id) ? map[id] : []);

// Whether the person took this one back: their own words for a rewording,
// a left-out bullet printed after all.
export function takenBack(choices, item) {
  return listOf(item.type === 'reworded' ? choices.mine : choices.back, item.id).includes(item.at);
}

const without = (list, value) => list.filter((one) => one !== value);
const flip = (list, value, on) => (on ? [...without(list, value), value] : without(list, value));

export function withItem(choices, item, on) {
  const field = item.type === 'reworded' ? 'mine' : 'back';
  const next = flip(listOf(choices[field], item.id), item.at, on).sort((a, b) => a - b);
  return { ...choices, [field]: { ...choices[field], [item.id]: next } };
}

// `field` is 'skills' (a left-out skill put back) or 'projects' (a project
// flipped from what the plan did with it).
export const withListed = (choices, field, value, on) => ({ ...choices, [field]: flip(choices[field] ?? [], value, on) });

export function summary(items) {
  const reworded = items.filter((item) => item.type === 'reworded').length;
  const dropped = items.length - reworded;
  return [reworded && `${reworded} reworded`, dropped && `${dropped} left out`].filter(Boolean).join(', ');
}
