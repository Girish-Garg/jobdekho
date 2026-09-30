import { req, announced } from './request.js';

// Fetching new postings from the app (see the server's api/scrape.js). The
// state is { running, startedAt, finishedAt, done, total, current?, result?,
// error?, lastRun, linkedin }: how far a run in flight has got, how the last
// run this server did ended (`result` { fresh, total, tooOld, removed,
// failed, skipped }, or `error`, a sentence), `lastRun` { at, fresh,
// sources, failed, skipped }, the last one completed on disk, whoever ran
// it, and `linkedin` { lastSweepAt, pausedUntil, nextAfter }, where the
// guard on reading LinkedIn stands. `skipped` is [{ name, note }]: a source
// a run chose not to read, and why. Not announced: it is polled, and a
// server briefly out of reach is simply asked again.
export function getScrapeState() {
  return req('/api/scrape');
}

// Answers at once with the state of the run it started. A run already going
// is a 409 whose sentence says so.
export function startScrape() {
  return req('/api/scrape', { method: 'POST' });
}

// { autoRefresh, linkedin }: whether the server refreshes on its own once a
// day, and whether a refresh reads LinkedIn at all.
export function getScrapeSettings() {
  return announced(req('/api/scrape/settings'), 'Refresh setting');
}

// Either switch alone, or both: each is saved as it is flipped.
export function putScrapeSettings(settings) {
  return req('/api/scrape/settings', { method: 'PUT', body: JSON.stringify(settings) });
}
