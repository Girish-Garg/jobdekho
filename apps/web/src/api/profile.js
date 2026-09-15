import { req } from './request.js';

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
