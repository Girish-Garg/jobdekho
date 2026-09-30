import { req } from './request.js';

// Apply assist's REST side (the server's api/apply-sessions.js and
// api/apply-copy.js). The live view itself travels over the session's socket
// (lib/applySocket.js); these open and close it and carry the presses.
const session = (id) => `/api/apply/sessions/${encodeURIComponent(id)}`;
const post = (url, body) => req(url, { method: 'POST', body: JSON.stringify(body ?? {}) });

// { browser: { name } | null, canPopOut }
export function getApplyBrowser() {
  return req('/api/apply/browser');
}

// { session, token }. A second open answers 409 with the one already open.
export function openApply(postingId) {
  return post('/api/apply/sessions', { postingId });
}

export function currentApply() {
  return req('/api/apply/sessions/current');
}

export function closeApply(id) {
  return req(session(id), { method: 'DELETE' });
}

// "Fill this page": always a press of the person's.
export function fillApply(id) {
  return post(`${session(id)}/fill`);
}

export function takeOverApply(id) {
  return post(`${session(id)}/takeover`);
}

export function showApplyWindow(id, shown) {
  return post(`${session(id)}/window`, { shown });
}

// { rows: [{ label, value }], coverLetter }, with no browser needed at all.
export function getApplyCopy(postingId) {
  return req(`/api/apply/copy/${encodeURIComponent(postingId)}`);
}

export const applyFileUrl = (id, kind) => `${session(id)}/files/${kind}`;

export const applySocketUrl = (id, location = window.location) =>
  `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}${session(id)}/socket`;
