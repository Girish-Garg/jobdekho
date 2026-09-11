// Tiny fetch client. Every call sends the session cookie (see lib/request.js).
import { send, failure } from './lib/request.js';
import { NDJSON_TYPE, readNdjson } from './lib/ndjson.js';

async function req(url, opts) {
  const res = await send(url, opts);
  return res.status === 204 ? null : res.json();
}

export function getMe() {
  return req('/auth/me');
}

export function getPostings(params = {}) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
  const qs = q.toString();
  return req(`/api/postings${qs ? `?${qs}` : ''}`).then((d) => d.postings);
}

export function getSources() {
  return req('/api/sources').then((d) => d.sources);
}

export function setStatus(id, status) {
  return req(`/api/postings/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
}

export function getFilters() {
  return req('/api/filters');
}

export function putFilters(f) {
  return req('/api/filters', { method: 'PUT', body: JSON.stringify(f) });
}

export function getNotifications() {
  return req('/api/notifications');
}

export function putNotifications(p) {
  return req('/api/notifications', { method: 'PUT', body: JSON.stringify(p) });
}

export function getProfile() {
  return req('/api/profile');
}

export function putProfile(p) {
  return req('/api/profile', { method: 'PUT', body: JSON.stringify(p) });
}

export function deleteProfile() {
  return req('/api/profile', { method: 'DELETE' });
}

export function uploadResume(file) {
  const form = new FormData();
  form.append('file', file);
  return req('/api/profile/resume', { method: 'POST', body: form });
}

export function applyProfileFilter() {
  return req('/api/profile/apply-filter', { method: 'POST' });
}

export function getProviders({ refresh = false } = {}) {
  return req(`/api/ai/providers${refresh ? '?refresh=true' : ''}`).then((d) => d.providers);
}

// Asks for the stream (see lib/ndjson.js) so the twenty seconds a model takes
// show as progress rather than silence. The stream is always a 200, so a
// failure arrives as its last line; it rejects the way a failed plain call
// does, with the server's sentence as the message and `kind` attached.
export async function extractProfile({ onEvent } = {}) {
  const res = await send('/api/profile/extract', { method: 'POST', headers: { accept: NDJSON_TYPE } });
  // The 400 and 401 are plain JSON and have already thrown inside send(). A
  // plain 200 body is the same object the stream would have ended with.
  const streamed = (res.headers.get('content-type') || '').includes(NDJSON_TYPE);
  const body = streamed ? await readNdjson(res, onEvent) : await res.json();
  if (!body || body.error) throw failure(body, 'The connection dropped before the answer arrived. Try again.');
  return body;
}

export function logout() {
  return fetch('/auth/logout', { method: 'POST', credentials: 'include' });
}
