import { req, announced } from './request.js';
import { streamedPost } from '../lib/aiCall.js';

// What a failed run of each kind is called in the notice that reports it,
// so the toast names the action rather than a route. Falls back to the raw
// kind for one this list has not caught up with yet.
const ACTION_LABEL = {
  'cover-letter': 'Cover letter',
  'fake-check': 'Is this job real?',
  'resume-tailor': 'Resume tailor',
};

export function getProviders({ refresh = false } = {}) {
  return announced(req(`/api/ai/providers${refresh ? '?refresh=true' : ''}`), 'AI CLIs').then((d) => d.providers);
}

export function getProviderPreference() {
  return announced(req('/api/ai/provider'), 'AI CLI preference');
}

export function putProviderPreference(pref) {
  return req('/api/ai/provider', { method: 'PUT', body: JSON.stringify(pref) });
}

// These stream their progress (see lib/aiCall.js), which also announces a
// failure by `label` - the button that started it already shows its own
// inline error, so the notice is only for the moment the person is not
// watching that panel. Each resolves with the saved outcome: the profile for
// the extraction, and for a posting action the record
// { kind, postingId, provider, createdAt, result, versions }.
export function extractProfile(opts) {
  return streamedPost('/api/profile/extract', { ...opts, label: 'Fill in from resume' });
}

export function runPostingAction(id, kind, opts) {
  return streamedPost(`/api/postings/${id}/ai/${kind}`, { ...opts, label: ACTION_LABEL[kind] || kind });
}

export function getPostingAiResults(id) {
  return announced(req(`/api/postings/${id}/ai`), 'Saved AI results').then((d) => d.results);
}
