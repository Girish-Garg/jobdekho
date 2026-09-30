import { req, announced } from './request.js';

// The person's own Adzuna key (see the server's api/adzuna.js). The key is
// only ever sent, never read back: every answer is { configured, from,
// appId, keyEnd, lastRun }, `from` being 'settings' or 'environment',
// `keyEnd` the key's last four characters, and `lastRun` { at, ok, count,
// error } for how Adzuna did in the last refresh, or null.
export function getAdzunaKey() {
  return announced(req('/api/adzuna'), 'Adzuna key');
}

export function saveAdzunaKey({ appId, appKey }) {
  return req('/api/adzuna', { method: 'PUT', body: JSON.stringify({ appId, appKey }) });
}

// Two empty fields are how the server is asked to forget the saved pair.
export function removeAdzunaKey() {
  return req('/api/adzuna', { method: 'PUT', body: JSON.stringify({ appId: '', appKey: '' }) });
}

// One small search against Adzuna: the typed pair, or with the key left
// empty the one a refresh would use. Answers { ok, problem?, message }.
export function checkAdzunaKey({ appId = '', appKey = '' } = {}) {
  return req('/api/adzuna/check', { method: 'POST', body: JSON.stringify({ appId, appKey }) });
}
