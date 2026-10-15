import { req } from './request.js';

// The Tracker (see the server's api/tracker.js). Entries come back as the
// server keeps them: { id, company, role, postingId, contact, stage,
// stageAt, events, createdAt }, newest activity first.
export function getTracker() {
  return req('/api/tracker');
}

export function addTrackerEntry(fields) {
  return req('/api/tracker', { method: 'POST', body: JSON.stringify(fields) });
}

export function updateTrackerEntry(id, patch) {
  return req(`/api/tracker/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) });
}

export function removeTrackerEntry(id) {
  return req(`/api/tracker/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
