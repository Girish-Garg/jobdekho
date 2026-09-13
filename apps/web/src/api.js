// Tiny fetch client. Every call sends the session cookie (see lib/request.js).
import { send } from './lib/request.js';
import { streamedPost } from './lib/aiCall.js';

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

// The AI calls stream their progress (see lib/aiCall.js). Each resolves with
// the saved outcome: the profile for the extraction, and for a posting action
// the record { kind, postingId, provider, createdAt, result }.
export function extractProfile(opts) {
  return streamedPost('/api/profile/extract', opts);
}

export function runPostingAction(id, kind, opts) {
  return streamedPost(`/api/postings/${id}/ai/${kind}`, opts);
}

export function getPostingAiResults(id) {
  return req(`/api/postings/${id}/ai`).then((d) => d.results);
}

export function logout() {
  return fetch('/auth/logout', { method: 'POST', credentials: 'include' });
}
