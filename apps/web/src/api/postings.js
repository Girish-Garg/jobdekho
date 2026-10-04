import { req, announced } from './request.js';

// An unset filter is left out of the query rather than sent empty.
function queryOf(params) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
  const qs = q.toString();
  return qs ? `?${qs}` : '';
}

// { postings, total, newToday }: one page, the whole match's size, and how
// many of it arrived in the last day (see the store's dashboard.js).
export function getPostingsPage(params = {}) {
  return announced(req(`/api/postings${queryOf(params)}`), 'Postings');
}

// The company menu's list, counted under the feed's own query (see
// lib/feedQuery.js). Not announced: the menu says so in place when it fails.
export function getCompanies(params = {}) {
  return req(`/api/companies${queryOf(params)}`).then((d) => d.companies);
}

export function getPostings(params = {}) {
  return getPostingsPage(params).then((d) => d.postings);
}

// One posting whole, with the full description the feed leaves out. Not
// announced: the pane already shows the snippet and says so in place when
// the rest does not arrive (see PostingDescription.jsx).
export function getPosting(id) {
  return req(`/api/postings/${encodeURIComponent(id)}`).then((d) => d.posting);
}

// A posting opened with no description: the server reads its page once,
// politely, and tags it again from the text. { posting, described }, the
// posting shaped as getPosting gives it. Not announced: the pane says in
// place why a description could not be fetched (see DescribeNote.jsx).
export function describePosting(id) {
  return req(`/api/postings/${encodeURIComponent(id)}/describe`, { method: 'POST' });
}

export function getSources() {
  return announced(req('/api/sources'), 'Sources').then((d) => d.sources);
}

// A status change is an optimistic click: the row flips before this
// resolves, and rolls back on failure (see usePostingsFeed.js). Without a
// notice that rollback reads as nothing happened, rather than as the save
// that did not save.
export function setStatus(id, status) {
  return announced(req(`/api/postings/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }), 'Status change');
}

export function getFilters() {
  return announced(req('/api/filters'), 'Saved filters');
}

export function putFilters(f) {
  return req('/api/filters', { method: 'PUT', body: JSON.stringify(f) });
}
