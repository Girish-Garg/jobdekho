import { req, announced } from './request.js';

// Fetching new postings from the app (see the server's api/scrape.js). The
// state is { running, startedAt, finishedAt, done, total, current?, result?,
// error?, lastRun }: how far a run in flight has got, how the last run this
// server did ended (`result` { fresh, total, tooOld, removed, failed }, or
// `error`, a sentence), and `lastRun` { at, fresh, sources, failed }, the
// last one completed on disk, whoever ran it. Not announced: it is polled,
// and a server briefly out of reach is simply asked again.
export function getScrapeState() {
  return req('/api/scrape');
}

// Answers at once with the state of the run it started. A run already going
// is a 409 whose sentence says so.
export function startScrape() {
  return req('/api/scrape', { method: 'POST' });
}

// { autoRefresh }: whether the server refreshes on its own once a day.
export function getScrapeSettings() {
  return announced(req('/api/scrape/settings'), 'Refresh setting');
}

export function putScrapeSettings(settings) {
  return req('/api/scrape/settings', { method: 'PUT', body: JSON.stringify(settings) });
}
