// Tiny fetch client. Every call sends the session cookie.
const base = { credentials: 'include', headers: { 'content-type': 'application/json' } };

async function req(url, opts = {}) {
  const res = await fetch(url, { ...base, ...opts });
  if (res.status === 401) {
    const err = new Error('unauthorized');
    err.status = 401;
    throw err;
  }
  if (!res.ok) throw new Error(`${opts.method || 'GET'} ${url} -> ${res.status}`);
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

export function logout() {
  return fetch('/auth/logout', { method: 'POST', credentials: 'include' });
}
