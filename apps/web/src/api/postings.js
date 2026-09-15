import { req } from './request.js';

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
