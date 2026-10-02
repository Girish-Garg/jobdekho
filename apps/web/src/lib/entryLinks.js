import { linkKind } from './linkKind.js';

// An entry's links as the editor shows them. An entry with the old single
// link and no list (a proposal from a resume, merged over a blank entry)
// reads the way the store reads it (packages/store/src/profile-links.js):
// as a one-link list, of the kind its host says.
export function linksOf(entry) {
  if (Array.isArray(entry?.links)) return entry.links;
  return entry?.link ? [{ kind: linkKind(entry.link), url: entry.link, label: '' }] : [];
}

// The entry with a new list, its old single field kept equal to the first
// address the way the store keeps it.
export function withLinks(entry, links) {
  return { ...entry, links, link: links.find((link) => link.url.trim())?.url.trim() ?? '' };
}

// The kind a row takes when its address changes: read from the new address,
// unless the person picked a kind the old address would not have given (a
// demo video kept on Drive, say), which stays theirs. A row added from a
// kind's own button counts as picked, since its empty address gives
// "other".
export function kindFor(link, url) {
  return link.kind === linkKind(link.url) ? linkKind(url) : link.kind;
}

export const blankLink = (kind = 'other') => ({ kind, url: '', label: '' });
