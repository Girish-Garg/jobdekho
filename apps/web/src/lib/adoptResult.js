import { withDefaults } from './emptyProfile.js';

const FIELDS = ['name', 'headline', 'email', 'phone', 'location'];
const LINK_KEYS = ['github', 'linkedin', 'portfolio'];

// The server fills a basics field from the resume only where its saved copy
// was empty, and names each one it filled ("email", "links.github"). The
// saved copy takes those as the server wrote them; the form takes each only
// where it is still blank, since the person may have typed into that very
// field without saving yet, and what they typed wins.
function foldFilled(basics, server, filled, keepTyped) {
  const next = { ...basics, links: { ...basics.links } };
  for (const path of filled ?? []) {
    const [key, sub] = path.split('.');
    const known = sub ? key === 'links' && LINK_KEYS.includes(sub) : FIELDS.includes(key);
    const target = sub ? next.links : next;
    const field = sub ?? key;
    const value = sub ? server?.links?.[sub] : server?.[key];
    if (known && value && !(keepTyped && target[field])) target[field] = value;
  }
  return next;
}

// Upload and fill-in both save on the server, but neither one writes a
// structured section there beyond filling empty basics (see
// apps/server/src/api/profile.js) - so only the fields they do change (the
// flat ranking fields, resumeName and those basics) are folded into local
// state. Replacing the whole profile with the server's answer instead would
// revert any section the person had edited locally but not yet saved back to
// its last-saved copy, which is exactly the silent overwrite the structured
// record is not supposed to allow. The proposals ride along separately so
// they can be reviewed before anything is written.
export function adoptResult(previous, result, { keepTyped = false } = {}) {
  const {
    proposed, filledBasics, experience, projects, education, certifications, achievements, skillGroups, basics, ...flat
  } = result;
  const base = withDefaults(previous);
  return { ...base, ...flat, basics: foldFilled(base.basics, basics, filledBasics, keepTyped) };
}
