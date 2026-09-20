import { req } from './request.js';
import { streamedPost } from '../lib/aiCall.js';

export function getProviders({ refresh = false } = {}) {
  return req(`/api/ai/providers${refresh ? '?refresh=true' : ''}`).then((d) => d.providers);
}

export function getProviderPreference() {
  return req('/api/ai/provider');
}

export function putProviderPreference(pref) {
  return req('/api/ai/provider', { method: 'PUT', body: JSON.stringify(pref) });
}

// These stream their progress (see lib/aiCall.js). Each resolves with the
// saved outcome: the profile for the extraction, and for a posting action the
// record { kind, postingId, provider, createdAt, result, versions }.
export function extractProfile(opts) {
  return streamedPost('/api/profile/extract', opts);
}

export function runPostingAction(id, kind, opts) {
  return streamedPost(`/api/postings/${id}/ai/${kind}`, opts);
}

export function getPostingAiResults(id) {
  return req(`/api/postings/${id}/ai`).then((d) => d.results);
}
