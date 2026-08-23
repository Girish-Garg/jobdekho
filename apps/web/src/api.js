// Tiny fetch client. Every call sends the session cookie.

async function req(url, opts = {}) {
  // The JSON content-type only goes on calls that actually send JSON: a
  // FormData body needs the browser to write the multipart boundary into the
  // header itself, and a bodyless POST that claims to carry JSON is a 400 at
  // the server's parser.
  const headers = typeof opts.body === 'string' ? { 'content-type': 'application/json' } : undefined;
  const res = await fetch(url, { credentials: 'include', headers, ...opts });
  if (res.status === 401) {
    const err = new Error('unauthorized');
    err.status = 401;
    throw err;
  }
  if (!res.ok) {
    // The resume 422s and the apply-filter 400 carry messages written to be
    // shown to the user verbatim, so prefer the server's words to a status line.
    const body = await res.json().catch(() => null);
    const err = new Error(body?.error || `${opts.method || 'GET'} ${url} -> ${res.status}`);
    err.status = res.status;
    throw err;
  }
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

export function logout() {
  return fetch('/auth/logout', { method: 'POST', credentials: 'include' });
}
